// 本体设计器写路径：对象/关系/函数的创建（幂等）、编辑、生命周期流转与引用计数联动。
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// 元素生命周期：DRAFT → IN_REVIEW → PUBLISHED → DEPRECATED（publish 允许 DRAFT 快捷）。
var elementOutcome = map[string]string{
	"submit":    "IN_REVIEW",
	"publish":   "PUBLISHED",
	"deprecate": "DEPRECATED",
}

// IsElementReplay：当前状态已是该动作结果（同向重放）。
func IsElementReplay(action, cur string) bool {
	return elementOutcome[action] == cur
}

// ElementNextStatus 合法迁移；非法（含未知动作）返回错误。
func ElementNextStatus(action, cur string) (string, error) {
	next, ok := elementOutcome[action]
	if !ok {
		return "", fmt.Errorf("未知流转动作 %q（允许 submit/publish/deprecate）", action)
	}
	switch {
	case action == "submit" && cur == "DRAFT",
		action == "publish" && (cur == "DRAFT" || cur == "IN_REVIEW"),
		action == "deprecate" && cur == "PUBLISHED":
		return next, nil
	}
	return "", fmt.Errorf("状态 %q 不可执行 %q", cur, action)
}

// ─── 对象 ───

// CreateObject 幂等创建（status 强制 DRAFT）。
func (s *Store) CreateObject(ctx context.Context, o Object) (Object, bool, error) {
	switch o.Kind {
	case "静态事实", "单体动态", "立方动态":
	default:
		return o, false, fmt.Errorf("%w: kind 必须为 静态事实/单体动态/立方动态", ErrInvalid)
	}
	props := "[]"
	if len(o.Props) > 0 {
		b, _ := json.Marshal(o.Props)
		props = string(b)
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO objects (id, name, en, kind, version, status, ref_count, owner,
			state_machine, ontology, canvas, shared, perm, mapping, props)
		VALUES ($1,$2,$3,$4,'v0.1','DRAFT',0,$5,$6,$7,true,true,'use',$8,$9)
		ON CONFLICT (id) DO NOTHING`,
		o.ID, o.Name, o.En, o.Kind, o.Owner, o.StateMachine, o.Ontology, o.Mapping, props)
	if err != nil {
		return o, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.GetObject(ctx, o.ID)
		return existing, false, err
	}
	o.Status, o.Version, o.RefCount = "DRAFT", "v0.1", 0
	return o, true, nil
}

func (s *Store) GetObject(ctx context.Context, id string) (Object, error) {
	o, err := scanObject(s.pool.QueryRow(ctx, `
		SELECT id, name, en, kind, version, status, ref_count, owner,
		       state_machine, ontology, canvas, shared, perm, mapping, props::text
		FROM objects WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return o, ErrNotFound
	}
	return o, err
}

// UpdateObject 全量编辑（status/ref_count 由流转与引用负责，不在此变更）。
func (s *Store) UpdateObject(ctx context.Context, o Object) (Object, error) {
	props := "[]"
	if len(o.Props) > 0 {
		b, _ := json.Marshal(o.Props)
		props = string(b)
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE objects SET name=$2, en=$3, kind=$4, owner=$5, state_machine=$6,
			ontology=$7, mapping=$8, props=$9 WHERE id=$1`,
		o.ID, o.Name, o.En, o.Kind, o.Owner, o.StateMachine, o.Ontology, o.Mapping, props)
	if err != nil {
		return o, err
	}
	if tag.RowsAffected() == 0 {
		return o, ErrNotFound
	}
	return s.GetObject(ctx, o.ID)
}

// ─── 关系（引用计数联动） ───

// CreateEdge 幂等创建：两端对象存在且 PUBLISHED；事务内 ref_count +1。
func (s *Store) CreateEdge(ctx context.Context, e Edge) (Edge, bool, error) {
	for _, objName := range []string{e.From, e.To} {
		var status string
		err := s.pool.QueryRow(ctx, `SELECT status FROM objects WHERE name = $1`, objName).Scan(&status)
		if errors.Is(err, pgx.ErrNoRows) {
			return e, false, fmt.Errorf("%w: 对象「%s」不存在", ErrInvalid, objName)
		}
		if err != nil {
			return e, false, err
		}
		if status == "DEPRECATED" {
			return e, false, fmt.Errorf("%w: 对象「%s」已废弃，不可引用", ErrInvalid, objName)
		}
	}
	props := "[]"
	if len(e.Props) > 0 {
		b, _ := json.Marshal(e.Props)
		props = string(b)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return e, false, err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `
		INSERT INTO edges (id, name, from_obj, to_obj, version, status, ref_count, props, perm)
		VALUES ($1,$2,$3,$4,'v0.1','DRAFT',0,$5,$6) ON CONFLICT (id) DO NOTHING`,
		e.ID, e.Name, e.From, e.To, props, e.Perm)
	if err != nil {
		return e, false, err
	}
	if tag.RowsAffected() == 0 { // 幂等重放（不动引用计数）
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			return e, false, err
		}
		existing, err := s.getEdge(ctx, e.ID)
		return existing, false, err
	}
	for _, objName := range []string{e.From, e.To} {
		if _, err := tx.Exec(ctx, `UPDATE objects SET ref_count = ref_count + 1 WHERE name = $1`, objName); err != nil {
			return e, false, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return e, false, err
	}
	e.Status, e.Version, e.RefCount = "DRAFT", "v0.1", 0
	return e, true, nil
}

func (s *Store) getEdge(ctx context.Context, id string) (Edge, error) {
	var e Edge
	var props string
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, from_obj, to_obj, version, status, ref_count, props::text, perm
		FROM edges WHERE id = $1`, id).
		Scan(&e.ID, &e.Name, &e.From, &e.To, &e.Version, &e.Status, &e.RefCount, &props, &e.Perm)
	if errors.Is(err, pgx.ErrNoRows) {
		return e, ErrNotFound
	}
	if err != nil {
		return e, err
	}
	if err := json.Unmarshal([]byte(props), &e.Props); err != nil {
		return e, fmt.Errorf("edges %s props: %w", id, err)
	}
	return e, nil
}

