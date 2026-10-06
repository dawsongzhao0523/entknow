// 隐式本体收敛：由知识条目/同义词确定性生成本体候选并裁决（采纳→对象草稿入库）；
// 跨源实体对齐：由同义词组与知识术语生成对齐候选并裁决。
package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// OntoCandidate 本体候选。
type OntoCandidate struct {
	ID         string `json:"id"`
	Source     string `json:"source"`
	Suggestion string `json:"suggestion"`
	Kind       string `json:"kind"`
	Evidence   string `json:"evidence"`
	Status     string `json:"status"`
	By         string `json:"by"`
	At         string `json:"at"`
}

// EntityAlignment 跨源对齐候选。
type EntityAlignment struct {
	ID        string `json:"id"`
	LeftTerm  string `json:"leftTerm"`
	RightTerm string `json:"rightTerm"`
	SourceA   string `json:"sourceA"`
	SourceB   string `json:"sourceB"`
	Strategy  string `json:"strategy"`
	Score     int    `json:"score"`
	Status    string `json:"status"`
	By        string `json:"by"`
	At        string `json:"at"`
}

func (s *Store) ListCandidates(ctx context.Context, status string) ([]OntoCandidate, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, source, suggestion, kind, evidence, status, by, at FROM onto_candidates
		WHERE ($1 = '' OR status = $1) ORDER BY status, id`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OntoCandidate
	for rows.Next() {
		var c OntoCandidate
		if err := rows.Scan(&c.ID, &c.Source, &c.Suggestion, &c.Kind, &c.Evidence, &c.Status, &c.By, &c.At); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// GenerateCandidates 确定性召回：同义词组标准词未出现在对象名中 → 「对象」候选；
// 组内含两字以上共现词 → 「属性」候选。幂等（按 source 去重，仅新增待裁决）。
func (s *Store) GenerateCandidates(ctx context.Context) ([]OntoCandidate, error) {
	syns, err := s.ListSynonyms(ctx, "")
	if err != nil {
		return nil, err
	}
	objNames := map[string]bool{}
	objects, err := s.ListObjects(ctx, "")
	if err != nil {
		return nil, err
	}
	for _, o := range objects {
		objNames[o.Name] = true
	}
	now := time.Now().Format("2006-01-02 15:04")
	created := 0
	for _, syn := range syns {
		standard := syn.Standard
		if standard == "" {
			continue
		}
		if objNames[standard] {
			continue // 已显式建模
		}
		var exists int
		if err := s.pool.QueryRow(ctx,
			`SELECT count(*) FROM onto_candidates WHERE source=$1 AND suggestion=$2`,
			"同义词组「"+strings.Join(syn.Terms, "/")+"」", standard).Scan(&exists); err != nil {
			return nil, err
		}
		if exists > 0 {
			continue
		}
		_, err := s.pool.Exec(ctx, `
			INSERT INTO onto_candidates (id, source, suggestion, kind, evidence, status, by, at)
			VALUES ($1,$2,$3,$4,$5,'待裁决','',$6)`,
			fmt.Sprintf("oc-%d-%s", time.Now().UnixNano()%1e6, standard),
			"同义词组「"+strings.Join(syn.Terms, "/")+"」", standard, "对象",
			fmt.Sprintf("标准词「%s」被 %d 个来源术语指向，尚未显式建模", standard, len(syn.Terms)), now)
		if err != nil {
			return nil, err
		}
		created++
	}
	if created == 0 {
		// 无新增也要有确定性反馈：返回现有待裁决
	}
	return s.ListCandidates(ctx, "待裁决")
}

// AdoptCandidate 采纳：对象类候选 → 创建 DRAFT 对象（幂等冲突返回既有）；其余类型仅标记。
func (s *Store) AdoptCandidate(ctx context.Context, id, by string) (OntoCandidate, error) {
	var c OntoCandidate
	err := s.pool.QueryRow(ctx, `
		SELECT id, source, suggestion, kind, evidence, status, by, at FROM onto_candidates WHERE id=$1 FOR UPDATE`,
		id).Scan(&c.ID, &c.Source, &c.Suggestion, &c.Kind, &c.Evidence, &c.Status, &c.By, &c.At)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrNotFound
	}
	if err != nil {
		return c, err
	}
	if c.Status == "已采纳" {
		return c, nil // 重放幂等
	}
	if c.Status == "已丢弃" {
		return c, fmt.Errorf("%w: 候选已丢弃，不可采纳", ErrConflict)
	}
	if c.Kind == "对象" {
		obj := Object{
			ID: "oc-" + c.ID, Name: c.Suggestion, En: c.Suggestion, Kind: "静态事实",
			Version: "v0.1", Status: "DRAFT", Owner: by, Ontology: "供应链本体",
			Props: []Prop{{Name: c.Suggestion + "编码", Type: "string", Comment: "收敛生成，待补全"}},
		}
		if _, _, err := s.CreateObject(ctx, obj); err != nil {
			return c, fmt.Errorf("创建对象草稿失败: %w", err)
		}
	}
	now := time.Now().Format("2006-01-02 15:04")
	if _, err := s.pool.Exec(ctx,
		`UPDATE onto_candidates SET status='已采纳', by=$2, at=$3 WHERE id=$1`, id, by, now); err != nil {
		return c, err
	}
	c.Status, c.By, c.At = "已采纳", by, now
	return c, nil
}

// DropCandidate 丢弃（幂等）。
func (s *Store) DropCandidate(ctx context.Context, id, by string) (OntoCandidate, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE onto_candidates SET status='已丢弃', by=$2, at=$3 WHERE id=$1 AND status='待裁决'`,
		id, by, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return OntoCandidate{}, err
	}
	if tag.RowsAffected() == 0 {
		var exists int
		_ = s.pool.QueryRow(ctx, `SELECT count(*) FROM onto_candidates WHERE id=$1`, id).Scan(&exists)
		if exists == 0 {
			return OntoCandidate{}, ErrNotFound
		}
	}
	c, err := s.getCandidate(ctx, id)
	return c, err
}

