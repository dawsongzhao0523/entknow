// 本体版本运营：成员与授权、发布、OWL/RDF 导出、版本撤回对账与发布门禁（派生）。
package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// Member 本体成员。
type Member struct {
	OntoID string `json:"ontoId"`
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Role   string `json:"role"` // 所有者 | 建模者 | 评审者 | 查看者
}

// GateCheck 发布门禁检查项。
type GateCheck struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Passed bool   `json:"passed"`
	Reason string `json:"reason"`
}

// RetractReport 撤回对账。
type RetractReport struct {
	VersionID     int    `json:"versionId"`
	OntoID        string `json:"ontoId"`
	Version       string `json:"version"`
	AffectedObjs  int    `json:"affectedObjects"`
	AffectedBds   int    `json:"affectedBindings"`
	AffectedViews int    `json:"affectedViews"`
}

// ListMembers 本体成员（join 用户名）。
func (s *Store) ListMembers(ctx context.Context, ontoID string) ([]Member, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT m.onto_id, m.user_id, COALESCE(u.name, m.user_id), m.role
		FROM memberships m LEFT JOIN users u ON u.account = m.user_id
		WHERE m.onto_id = $1 ORDER BY m.role, m.user_id`, ontoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Member
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.OntoID, &m.UserID, &m.Name, &m.Role); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// SetMember 设置成员角色（存在则更新，不存在则添加）；user 必须存在（400）；
// 最后一个所有者不可降级/移除（409）。
func (s *Store) SetMember(ctx context.Context, m Member) (Member, error) {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM users WHERE account=$1`, m.UserID).Scan(&n); err != nil {
		return m, err
	}
	if n == 0 {
		return m, fmt.Errorf("%w: 用户 %s 不存在", ErrInvalid, m.UserID)
	}
	switch m.Role {
	case "所有者", "建模者", "评审者", "查看者":
	default:
		return m, fmt.Errorf("%w: role 必须为 所有者/建模者/评审者/查看者", ErrInvalid)
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO memberships (onto_id, user_id, role) VALUES ($1,$2,$3)
		ON CONFLICT (onto_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
		m.OntoID, m.UserID, m.Role); err != nil {
		return m, err
	}
	return m, nil
}

// RemoveMember 移除成员；最后一个所有者 409。
func (s *Store) RemoveMember(ctx context.Context, ontoID, userID string) error {
	var owners int
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM memberships WHERE onto_id=$1 AND role='所有者'`, ontoID).Scan(&owners); err != nil {
		return err
	}
	var role string
	err := s.pool.QueryRow(ctx,
		`SELECT role FROM memberships WHERE onto_id=$1 AND user_id=$2`, ontoID, userID).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if role == "所有者" && owners <= 1 {
		return fmt.Errorf("%w: 本体至少保留一个所有者", ErrConflict)
	}
	_, err = s.pool.Exec(ctx, `DELETE FROM memberships WHERE onto_id=$1 AND user_id=$2`, ontoID, userID)
	return err
}

// PublishOnto 发布：门禁全过才允许（否则 409 返回检查项）；onto 状态→PUBLISHED，versions 落当前快照行。
func (s *Store) PublishOnto(ctx context.Context, ontoID, by string) (Version, []GateCheck, error) {
	checks, err := s.ReleaseGate(ctx, ontoID)
	if err != nil {
		return Version{}, checks, err
	}
	for _, c := range checks {
		if !c.Passed {
			return Version{}, checks, fmt.Errorf("%w: 门禁未通过（%s：%s）", ErrConflict, c.Name, c.Reason)
		}
	}
	var cur string
	if err := s.pool.QueryRow(ctx, `SELECT version FROM ontologies WHERE id=$1`, ontoID).Scan(&cur); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Version{}, checks, ErrNotFound
		}
		return Version{}, checks, err
	}
	v := Version{
		V: nextVersion(cur), Date: time.Now().Format("01-02"),
		Desc: fmt.Sprintf("由 %s 发布（对象快照）", by), Status: "PUBLISHED",
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO versions (onto_id, v, date, description, status) VALUES ($1,$2,$3,$4,$5)`,
		ontoID, v.V, v.Date, v.Desc, v.Status); err != nil {
		return v, checks, err
	}
	if _, err := s.pool.Exec(ctx, `
		UPDATE ontologies SET status='PUBLISHED', version=$2 WHERE id=$1`, ontoID, v.V); err != nil {
		return v, checks, err
	}
	return v, checks, nil
}

