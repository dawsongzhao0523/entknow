// 知识运营：领域树、知识条目 CRUD（乐观并发 + 软删除）、同义词归并。
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type KbTerm struct {
	Term   string `json:"term"`
	En     string `json:"en"`
	Def    string `json:"def"`
	Source string `json:"source"`
}

type KbEntry struct {
	ID        string   `json:"id"`
	DomainID  string   `json:"domainId"`
	Title     string   `json:"title"`
	Status    string   `json:"status"`
	Source    string   `json:"source"`
	Onto      string   `json:"onto,omitempty"`
	DataRef   string   `json:"dataRef,omitempty"`
	Flow      string   `json:"flow,omitempty"`
	Roles     []string `json:"roles"`
	Mode      string   `json:"mode,omitempty"`
	Terms     []KbTerm `json:"terms"`
	Sops      []string `json:"sops"`
	Version   int      `json:"version"`
	UpdatedBy string   `json:"updatedBy,omitempty"`
	UpdatedAt string   `json:"updatedAt,omitempty"`

	// 请求携带（不入库）：PUT 的乐观并发版本
	ExpectedVersion int `json:"expectedVersion,omitempty"`
}

type KbDomain struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	ParentID   string `json:"parentId"`
	EntryCount int    `json:"entryCount"`
}

type Synonym struct {
	ID       string   `json:"id"`
	Terms    []string `json:"terms"`
	Standard string   `json:"standard"`
	Status   string   `json:"status"`
	By       string   `json:"by,omitempty"`
	At       string   `json:"at,omitempty"`
}

const kbCols = `id, domain_id, title, status, source, onto, data_ref, flow, roles, mode, terms::text, sops, version, updated_by, updated_at`

func scanKbEntry(row pgx.Row) (KbEntry, error) {
	var e KbEntry
	var terms string
	err := row.Scan(&e.ID, &e.DomainID, &e.Title, &e.Status, &e.Source, &e.Onto, &e.DataRef,
		&e.Flow, &e.Roles, &e.Mode, &terms, &e.Sops, &e.Version, &e.UpdatedBy, &e.UpdatedAt)
	if err != nil {
		return e, err
	}
	if err := json.Unmarshal([]byte(terms), &e.Terms); err != nil {
		return e, fmt.Errorf("kb_entries %s terms: %w", e.ID, err)
	}
	return e, nil
}

