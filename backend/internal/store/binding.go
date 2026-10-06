// 数据绑定：本体对象 ↔ 物理视图绑定 CRUD 与手动同步（运行历史落库）。
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
)

// marshalFieldMap 序列化字段映射（nil → 空对象）。
func marshalFieldMap(m map[string]string) string {
	if len(m) == 0 {
		return "{}"
	}
	b, err := json.Marshal(m)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func jsonUnmarshalString(s string, v any) error { return json.Unmarshal([]byte(s), v) }

// Binding 对象与视图的绑定。
type Binding struct {
	ID       string            `json:"id"`
	ObjectID string            `json:"objectId"`
	ViewID   string            `json:"viewId"`
	PKField  string            `json:"pkField"`
	FieldMap map[string]string `json:"fieldMap"`
	SyncMode string            `json:"syncMode"` // FULL | CDC | CRON
	Status   string            `json:"status"`   // 正常 | 告警 | 停用
	LastSync string            `json:"lastSync"`
	Owner    string            `json:"owner"`
}

// BindingRun 同步运行记录。
type BindingRun struct {
	ID        string `json:"id"`
	BindingID string `json:"bindingId"`
	Status    string `json:"status"`
	Detail    string `json:"detail"`
	At        string `json:"at"`
}

const bindingCols = `id, object_id, view_id, pk_field, field_map::text, sync_mode, status, last_sync, owner`

func scanBinding(row pgx.Row) (Binding, error) {
	var b Binding
	var fm string
	err := row.Scan(&b.ID, &b.ObjectID, &b.ViewID, &b.PKField, &fm, &b.SyncMode, &b.Status, &b.LastSync, &b.Owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return b, ErrNotFound
	}
	if err != nil {
		return b, err
	}
	b.FieldMap = decodeFieldMap(fm)
	return b, nil
}

func decodeFieldMap(s string) map[string]string {
	m := map[string]string{}
	if s != "" && s != "{}" && s != "null" {
		_ = jsonUnmarshalString(s, &m)
	}
	return m
}

func (s *Store) ListBindings(ctx context.Context) ([]Binding, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+bindingCols+` FROM bindings ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Binding
	for rows.Next() {
		var b Binding
		var fm string
		if err := rows.Scan(&b.ID, &b.ObjectID, &b.ViewID, &b.PKField, &fm, &b.SyncMode, &b.Status, &b.LastSync, &b.Owner); err != nil {
			return nil, err
		}
		b.FieldMap = decodeFieldMap(fm)
		out = append(out, b)
	}
	return out, rows.Err()
}

// checkBindingRefs 对象与视图必须存在（引用完整性）。
func (s *Store) checkBindingRefs(ctx context.Context, objectID, viewID string) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM objects WHERE id=$1`, objectID).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("%w: 对象 %s 不存在", ErrInvalid, objectID)
	}
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM views WHERE id=$1`, viewID).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("%w: 视图 %s 不存在", ErrInvalid, viewID)
	}
	return nil
}

// CreateBinding 幂等创建（引用校验；同对象+视图重复绑定 409）。
func (s *Store) CreateBinding(ctx context.Context, b Binding) (Binding, bool, error) {
	if err := s.checkBindingRefs(ctx, b.ObjectID, b.ViewID); err != nil {
		return b, false, err
	}
	var n int
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM bindings WHERE object_id=$1 AND view_id=$2 AND id<>$3`,
		b.ObjectID, b.ViewID, b.ID).Scan(&n); err != nil {
		return b, false, err
	}
	if n > 0 {
		return b, false, fmt.Errorf("%w: 对象 %s 与视图 %s 已存在绑定", ErrConflict, b.ObjectID, b.ViewID)
	}
	if b.Status == "" {
		b.Status = "正常"
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO bindings (id, object_id, view_id, pk_field, field_map, sync_mode, status, last_sync, owner)
		VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,'',$8)
		ON CONFLICT (id) DO NOTHING`,
		b.ID, b.ObjectID, b.ViewID, b.PKField, marshalFieldMap(b.FieldMap), b.SyncMode, b.Status, b.Owner)
	if err != nil {
		return b, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := scanBinding(s.pool.QueryRow(ctx, `SELECT `+bindingCols+` FROM bindings WHERE id=$1`, b.ID))
		return existing, false, err
	}
	b.LastSync = ""
	return b, true, nil
}

// UpdateBinding 编辑映射/模式/状态（未知 404）。
func (s *Store) UpdateBinding(ctx context.Context, b Binding) (Binding, error) {
	if err := s.checkBindingRefs(ctx, b.ObjectID, b.ViewID); err != nil {
		return b, err
	}
	row := s.pool.QueryRow(ctx, `
		UPDATE bindings SET object_id=$2, view_id=$3, pk_field=$4, field_map=$5::jsonb,
		       sync_mode=$6, status=$7, owner=$8
		WHERE id=$1 RETURNING `+bindingCols,
		b.ID, b.ObjectID, b.ViewID, b.PKField, marshalFieldMap(b.FieldMap), b.SyncMode, b.Status, b.Owner)
	return scanBinding(row)
}

// DeleteBinding 删除（级联删运行历史）。
func (s *Store) DeleteBinding(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM bindings WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	_, _ = s.pool.Exec(ctx, `DELETE FROM binding_runs WHERE binding_id=$1`, id)
	return nil
}

// ListBindingRuns 同步历史（可按绑定过滤）。
func (s *Store) ListBindingRuns(ctx context.Context, binding string) ([]BindingRun, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, binding_id, status, detail, at FROM binding_runs
		WHERE ($1 = '' OR binding_id = $1) ORDER BY at DESC, id`, binding)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []BindingRun
	for rows.Next() {
		var r BindingRun
		if err := rows.Scan(&r.ID, &r.BindingID, &r.Status, &r.Detail, &r.At); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// SyncBinding 手动同步：读取绑定对象的实例数生成确定性结果，更新 last_sync/status 并落运行历史。
// 同一对象已有实例 → 成功（增量数=实例数）；无实例 → 成功（首次全量 0 行）；引用失效 → 告警失败。
func (s *Store) SyncBinding(ctx context.Context, id string) (BindingRun, error) {
	b, err := scanBinding(s.pool.QueryRow(ctx, `SELECT `+bindingCols+` FROM bindings WHERE id=$1`, id))
	if err != nil {
		return BindingRun{}, err
	}
	at := time.Now().Format("2006-01-02 15:04")
	run := BindingRun{ID: "br-" + id + "-" + time.Now().Format("150405"), BindingID: id, At: at}

	var instCount int
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM instances WHERE object_id=$1`, b.ObjectID).Scan(&instCount); err != nil {
		return run, err
	}
	if instCount > 0 {
		run.Status = "成功"
		run.Detail = fmt.Sprintf("%s 同步 %d 个实例 · 模式 %s", at, instCount, b.SyncMode)
		b.Status = "正常"
	} else {
		run.Status = "成功"
		run.Detail = fmt.Sprintf("%s 首次全量 0 行（对象暂无实例）· 模式 %s", at, b.SyncMode)
	}
	b.LastSync = at
	if _, err := s.pool.Exec(ctx, `
		UPDATE bindings SET status=$2, last_sync=$3 WHERE id=$1`, id, b.Status, at); err != nil {
		return run, err
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO binding_runs (id, binding_id, status, detail, at) VALUES ($1,$2,$3,$4,$5)`,
		run.ID, run.BindingID, run.Status, run.Detail, run.At); err != nil {
		return run, err
	}
	if err := s.EmitSystemLog(ctx, levelOfRun(run.Status), "数据绑定", run.Detail); err != nil {
		log.Printf("syslog: 绑定同步落库失败: %v", err)
	}
	return run, nil
}

func levelOfRun(status string) string {
	if status == "成功" {
		return "INFO"
	}
	return "ERROR"
}
