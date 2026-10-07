// Package store 提供 entKnow 的 PostgreSQL 访问层：连接池、幂等迁移、demo 种子与核心实体查询。
// 结构体 json tag 与 prototype/src/mock/data.ts 的 TS 接口一一对应（camelCase）。
package store

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql seed.sql
var ddlFS embed.FS

type Store struct {
	pool *pgxpool.Pool
}

func Connect(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

// Migrate 执行内嵌 schema.sql（全部 IF NOT EXISTS，幂等）。
func (s *Store) Migrate(ctx context.Context) error {
	sql, err := ddlFS.ReadFile("schema.sql")
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, string(sql))
	return err
}

// Seed 强制重置为 demo 数据（TRUNCATE + INSERT，可重复执行）。
func (s *Store) Seed(ctx context.Context) error {
	sql, err := ddlFS.ReadFile("seed.sql")
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, string(sql))
	return err
}

// SeedIfEmpty 空库时自动装载 demo 数据。
func (s *Store) SeedIfEmpty(ctx context.Context) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM ontologies`).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return s.Seed(ctx)
	}
	return nil
}

// ─── 类型（json 形状 = 原型 mock） ───

type Prop struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Comment  string `json:"comment"`
	Temporal string `json:"temporal,omitempty"` // 边属性专有
	Agg      string `json:"agg,omitempty"`      // 边属性专有
}

type Ontology struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Scene   string `json:"scene"`
	Version string `json:"version"`
	Status  string `json:"status"`
	Owner   string `json:"owner"`
	Members int    `json:"members"`
	Objects int    `json:"objects"`
	Edges   int    `json:"edges"`
	Created string `json:"created"`
	MyRole  string `json:"myRole"`
}

type Object struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	En           string   `json:"en"`
	Kind         string   `json:"kind"`
	Version      string   `json:"version"`
	Status       string   `json:"status"`
	RefCount     int      `json:"refCount"`
	Owner        string   `json:"owner"`
	StateMachine []string `json:"stateMachine,omitempty"`
	Ontology     string   `json:"ontology"`
	Canvas       bool     `json:"canvas"`
	Shared       bool     `json:"shared"`
	Perm         string   `json:"perm,omitempty"`
	Mapping      string   `json:"mapping,omitempty"`
	Props        []Prop   `json:"props,omitempty"`
}

type Edge struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	From     string `json:"from"`
	To       string `json:"to"`
	Version  string `json:"version"`
	Status   string `json:"status"`
	RefCount int    `json:"refCount"`
	Props    []Prop `json:"props"`
	Perm     string `json:"perm,omitempty"`
}

type Func struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Cat       string `json:"cat"`
	Version   string `json:"version"`
	Status    string `json:"status"`
	Tests     string `json:"tests"`
	Calls7d   string `json:"calls7d,omitempty"`
	Signature string `json:"signature,omitempty"`
	Impl      string `json:"impl,omitempty"`
	Perm      string `json:"perm,omitempty"`
}

type View struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Kind      string   `json:"kind"`
	Version   string   `json:"version"`
	Status    string   `json:"status"`
	Domain    string   `json:"domain"`
	Sensitive string   `json:"sensitive"`
	Upstream  []string `json:"upstream"`
	BoundBy   []string `json:"boundBy"`
	Owner     string   `json:"owner"`
	Refresh   string   `json:"refresh,omitempty"`
}

type Datasource struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	Kind      string `json:"kind"`
	Host      string `json:"host,omitempty"`
	Status    string `json:"status"`
	Mode      string `json:"mode"`
	Tables    *int   `json:"tables,omitempty"`
	Sensitive string `json:"sensitive"`
	Owner     string `json:"owner"`
	LastSync  string `json:"lastSync"`
	SyncIntervalMin int `json:"syncIntervalMin"`
}

type Rule struct {
	ID     string `json:"id"`
	Def    string `json:"def"`
	Kind   string `json:"kind"`
	Status string `json:"status"`
	Fired  int    `json:"fired"`
}

type Review struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Type      string `json:"type"`
	From      string `json:"from"`
	Status    string `json:"status"`
	SLA       string `json:"sla"`
	DecidedBy string `json:"decidedBy,omitempty"`
	DecidedAt string `json:"decidedAt,omitempty"`
	Comment   string `json:"comment,omitempty"`
}

type User struct {
	ID        string   `json:"id"`
	Account   string   `json:"account"`
	Name      string   `json:"name"`
	Dept      string   `json:"dept"`
	Post      string   `json:"post"`
	Roles     []string `json:"roles"`
	Status    string   `json:"status"`
	LastLogin string   `json:"lastLogin"`
}

type Capability struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Desc       string `json:"desc"`
	Proto      string `json:"proto"`
	Calls      string `json:"calls"` // 千分位字符串（兼容原型展示）
	Owner      string `json:"owner"`
	CallsTotal int    `json:"callsTotal"` // base_calls + 调用日志数
	RealCalls  int    `json:"realCalls"`  // 真实调用日志数
}

type Version struct {
	ID     int    `json:"id"`
	V      string `json:"v"`
	Date   string `json:"date"`
	Desc   string `json:"desc"`
	Status string `json:"status"`
}

type FieldProfile struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	NullRate string `json:"nullRate"`
	Sample   string `json:"sample"`
	Comment  string `json:"comment"`
	AIFilled bool   `json:"aiFilled,omitempty"`
}

type TableProfile struct {
	Name          string         `json:"name"`
	Comment       string         `json:"comment"`
	Rows          string         `json:"rows"`
	Fields        int            `json:"fields"`
	PK            string         `json:"pk"`
	FKs           []string       `json:"fks"`
	Siblings      []string       `json:"siblings"`
	ProfileFields []FieldProfile `json:"profileFields"`
}

// ErrNotFound 查询目标不存在（API 层转 404）。
var ErrNotFound = errors.New("not found")

// ─── 查询 ───

// ListOntologies 返回本体列表；myRole 取 user 在各本体的成员角色（默认「查看者」）。
func (s *Store) ListOntologies(ctx context.Context, user string) ([]Ontology, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.name, o.scene, o.version, o.status, o.owner, o.members,
		       o.object_count, o.edge_count, o.created, COALESCE(m.role, '查看者')
		FROM ontologies o
		LEFT JOIN memberships m ON m.onto_id = o.id AND m.user_id = $1
		ORDER BY o.id`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Ontology
	for rows.Next() {
		var o Ontology
		if err := rows.Scan(&o.ID, &o.Name, &o.Scene, &o.Version, &o.Status, &o.Owner,
			&o.Members, &o.Objects, &o.Edges, &o.Created, &o.MyRole); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

// ListObjects scope=canvas 仅画布对象（o1-o7）；否则全部注册中心对象。
func (s *Store) ListObjects(ctx context.Context, scope string) ([]Object, error) {
	canvasOnly := scope == "canvas"
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, en, kind, version, status, ref_count, owner,
		       state_machine, ontology, canvas, shared, perm, mapping, props::text
		FROM objects WHERE (NOT $1 OR canvas) ORDER BY id`, canvasOnly)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Object
	for rows.Next() {
		o, err := scanObject(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

// rowScanner pgx.Row 与 pgx.Rows 共有的扫描能力。
type rowScanner interface{ Scan(dest ...any) error }

func scanObject(rows rowScanner) (Object, error) {
	var o Object
	var props string
	if err := rows.Scan(&o.ID, &o.Name, &o.En, &o.Kind, &o.Version, &o.Status, &o.RefCount,
		&o.Owner, &o.StateMachine, &o.Ontology, &o.Canvas, &o.Shared, &o.Perm, &o.Mapping, &props); err != nil {
		return o, err
	}
	if err := json.Unmarshal([]byte(props), &o.Props); err != nil {
		return o, fmt.Errorf("objects %s props: %w", o.ID, err)
	}
	return o, nil
}

func (s *Store) ListEdges(ctx context.Context) ([]Edge, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, from_obj, to_obj, version, status, ref_count, props::text, perm
		FROM edges ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Edge
	for rows.Next() {
		var e Edge
		var props string
		if err := rows.Scan(&e.ID, &e.Name, &e.From, &e.To, &e.Version, &e.Status,
			&e.RefCount, &props, &e.Perm); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(props), &e.Props); err != nil {
			return nil, fmt.Errorf("edges %s props: %w", e.ID, err)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) ListFuncs(ctx context.Context) ([]Func, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, cat, version, status, tests, calls_7d, signature, impl, perm
		FROM functions ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Func
	for rows.Next() {
		var f Func
		if err := rows.Scan(&f.ID, &f.Name, &f.Cat, &f.Version, &f.Status, &f.Tests,
			&f.Calls7d, &f.Signature, &f.Impl, &f.Perm); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (s *Store) ListViews(ctx context.Context) ([]View, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, kind, version, status, domain, sensitive, upstream, bound_by, owner, refresh
		FROM views ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []View
	for rows.Next() {
		var v View
		if err := rows.Scan(&v.ID, &v.Name, &v.Kind, &v.Version, &v.Status, &v.Domain,
			&v.Sensitive, &v.Upstream, &v.BoundBy, &v.Owner, &v.Refresh); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Store) ListDatasources(ctx context.Context) ([]Datasource, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, type, kind, host, status, mode, tables, sensitive, owner, last_sync, sync_interval_min
		FROM datasources ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Datasource
	for rows.Next() {
		var d Datasource
		if err := rows.Scan(&d.ID, &d.Name, &d.Type, &d.Kind, &d.Host, &d.Status, &d.Mode,
			&d.Tables, &d.Sensitive, &d.Owner, &d.LastSync, &d.SyncIntervalMin); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) ListRules(ctx context.Context) ([]Rule, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, def, kind, status, fired FROM rules ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Rule
	for rows.Next() {
		var r Rule
		if err := rows.Scan(&r.ID, &r.Def, &r.Kind, &r.Status, &r.Fired); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) ListReviews(ctx context.Context) ([]Review, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, title, type, from_user, status, sla, decided_by, decided_at, comment
		FROM reviews ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Review
	for rows.Next() {
		var r Review
		if err := rows.Scan(&r.ID, &r.Title, &r.Type, &r.From, &r.Status, &r.SLA,
			&r.DecidedBy, &r.DecidedAt, &r.Comment); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) ListUsers(ctx context.Context) ([]User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, account, name, dept, post, roles, status, last_login FROM users ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Account, &u.Name, &u.Dept, &u.Post, &u.Roles,
			&u.Status, &u.LastLogin); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) ListVersions(ctx context.Context, ontoID string) ([]Version, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, v, date, description, status FROM versions WHERE onto_id = $1 ORDER BY id`, ontoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Version{} // 非 nil：空结果序列化为 [] 而非 null
	for rows.Next() {
		var v Version
		if err := rows.Scan(&v.ID, &v.V, &v.Date, &v.Desc, &v.Status); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Store) GetTableProfile(ctx context.Context, name string) (TableProfile, error) {
	var p TableProfile
	var fks, siblings, fields string
	err := s.pool.QueryRow(ctx, `
		SELECT name, comment, rows, fields, pk, fks::text, siblings::text, profile_fields::text
		FROM table_profiles WHERE name = $1`, name).
		Scan(&p.Name, &p.Comment, &p.Rows, &p.Fields, &p.PK, &fks, &siblings, &fields)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	if err != nil {
		return p, err
	}
	for _, dec := range []struct {
		raw  string
		into any
	}{{fks, &p.FKs}, {siblings, &p.Siblings}, {fields, &p.ProfileFields}} {
		if err := json.Unmarshal([]byte(dec.raw), dec.into); err != nil {
			return p, fmt.Errorf("table_profiles %s json: %w", name, err)
		}
	}
	return p, nil
}

// ─── 评审流转（写路径） ───

// ErrConflict 状态冲突（非法迁移 / 乐观并发失败），API 层转 409。
var ErrConflict = errors.New("conflict")

const reviewCols = "id, title, type, from_user, status, sla, decided_by, decided_at, comment"

func scanReview(row pgx.Row) (Review, error) {
	var r Review
	err := row.Scan(&r.ID, &r.Title, &r.Type, &r.From, &r.Status, &r.SLA,
		&r.DecidedBy, &r.DecidedAt, &r.Comment)
	return r, err
}

// CreateReview 幂等创建：相同 id 重复提交返回既有记录（created=false）。
// 调用方须已校验 id 非空。
func (s *Store) CreateReview(ctx context.Context, r Review) (Review, bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO reviews (id, title, type, from_user, status, sla)
		VALUES ($1, $2, $3, $4, '待评审', COALESCE(NULLIF($5, ''), '-'))
		ON CONFLICT (id) DO NOTHING`, r.ID, r.Title, r.Type, r.From, r.SLA)
	if err != nil {
		return r, false, err
	}
	if tag.RowsAffected() == 0 { // 幂等重放：回读既有记录
		existing, err := scanReview(s.pool.QueryRow(ctx,
			`SELECT `+reviewCols+` FROM reviews WHERE id = $1`, r.ID))
		if err != nil {
			return existing, false, err
		}
		return existing, false, nil
	}
	r.Status = "待评审"
	if r.SLA == "" {
		r.SLA = "-"
	}
	return r, true, nil
}

// Decision 裁决请求：action = approve | reject | withdraw。
type Decision struct {
	ReviewID       string
	Action         string
	By             string
	Comment        string
	ExpectedStatus string // 乐观并发：非空时须与当前状态一致
}

// DecideReview 单事务完成裁决：行锁 → 校验（重放直接返回现状）→ 更新 → 确定性 ID 通知。
func (s *Store) DecideReview(ctx context.Context, d Decision) (Review, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Review{}, err
	}
	defer tx.Rollback(ctx) // 提交成功后为 no-op

	r, err := scanReview(tx.QueryRow(ctx,
		`SELECT `+reviewCols+` FROM reviews WHERE id = $1 FOR UPDATE`, d.ReviewID))
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	if err != nil {
		return r, err
	}

	if d.ExpectedStatus != "" && r.Status != d.ExpectedStatus {
		return r, fmt.Errorf("%w: 期望状态 %q，实际 %q", ErrConflict, d.ExpectedStatus, r.Status)
	}
	if IsReplay(d.Action, r.Status) { // 同向终态重放：幂等返回现状
		return r, nil
	}
	next, err := NextStatus(d.Action, r.Status)
	if err != nil {
		return r, fmt.Errorf("%w: %v", ErrConflict, err)
	}

	decidedAt := time.Now().Format("2006-01-02 15:04")
	if _, err := tx.Exec(ctx, `
		UPDATE reviews SET status = $2, decided_by = $3, decided_at = $4, comment = $5
		WHERE id = $1`, d.ReviewID, next, d.By, decidedAt, d.Comment); err != nil {
		return r, err
	}
	toUser := s.accountByName(ctx, r.From) // 定向提出人；映射不到则广播
	if _, err := tx.Exec(ctx, `
		INSERT INTO notifications (id, cat, title, time, to_path, unread, to_user)
		VALUES ($1, '治理任务', $2, '刚刚', '/governance/reviews', true, $3)
		ON CONFLICT (id) DO NOTHING`,
		"n-rv-"+d.ReviewID+"-"+d.Action, "评审结果："+r.Title+" → "+next+"（"+d.By+"）", toUser); err != nil {
		return r, err
	}
	if err := tx.Commit(ctx); err != nil {
		return r, err
	}

	r.Status, r.DecidedBy, r.DecidedAt, r.Comment = next, d.By, decidedAt, d.Comment
	return r, nil
}
