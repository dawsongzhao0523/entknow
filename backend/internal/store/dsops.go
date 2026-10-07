// 数据资产运营写路径：数据源注册/编辑、逻辑视图管理、加工流水线任务与运行。
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// PipelineTask 加工任务；PipelineRun 一次执行记录。
type PipelineTask struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Source   string `json:"source,omitempty"`
	Target   string `json:"target,omitempty"`
	Schedule string `json:"schedule,omitempty"`
	Status   string `json:"status"`
	LastRun  string `json:"lastRun,omitempty"`
}

type PipelineRun struct {
	ID     string `json:"id"`
	TaskID string `json:"taskId"`
	Status string `json:"status"`
	Detail string `json:"detail"`
	At     string `json:"at"`
}

var validSets = map[string]map[string]bool{
	"dsMode":   {"NONE": true, "CRON": true, "CDC": true, "EVENT": true},
	"dsStatus": {"正常": true, "异常": true, "停用": true},
	"viewKind": {"LOGICAL": true, "MATERIALIZED": true},
	"viewStat": {"DRAFT": true, "PUBLISHED": true, "DEPRECATED": true},
	"pipeType": {"采集": true, "清洗": true, "探查": true, "转换": true, "UTOPIA_PUSH": true},
	"pipeStat": {"运行中": true, "失败": true, "已停用": true},
}

// CreateDatasource 幂等注册；name 唯一（同名异 ID 409）。
func (s *Store) CreateDatasource(ctx context.Context, d Datasource) (Datasource, bool, error) {
	if !validSets["dsMode"][d.Mode] || !validSets["dsStatus"][d.Status] {
		return d, false, fmt.Errorf("%w: mode/status 取值非法", ErrInvalid)
	}
	var existID string
	err := s.pool.QueryRow(ctx, `SELECT id FROM datasources WHERE name = $1`, d.Name).Scan(&existID)
	if err == nil && existID != d.ID {
		return d, false, fmt.Errorf("%w: 数据源名 %s 已被 %s 占用", ErrConflict, d.Name, existID)
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return d, false, err
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO datasources (id, name, type, kind, host, status, mode, tables, sensitive, owner, last_sync, sync_interval_min)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'') ON CONFLICT (id) DO NOTHING`,
		d.ID, d.Name, d.Type, d.Kind, d.Host, d.Status, d.Mode, d.Tables, d.Sensitive, d.Owner, d.SyncIntervalMin)
	if err != nil {
		return d, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.GetDatasource(ctx, d.ID)
		return existing, false, err
	}
	return d, true, nil
}

// GetDatasource 单个数据源（复用扫描）。
func (s *Store) GetDatasource(ctx context.Context, id string) (Datasource, error) {
	var d Datasource
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, type, kind, host, status, mode, tables, sensitive, owner, last_sync, sync_interval_min
		FROM datasources WHERE id = $1`, id).
		Scan(&d.ID, &d.Name, &d.Type, &d.Kind, &d.Host, &d.Status, &d.Mode,
			&d.Tables, &d.Sensitive, &d.Owner, &d.LastSync, &d.SyncIntervalMin)
	if errors.Is(err, pgx.ErrNoRows) {
		return d, ErrNotFound
	}
	return d, err
}