// ListKbDomains 领域层级 + 条目计数（不含已失效）。
func (s *Store) ListKbDomains(ctx context.Context) ([]KbDomain, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT d.id, d.name, d.parent_id,
		       (SELECT count(*) FROM kb_entries e WHERE e.domain_id = d.id AND e.status <> '已失效')
		FROM kb_domains d ORDER BY d.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []KbDomain
	for rows.Next() {
		var d KbDomain
		if err := rows.Scan(&d.ID, &d.Name, &d.ParentID, &d.EntryCount); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ListKbEntries 过滤：domain（精确）与 kw（标题/术语包含，忽略大小写）；不含已失效。
func (s *Store) ListKbEntries(ctx context.Context, domain, kw string) ([]KbEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+kbCols+` FROM kb_entries
		WHERE status <> '已失效'
		  AND ($1 = '' OR domain_id = $1)
		  AND ($2 = '' OR title ILIKE '%' || $2 || '%' OR terms::text ILIKE '%' || $2 || '%')
		ORDER BY id`, domain, kw)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []KbEntry
	for rows.Next() {
		e, err := scanKbEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) GetKbEntry(ctx context.Context, id string) (KbEntry, error) {
	e, err := scanKbEntry(s.pool.QueryRow(ctx, `SELECT `+kbCols+` FROM kb_entries WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return e, ErrNotFound
	}
	return e, err
}

// CreateKbEntry 幂等创建（客户端 id 幂等键；created=false 表示重放回读）。
func (s *Store) CreateKbEntry(ctx context.Context, e KbEntry) (KbEntry, bool, error) {
	if e.Status == "" {
		e.Status = "待评审"
	}
	if e.Source == "" {
		e.Source = "手工"
	}
	terms := "[]"
	if len(e.Terms) > 0 {
		b, _ := json.Marshal(e.Terms)
		terms = string(b)
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO kb_entries (id, domain_id, title, status, source, onto, data_ref, flow, roles, mode, terms, sops, version, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13, $14)
		ON CONFLICT (id) DO NOTHING`,
		e.ID, e.DomainID, e.Title, e.Status, e.Source, e.Onto, e.DataRef, e.Flow,
		normNil(e.Roles), e.Mode, terms, normNil(e.Sops), e.UpdatedBy, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return e, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.GetKbEntry(ctx, e.ID)
		return existing, false, err
	}
	e.Version = 1
	return e, true, nil
}

// UpdateKbEntry 全量更新（乐观并发）：expectedVersion 不一致 → ErrConflict；不存在 → ErrNotFound。
func (s *Store) UpdateKbEntry(ctx context.Context, e KbEntry, expectedVersion int) (KbEntry, error) {
	terms := "[]"
	if len(e.Terms) > 0 {
		b, _ := json.Marshal(e.Terms)
		terms = string(b)
	}
	updated, err := scanKbEntry(s.pool.QueryRow(ctx, `
		UPDATE kb_entries SET
			title = $2, status = $3, source = $4, onto = $5, data_ref = $6, flow = $7,
			roles = $8, mode = $9, terms = $10, sops = $11,
			version = version + 1, updated_by = $12, updated_at = $13
		WHERE id = $1 AND version = $14
		RETURNING `+kbCols,
		e.ID, e.Title, e.Status, e.Source, e.Onto, e.DataRef, e.Flow,
		normNil(e.Roles), e.Mode, terms, normNil(e.Sops), e.UpdatedBy,
		time.Now().Format("2006-01-02 15:04"), expectedVersion))
	switch {
	case err == nil:
		return updated, nil
	case errors.Is(err, pgx.ErrNoRows):
		if _, gerr := s.GetKbEntry(ctx, e.ID); gerr != nil { // 区分 404 与版本冲突
			return e, ErrNotFound
		}
		return e, fmt.Errorf("%w: 期望版本 v%d 已过期，请刷新后重试", ErrConflict, expectedVersion)
	default:
		return e, err
	}
}

// DeleteKbEntry 软删除（状态置「已失效」）；重复删除幂等返回现状。
func (s *Store) DeleteKbEntry(ctx context.Context, id string) (KbEntry, error) {
	e, err := scanKbEntry(s.pool.QueryRow(ctx, `
		UPDATE kb_entries SET status = '已失效', version = version + 1,
			updated_by = 'system', updated_at = $2
		WHERE id = $1 AND status <> '已失效'
		RETURNING `+kbCols, id, time.Now().Format("2006-01-02 15:04")))
	switch {
	case err == nil:
		return e, nil
	case errors.Is(err, pgx.ErrNoRows):
		if _, gerr := s.GetKbEntry(ctx, id); gerr != nil {
			return e, ErrNotFound
		}
		return s.GetKbEntry(ctx, id) // 已失效 → 幂等返回现状
	default:
		return e, err
	}
}

func (s *Store) ListSynonyms(ctx context.Context, status string) ([]Synonym, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, terms, standard, status, by, at FROM synonyms
		WHERE ($1 = '' OR status = $1) ORDER BY id`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Synonym
	for rows.Next() {
		var y Synonym
		if err := rows.Scan(&y.ID, &y.Terms, &y.Standard, &y.Status, &y.By, &y.At); err != nil {
			return nil, err
		}
		out = append(out, y)
	}
	return out, rows.Err()
}

// MergeSynonym 归并：standard 必须属于该组词条；同词重复归并幂等；换词重复归并 409。
func (s *Store) MergeSynonym(ctx context.Context, id, standard, by string) (Synonym, error) {
	var y Synonym
	err := s.pool.QueryRow(ctx, `SELECT id, terms, standard, status, by, at FROM synonyms WHERE id = $1`, id).
		Scan(&y.ID, &y.Terms, &y.Standard, &y.Status, &y.By, &y.At)
	if errors.Is(err, pgx.ErrNoRows) {
		return y, ErrNotFound
	}
	if err != nil {
		return y, err
	}
	if y.Status == "已归并" {
		if y.Standard == standard {
			return y, nil // 幂等重放
		}
		return y, fmt.Errorf("%w: 已按「%s」归并，不可改按「%s」重复归并", ErrConflict, y.Standard, standard)
	}
	if !contains(y.Terms, standard) {
		return y, fmt.Errorf("%w: 标准词「%s」不在该组词条内", ErrInvalid, standard)
	}
	err = s.pool.QueryRow(ctx, `
		UPDATE synonyms SET standard = $2, status = '已归并', by = $3, at = $4
		WHERE id = $1 AND status = '待归并'
		RETURNING id, terms, standard, status, by, at`,
		id, standard, by, time.Now().Format("2006-01-02")).
		Scan(&y.ID, &y.Terms, &y.Standard, &y.Status, &y.By, &y.At)
	if errors.Is(err, pgx.ErrNoRows) { // 并发下他人已归并：重读裁决
		return s.MergeSynonym(ctx, id, standard, by)
	}
	if err != nil {
		return y, err
	}
	return y, nil
}

// ErrInvalid 请求语义错误（如标准词不在词条组内），API 层转 400。
var ErrInvalid = errors.New("invalid")

func contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

// normNil 把未传的 text[] 字段归一为空数组（避免 NULL 违反非空约束）。
func normNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
