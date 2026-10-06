// 语义查询：统一检索（对象/知识/实例/同义词）与查询执行历史（幂等）。
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// SearchResultItem 统一检索结果项（label 展示，sub 辅助说明）。
type SearchResultItem struct {
	Label string `json:"label"`
	Sub   string `json:"sub,omitempty"`
}

// SearchResults 分类检索结果。
type SearchResults struct {
	Objects   []SearchResultItem `json:"objects"`
	Knowledge []SearchResultItem `json:"knowledge"`
	Instances []SearchResultItem `json:"instances"`
	Synonyms  []SearchResultItem `json:"synonyms"`
}

// QueryRecord 查询历史记录。
type QueryRecord struct {
	ID        string `json:"id"`
	Question  string `json:"question"`
	DSL       string `json:"dsl"`
	Hits      int    `json:"hits"`
	LatencyMs int    `json:"latencyMs"`
	By        string `json:"by"`
	At        string `json:"at"`
}

// ExecutedQuery 查询执行的完整响应。
type ExecutedQuery struct {
	QueryRecord
	Results SearchResults `json:"results"`
}

// Search 统一关键词检索（确定性内核；LLM 语义映射后续经 Utopia/MCP 接入）。
func (s *Store) Search(ctx context.Context, q string) (SearchResults, error) {
	var out SearchResults
	like := "%" + q + "%"

	rows, err := s.pool.Query(ctx, `
		SELECT name, en || ' · ' || COALESCE(mapping, '') FROM objects
		WHERE name ILIKE $1 OR en ILIKE $1 OR mapping ILIKE $1 OR props::text ILIKE $1
		ORDER BY id LIMIT 20`, like)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var it SearchResultItem
		if err := rows.Scan(&it.Label, &it.Sub); err != nil {
			return out, err
		}
		out.Objects = append(out.Objects, it)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	rows2, err := s.pool.Query(ctx, `
		SELECT title, domain_id || ' · ' || status FROM kb_entries
		WHERE status <> '已失效' AND (title ILIKE $1 OR terms::text ILIKE $1 OR mode ILIKE $1)
		ORDER BY id LIMIT 20`, like)
	if err != nil {
		return out, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var it SearchResultItem
		if err := rows2.Scan(&it.Label, &it.Sub); err != nil {
			return out, err
		}
		out.Knowledge = append(out.Knowledge, it)
	}
	if err := rows2.Err(); err != nil {
		return out, err
	}

	rows3, err := s.pool.Query(ctx, `
		SELECT id, status || ' · 风险分 ' || risk_score FROM instances
		WHERE id ILIKE $1 OR props::text ILIKE $1
		ORDER BY id LIMIT 20`, like)
	if err != nil {
		return out, err
	}
	defer rows3.Close()
	for rows3.Next() {
		var it SearchResultItem
		if err := rows3.Scan(&it.Label, &it.Sub); err != nil {
			return out, err
		}
		out.Instances = append(out.Instances, it)
	}
	if err := rows3.Err(); err != nil {
		return out, err
	}

	rows4, err := s.pool.Query(ctx, `
		SELECT array_to_string(terms, ' ≈ '), status FROM synonyms
		WHERE array_to_string(terms, ' ') ILIKE $1 OR standard ILIKE $1
		ORDER BY id LIMIT 20`, like)
	if err != nil {
		return out, err
	}
	defer rows4.Close()
	for rows4.Next() {
		var it SearchResultItem
		if err := rows4.Scan(&it.Label, &it.Sub); err != nil {
			return out, err
		}
		out.Synonyms = append(out.Synonyms, it)
	}
	return out, rows4.Err()
}

func (r SearchResults) total() int {
	return len(r.Objects) + len(r.Knowledge) + len(r.Instances) + len(r.Synonyms)
}

// buildDSL 命中驱动的确定性 DSL 模板（重点域 = 命中最多者，平票取先序）。
func buildDSL(q string, r SearchResults) string {
	main, max := "对象", len(r.Objects)
	if len(r.Knowledge) > max {
		main, max = "知识", len(r.Knowledge)
	}
	if len(r.Instances) > max {
		main, max = "实例", len(r.Instances)
	}
	if len(r.Synonyms) > max {
		main = "同义词"
	}
	return fmt.Sprintf("检索「%s」→ MATCH 对象×%d, 知识×%d, 实例×%d, 同义词×%d RETURN 语义切片；重点域: %s",
		q, len(r.Objects), len(r.Knowledge), len(r.Instances), len(r.Synonyms), main)
}

// ExecuteQuery 执行查询：检索 + DSL + 延迟 + 幂等历史。
func (s *Store) ExecuteQuery(ctx context.Context, rec QueryRecord) (ExecutedQuery, error) {
	start := time.Now()
	results, err := s.Search(ctx, rec.Question)
	if err != nil {
		return ExecutedQuery{}, err
	}
	rec.DSL = buildDSL(rec.Question, results)
	rec.Hits = results.total()
	rec.LatencyMs = int(time.Since(start).Milliseconds())
	rec.At = time.Now().Format("2006-01-02 15:04:05")

	tag, err := s.pool.Exec(ctx, `
		INSERT INTO query_history (id, question, dsl, hits, latency_ms, by_user, at)
		VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
		rec.ID, rec.Question, rec.DSL, rec.Hits, rec.LatencyMs, rec.By, rec.At)
	if err != nil {
		return ExecutedQuery{}, err
	}
	if tag.RowsAffected() == 0 { // 幂等重放：返回既有记录
		existing, err := s.getQuery(ctx, rec.ID)
		if err != nil {
			return ExecutedQuery{}, err
		}
		// 重放时重新检索以呈现当前结果（历史字段以落库为准）
		return ExecutedQuery{QueryRecord: existing, Results: results}, nil
	}
	return ExecutedQuery{QueryRecord: rec, Results: results}, nil
}

func (s *Store) getQuery(ctx context.Context, id string) (QueryRecord, error) {
	var r QueryRecord
	err := s.pool.QueryRow(ctx, `
		SELECT id, question, dsl, hits, latency_ms, by_user, at FROM query_history WHERE id = $1`, id).
		Scan(&r.ID, &r.Question, &r.DSL, &r.Hits, &r.LatencyMs, &r.By, &r.At)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}

// ListQueries 查询历史（倒序，by 过滤，默认 50 条）。
func (s *Store) ListQueries(ctx context.Context, by string, limit int) ([]QueryRecord, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, question, dsl, hits, latency_ms, by_user, at FROM query_history
		WHERE ($1 = '' OR by_user = $1) ORDER BY at DESC, id LIMIT $2`, by, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []QueryRecord
	for rows.Next() {
		var r QueryRecord
		if err := rows.Scan(&r.ID, &r.Question, &r.DSL, &r.Hits, &r.LatencyMs, &r.By, &r.At); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