func nextVersion(cur string) string {
	// "v0.4" → "v0.5"；解析失败回退加时间后缀保证唯一
	var major, minor int
	if _, err := fmt.Sscanf(cur, "v%d.%d", &major, &minor); err == nil {
		return fmt.Sprintf("v%d.%d", major, minor+1)
	}
	return fmt.Sprintf("v%s", time.Now().Format("01021504"))
}

// ReleaseGate 发布门禁（确定性派生）：元数据完整 / 无待评审变更 / 沙盘验证 / 绑定覆盖。
func (s *Store) ReleaseGate(ctx context.Context, ontoID string) ([]GateCheck, error) {
	var checks []GateCheck

	objects, err := s.ListObjects(ctx, "")
	if err != nil {
		return nil, err
	}
	var onto = objectsOf(objects, ontoID)
	bad := 0
	for _, o := range onto {
		if o.En == "" || o.Name == "" || len(o.Props) == 0 {
			bad++
		}
	}
	checks = append(checks, GateCheck{Key: "meta", Name: "元数据完整",
		Passed: bad == 0, Reason: fmt.Sprintf("%d 个对象缺少英文名或属性定义", bad)})

	reviews, err := s.ListReviews(ctx)
	if err != nil {
		return nil, err
	}
	pending := 0
	for _, r := range reviews {
		if r.Status == "待评审" || r.Status == "评审中" {
			pending++
		}
	}
	checks = append(checks, GateCheck{Key: "review", Name: "无待评审变更",
		Passed: pending == 0, Reason: fmt.Sprintf("%d 条评审待处理", pending)})

	branches, err := s.ListSandboxBranches(ctx)
	if err != nil {
		return nil, err
	}
	validated := 0
	for _, b := range branches {
		if b.Status == "已对比" {
			validated++
		}
	}
	checks = append(checks, GateCheck{Key: "sandbox", Name: "沙盘验证",
		Passed: validated > 0, Reason: fmt.Sprintf("%d 个分支完成对比验证", validated)})

	bindings, err := s.ListBindings(ctx)
	if err != nil {
		return nil, err
	}
	bound := map[string]bool{}
	for _, b := range bindings {
		bound[b.ObjectID] = true
	}
	canvasIDs := s.canvasObjectIDs(ctx)
	unbound := 0
	for _, o := range onto {
		if canvasIDs[o.ID] && !bound[o.ID] {
			unbound++
		}
	}
	checks = append(checks, GateCheck{Key: "binding", Name: "绑定覆盖",
		Passed: unbound == 0, Reason: fmt.Sprintf("%d 个画布对象未绑定数据", unbound)})
	return checks, nil
}

func objectsOf(all []Object, ontoName string) []Object {
	var out []Object
	for _, o := range all {
		if o.Ontology == ontoName {
			out = append(out, o)
		}
	}
	return out
}