func (s *Store) getCandidate(ctx context.Context, id string) (OntoCandidate, error) {
	var c OntoCandidate
	err := s.pool.QueryRow(ctx,
		`SELECT id, source, suggestion, kind, evidence, status, by, at FROM onto_candidates WHERE id=$1`, id).
		Scan(&c.ID, &c.Source, &c.Suggestion, &c.Kind, &c.Evidence, &c.Status, &c.By, &c.At)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func (s *Store) ListAlignments(ctx context.Context, status string) ([]EntityAlignment, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, left_term, right_term, source_a, source_b, strategy, score, status, by, at
		FROM entity_alignments WHERE ($1 = '' OR status = $1) ORDER BY status, score DESC`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []EntityAlignment
	for rows.Next() {
		var a EntityAlignment
		if err := rows.Scan(&a.ID, &a.LeftTerm, &a.RightTerm, &a.SourceA, &a.SourceB,
			&a.Strategy, &a.Score, &a.Status, &a.By, &a.At); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// GenerateAlignments 确定性召回：同义词组内术语两两组合（来源标注 KB 术语表 × 同义词组），
// 已存在同 left/right 的不重复生成。相似度 = 编辑距离粗粒度映射（确定性）。
func (s *Store) GenerateAlignments(ctx context.Context) ([]EntityAlignment, error) {
	syns, err := s.ListSynonyms(ctx, "")
	if err != nil {
		return nil, err
	}
	now := time.Now().Format("2006-01-02 15:04")
	for _, syn := range syns {
		terms := syn.Terms
		for i := 0; i < len(terms); i++ {
			for j := i + 1; j < len(terms); j++ {
				a, b := terms[i], terms[j]
				if a == b || len(a) < 2 || len(b) < 2 {
					continue
				}
				strategy := "别名召回"
				if strings.Contains(a, b) || strings.Contains(b, a) {
					strategy = "包含召回"
				}
				var exists int
				if err := s.pool.QueryRow(ctx,
					`SELECT count(*) FROM entity_alignments WHERE left_term=$1 AND right_term=$2`, a, b).
					Scan(&exists); err != nil {
					return nil, err
				}
				if exists > 0 {
					continue
				}
				if _, err := s.pool.Exec(ctx, `
					INSERT INTO entity_alignments (id, left_term, right_term, source_a, source_b, strategy, score, status, by, at)
					VALUES ($1,$2,$3,'同义词组','同义词组',$4,$5,'待裁决','',$6)`,
					fmt.Sprintf("ea-%d-%d", time.Now().UnixNano()%1e6, i*10+j), a, b,
					strategy, similarityScore(a, b), now); err != nil {
					return nil, err
				}
			}
		}
	}
	return s.ListAlignments(ctx, "待裁决")
}

// DecideAlignment 裁决：merge → 已合并；drop → 已丢弃（均幂等，已决返回现状）。
func (s *Store) DecideAlignment(ctx context.Context, id, action, by string) (EntityAlignment, error) {
	next := "已合并"
	if action == "drop" {
		next = "已丢弃"
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE entity_alignments SET status=$2, by=$3, at=$4
		WHERE id=$1 AND status='待裁决'`, id, next, by, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return EntityAlignment{}, err
	}
	if tag.RowsAffected() == 0 {
		var exists int
		_ = s.pool.QueryRow(ctx, `SELECT count(*) FROM entity_alignments WHERE id=$1`, id).Scan(&exists)
		if exists == 0 {
			return EntityAlignment{}, ErrNotFound
		}
	}
	var a EntityAlignment
	err = s.pool.QueryRow(ctx, `
		SELECT id, left_term, right_term, source_a, source_b, strategy, score, status, by, at
		FROM entity_alignments WHERE id=$1`, id).
		Scan(&a.ID, &a.LeftTerm, &a.RightTerm, &a.SourceA, &a.SourceB, &a.Strategy, &a.Score, &a.Status, &a.By, &a.At)
	return a, err
}

// similarityScore 确定性相似度（0-100）：最长公共子串占比 × 100。
func similarityScore(a, b string) int {
	max := 0
	for i := 0; i < len(a); i++ {
		for j := i + 1; j <= len(a); j++ {
			if strings.Contains(b, a[i:j]) && j-i > max {
				max = j - i
			}
		}
	}
	score := max * 100 / maxInt(len(a), len(b))
	if score == 0 {
		score = 1
	}
	return score
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