// UpdateEdge 编辑边属性。
func (s *Store) UpdateEdge(ctx context.Context, e Edge) (Edge, error) {
	props := "[]"
	if len(e.Props) > 0 {
		b, _ := json.Marshal(e.Props)
		props = string(b)
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE edges SET name=$2, from_obj=$3, to_obj=$4, props=$5, perm=$6 WHERE id=$1`,
		e.ID, e.Name, e.From, e.To, props, e.Perm)
	if err != nil {
		return e, err
	}
	if tag.RowsAffected() == 0 {
		return e, ErrNotFound
	}
	return s.getEdge(ctx, e.ID)
}

// ─── 函数 ───

// CreateFunc 幂等创建（cat 四类）。
func (s *Store) CreateFunc(ctx context.Context, f Func) (Func, bool, error) {
	switch f.Cat {
	case "指标", "派生", "行动", "权限":
	default:
		return f, false, fmt.Errorf("%w: cat 必须为 指标/派生/行动/权限", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO functions (id, name, cat, version, status, tests, calls_7d, signature, impl, perm)
		VALUES ($1,$2,$3,'v0.1','DRAFT','0/0','',$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
		f.ID, f.Name, f.Cat, f.Signature, f.Impl, f.Perm)
	if err != nil {
		return f, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getFunc(ctx, f.ID)
		return existing, false, err
	}
	f.Status, f.Version, f.Tests = "DRAFT", "v0.1", "0/0"
	return f, true, nil
}

func (s *Store) getFunc(ctx context.Context, id string) (Func, error) {
	var f Func
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, cat, version, status, tests, calls_7d, signature, impl, perm
		FROM functions WHERE id = $1`, id).
		Scan(&f.ID, &f.Name, &f.Cat, &f.Version, &f.Status, &f.Tests, &f.Calls7d, &f.Signature, &f.Impl, &f.Perm)
	if errors.Is(err, pgx.ErrNoRows) {
		return f, ErrNotFound
	}
	return f, err
}

// UpdateFunc 编辑签名/实现。
func (s *Store) UpdateFunc(ctx context.Context, f Func) (Func, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE functions SET name=$2, cat=$3, signature=$4, impl=$5 WHERE id=$1`,
		f.ID, f.Name, f.Cat, f.Signature, f.Impl)
	if err != nil {
		return f, err
	}
	if tag.RowsAffected() == 0 {
		return f, ErrNotFound
	}
	return s.getFunc(ctx, f.ID)
}

// ─── 生命周期流转 ───

// TransitionElement 对象/关系/函数统一流转（重放幂等，非法 409）。
func (s *Store) TransitionElement(ctx context.Context, elemType, id, action, by string) (any, error) {
	var cur string
	var query string
	switch elemType {
	case "objects":
		query = `SELECT status FROM objects WHERE id=$1`
	case "edges":
		query = `SELECT status FROM edges WHERE id=$1`
	case "functions":
		query = `SELECT status FROM functions WHERE id=$1`
	default:
		return nil, fmt.Errorf("%w: 元素类型 %q 非法", ErrInvalid, elemType)
	}
	if err := s.pool.QueryRow(ctx, query, id).Scan(&cur); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if IsElementReplay(action, cur) { // 同向重放
		return s.readElement(ctx, elemType, id)
	}
	next, err := ElementNextStatus(action, cur)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrConflict, err)
	}
	table := map[string]string{"objects": "objects", "edges": "edges", "functions": "functions"}[elemType]
	if _, err := s.pool.Exec(ctx,
		fmt.Sprintf(`UPDATE %s SET status=$2 WHERE id=$1`, table), id, next); err != nil {
		return nil, err
	}
	return s.readElement(ctx, elemType, id)
}

func (s *Store) readElement(ctx context.Context, elemType, id string) (any, error) {
	switch strings.ToLower(elemType) {
	case "objects":
		return s.GetObject(ctx, id)
	case "edges":
		return s.getEdge(ctx, id)
	case "functions":
		return s.getFunc(ctx, id)
	}
	return nil, fmt.Errorf("%w: 元素类型非法", ErrInvalid)
}