// UpdateDatasource 编辑连接/同步策略/敏感级/负责人/状态。
func (s *Store) UpdateDatasource(ctx context.Context, d Datasource) (Datasource, error) {
	if !validSets["dsMode"][d.Mode] || !validSets["dsStatus"][d.Status] {
		return d, fmt.Errorf("%w: mode/status 取值非法", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE datasources SET name=$2, type=$3, kind=$4, host=$5, status=$6, mode=$7, sync_interval_min=$11,
			tables=$8, sensitive=$9, owner=$10 WHERE id=$1`,
		d.ID, d.Name, d.Type, d.Kind, d.Host, d.Status, d.Mode, d.Tables, d.Sensitive, d.Owner, d.SyncIntervalMin)
	if err != nil {
		return d, err
	}
	if tag.RowsAffected() == 0 {
		return d, ErrNotFound
	}
	return s.GetDatasource(ctx, d.ID)
}

// CreateView 幂等创建逻辑视图。
func (s *Store) CreateView(ctx context.Context, v View) (View, bool, error) {
	if !validSets["viewKind"][v.Kind] || !validSets["viewStat"][v.Status] {
		return v, false, fmt.Errorf("%w: kind/status 取值非法", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO views (id, name, kind, version, status, domain, sensitive, upstream, bound_by, owner, refresh)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
		v.ID, v.Name, v.Kind, v.Version, v.Status, v.Domain, v.Sensitive,
		normNil(v.Upstream), normNil(v.BoundBy), v.Owner, v.Refresh)
	if err != nil {
		return v, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getView(ctx, v.ID)
		return existing, false, err
	}
	out, err := s.getView(ctx, v.ID)
	return out, true, err
}

func (s *Store) getView(ctx context.Context, id string) (View, error) {
	var v View
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, kind, version, status, domain, sensitive, upstream, bound_by, owner, refresh
		FROM views WHERE id = $1`, id).
		Scan(&v.ID, &v.Name, &v.Kind, &v.Version, &v.Status, &v.Domain, &v.Sensitive,
			&v.Upstream, &v.BoundBy, &v.Owner, &v.Refresh)
	if errors.Is(err, pgx.ErrNoRows) {
		return v, ErrNotFound
	}
	return v, err
}

// UpdateView 编辑与下线（status → DEPRECATED）。
func (s *Store) UpdateView(ctx context.Context, v View) (View, error) {
	if !validSets["viewKind"][v.Kind] || !validSets["viewStat"][v.Status] {
		return v, fmt.Errorf("%w: kind/status 取值非法", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE views SET name=$2, kind=$3, version=$4, status=$5, domain=$6, sensitive=$7,
			upstream=$8, bound_by=$9, owner=$10, refresh=$11 WHERE id=$1`,
		v.ID, v.Name, v.Kind, v.Version, v.Status, v.Domain, v.Sensitive,
		normNil(v.Upstream), normNil(v.BoundBy), v.Owner, v.Refresh)
	if err != nil {
		return v, err
	}
	if tag.RowsAffected() == 0 {
		return v, ErrNotFound
	}
	return s.getView(ctx, v.ID)
}

func (s *Store) ListPipelineTasks(ctx context.Context) ([]PipelineTask, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, type, source, target, schedule, status, last_run FROM pipeline_tasks ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PipelineTask
	for rows.Next() {
		var p PipelineTask
		if err := rows.Scan(&p.ID, &p.Name, &p.Type, &p.Source, &p.Target, &p.Schedule, &p.Status, &p.LastRun); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// CreatePipelineTask 幂等注册加工任务。
func (s *Store) CreatePipelineTask(ctx context.Context, p PipelineTask) (PipelineTask, bool, error) {
	if !validSets["pipeType"][p.Type] {
		return p, false, fmt.Errorf("%w: type 取值非法（采集/清洗/探查/转换/UTOPIA_PUSH）", ErrInvalid)
	}
	if p.Status == "" {
		p.Status = "运行中"
	}
	if !validSets["pipeStat"][p.Status] {
		return p, false, fmt.Errorf("%w: status 取值非法", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO pipeline_tasks (id, name, type, source, target, schedule, status, last_run)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'') ON CONFLICT (id) DO NOTHING`,
		p.ID, p.Name, p.Type, p.Source, p.Target, p.Schedule, p.Status)
	if err != nil {
		return p, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getPipelineTask(ctx, p.ID)
		return existing, false, err
	}
	return p, true, nil
}

func (s *Store) getPipelineTask(ctx context.Context, id string) (PipelineTask, error) {
	var p PipelineTask
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, type, source, target, schedule, status, last_run FROM pipeline_tasks WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.Type, &p.Source, &p.Target, &p.Schedule, &p.Status, &p.LastRun)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// UpdatePipelineTaskStatus 启停流转（运行中↔已停用）。
func (s *Store) UpdatePipelineTaskStatus(ctx context.Context, id, status string) (PipelineTask, error) {
	if !validSets["pipeStat"][status] {
		return PipelineTask{}, fmt.Errorf("%w: status 取值非法", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx, `UPDATE pipeline_tasks SET status=$2 WHERE id=$1`, id, status)
	if err != nil {
		return PipelineTask{}, err
	}
	if tag.RowsAffected() == 0 {
		return PipelineTask{}, ErrNotFound
	}
	return s.getPipelineTask(ctx, id)
}

// RunPipelineTask 手动运行：停用任务 409；执行记录幂等；last_run 更新。
func (s *Store) RunPipelineTask(ctx context.Context, run PipelineRun) (PipelineTask, PipelineRun, error) {
	task, err := s.getPipelineTask(ctx, run.TaskID)
	if err != nil {
		return task, run, err // 404
	}
	if task.Status == "已停用" {
		return task, run, fmt.Errorf("%w: 任务「%s」已停用，请先启用", ErrConflict, task.Name)
	}
	if run.Status == "" {
		run.Status = "成功"
	}
	run.At = time.Now().Format("2006-01-02 15:04")
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO pipeline_runs (id, task_id, status, detail, at) VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (id) DO NOTHING`, run.ID, run.TaskID, run.Status, run.Detail, run.At)
	if err != nil {
		return task, run, err
	}
	if tag.RowsAffected() > 0 {
		if _, err := s.pool.Exec(ctx, `UPDATE pipeline_tasks SET last_run=$2 WHERE id=$1`, run.TaskID, run.At); err != nil {
			return task, run, err
		}
		task, err = s.getPipelineTask(ctx, run.TaskID)
		if err != nil {
			return task, run, err
		}
	}
	return task, run, nil
}

// ListPipelineRuns 执行记录（倒序，task 过滤）。
func (s *Store) ListPipelineRuns(ctx context.Context, task string) ([]PipelineRun, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, task_id, status, detail, at FROM pipeline_runs
		WHERE ($1 = '' OR task_id = $1) ORDER BY at DESC, id`, task)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PipelineRun
	for rows.Next() {
		var r PipelineRun
		if err := rows.Scan(&r.ID, &r.TaskID, &r.Status, &r.Detail, &r.At); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
