// Package store 提供 entKnow 的 PostgreSQL 访问层：连接池、幂等迁移、demo 种子与核心实体查询。
// 结构体 json tag 与 prototype/src/mock/data.ts 的 TS 接口一一对应（camelCase）。
package store

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"

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
}

type Rule struct {
	ID     string `json:"id"`
	Def    string `json:"def"`
	Kind   string `json:"kind"`
	Status string `json:"status"`
	Fired  int    `json:"fired"`
}

type Review struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Type   string `json:"type"`
	From   string `json:"from"`
	Status string `json:"status"`
	SLA    string `json:"sla"`
}

type Notification struct {
	ID     string `json:"id"`
	Cat    string `json:"cat"`
	Title  string `json:"title"`
	Time   string `json:"time"`
	To     string `json:"to"`
	Unread bool   `json:"unread"`
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
	ID    string `json:"id"`
	Name  string `json:"name"`
	Desc  string `json:"desc"`
	Proto string `json:"proto"`
	Calls string `json:"calls"`
	Owner string `json:"owner"`
}

type Version struct {
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
		       state_machine, ontology, shared, perm, mapping, props::text
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

func scanObject(rows pgx.Rows) (Object, error) {
	var o Object
	var props string
	if err := rows.Scan(&o.ID, &o.Name, &o.En, &o.Kind, &o.Version, &o.Status, &o.RefCount,
		&o.Owner, &o.StateMachine, &o.Ontology, &o.Shared, &o.Perm, &o.Mapping, &props); err != nil {
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
		SELECT id, name, type, kind, host, status, mode, tables, sensitive, owner, last_sync
		FROM datasources ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Datasource
	for rows.Next() {
		var d Datasource
		if err := rows.Scan(&d.ID, &d.Name, &d.Type, &d.Kind, &d.Host, &d.Status, &d.Mode,
			&d.Tables, &d.Sensitive, &d.Owner, &d.LastSync); err != nil {
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
	rows, err := s.pool.Query(ctx, `SELECT id, title, type, from_user, status, sla FROM reviews ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Review
	for rows.Next() {
		var r Review
		if err := rows.Scan(&r.ID, &r.Title, &r.Type, &r.From, &r.Status, &r.SLA); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) ListNotifications(ctx context.Context) ([]Notification, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, cat, title, time, to_path, unread FROM notifications ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Cat, &n.Title, &n.Time, &n.To, &n.Unread); err != nil {
			return nil, err
		}
		out = append(out, n)
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

func (s *Store) ListCapabilities(ctx context.Context) ([]Capability, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, proto, calls, owner FROM capabilities ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Capability
	for rows.Next() {
		var c Capability
		if err := rows.Scan(&c.ID, &c.Name, &c.Desc, &c.Proto, &c.Calls, &c.Owner); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) ListVersions(ctx context.Context, ontoID string) ([]Version, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT v, date, description, status FROM versions WHERE onto_id = $1 ORDER BY id`, ontoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Version
	for rows.Next() {
		var v Version
		if err := rows.Scan(&v.V, &v.Date, &v.Desc, &v.Status); err != nil {
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