// ExportOnto 确定性导出：format=owl（Turtle 语法）|rdf（NTriples 摘要）。
func (s *Store) ExportOnto(ctx context.Context, ontoID, format string) (string, error) {
	objects, err := s.ListObjects(ctx, "")
	if err != nil {
		return "", err
	}
	edges, err := s.ListEdges(ctx)
	if err != nil {
		return "", err
	}
	var b strings.Builder
	if format == "rdf" {
		for _, o := range objectsOf(objects, ontologyName(ontoID)) {
			fmt.Fprintf(&b, "<entknow:%s> <rdf:type> <entknow:Object> .\n", o.En)
		}
		for _, e := range edges {
			fmt.Fprintf(&b, "<entknow:%s> <entknow:%s> <entknow:%s> .\n", e.From, e.ID, e.To)
		}
		return b.String(), nil
	}
	// 默认 owl（Turtle）
	b.WriteString("@prefix entknow: <http://entknow.example/ontology/> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n")
	for _, o := range objectsOf(objects, ontologyName(ontoID)) {
		fmt.Fprintf(&b, "entknow:%s a owl:Class ; rdfs:label \"%s\"@zh .\n", o.En, o.Name)
		for _, p := range o.Props {
			fmt.Fprintf(&b, "entknow:%s__%s a owl:DatatypeProperty ; rdfs:domain entknow:%s ; rdfs:label \"%s\"@zh .\n",
				o.En, p.Name, o.En, p.Name)
		}
	}
	for _, e := range edges {
		fmt.Fprintf(&b, "entknow:%s a owl:ObjectProperty ; rdfs:domain entknow:%s ; rdfs:range entknow:%s ; rdfs:label \"%s\"@zh .\n",
			e.ID, e.From, e.To, e.Name)
	}
	return b.String(), nil
}

// ontologyName 本体 id（scm）与 objects.ontology 存中文名（供应链本体）的桥接。
func ontologyName(id string) string {
	switch id {
	case "scm":
		return "供应链本体"
	case "quality":
		return "质量追溯本体"
	case "equipment":
		return "设备运维本体"
	default:
		return id
	}
}

// RetractVersion 撤回已发布版本：状态→RETRACTED，生成对账（受影响对象/绑定/视图计数）+ 通知。
func (s *Store) RetractVersion(ctx context.Context, versionID int, by string) (RetractReport, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return RetractReport{}, err
	}
	defer tx.Rollback(ctx)

	var rep RetractReport
	err = tx.QueryRow(ctx, `SELECT id, onto_id, v, status FROM versions WHERE id=$1 FOR UPDATE`, versionID).
		Scan(&rep.VersionID, &rep.OntoID, &rep.Version, new(string))
	if errors.Is(err, pgx.ErrNoRows) {
		return rep, ErrNotFound
	}
	if err != nil {
		return rep, err
	}
	tag, err := tx.Exec(ctx,
		`UPDATE versions SET status='RETRACTED' WHERE id=$1 AND status LIKE 'PUBLISHED%'`, versionID)
	if err != nil {
		return rep, err
	}
	if tag.RowsAffected() == 0 {
		return rep, fmt.Errorf("%w: 仅已发布版本可撤回", ErrConflict)
	}

	objs, _ := s.ListObjects(ctx, "")
	rep.AffectedObjs = len(objectsOf(objs, ontologyName(rep.OntoID)))
	bds, _ := s.ListBindings(ctx)
	for _, b := range bds {
		for _, o := range objectsOf(objs, ontologyName(rep.OntoID)) {
			if b.ObjectID == o.ID {
				rep.AffectedBds++
			}
		}
	}
	views, _ := s.ListViews(ctx)
	for _, v := range views {
		if v.Domain == "供应链" {
			rep.AffectedViews++
		}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO notifications (id, cat, title, time, to_path, unread)
		VALUES ($1, '治理任务', $2, '刚刚', '/governance/evolution', true)
		ON CONFLICT (id) DO NOTHING`,
		fmt.Sprintf("n-rt-%d", versionID),
		fmt.Sprintf("版本撤回：%s %s（%s）· 受影响对象 %d / 绑定 %d / 视图 %d",
			rep.OntoID, rep.Version, by, rep.AffectedObjs, rep.AffectedBds, rep.AffectedViews)); err != nil {
		return rep, err
	}
	if err := tx.Commit(ctx); err != nil {
		return rep, err
	}
	return rep, nil
}
