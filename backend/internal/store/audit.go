// 审计日志：写操作审计落库与过滤分页查询。
package store

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// AuditLog 审计事件（写操作自动记录 + seed 叙事）。
type AuditLog struct {
	ID       int    `json:"id"`
	At       string `json:"at"`
	Module   string `json:"module"`
	Level    string `json:"level"` // INFO | WARN | ERROR
	Operator string `json:"operator"`
	Content  string `json:"content"`
	TraceID  string `json:"traceId"`
}

// AuditPage 过滤分页结果。
type AuditPage struct {
	Total int        `json:"total"`
	Items []AuditLog `json:"items"`
}

// InsertAudit 落一条审计事件（at 由调用方给定便于测试；失败仅返回错误，由中间件记日志不阻塞业务）。
func (s *Store) InsertAudit(ctx context.Context, e AuditLog) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO audit_logs (at, module, level, operator, content, trace_id)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		e.At, e.Module, e.Level, e.Operator, e.Content, e.TraceID)
	return err
}

// NowString 统一的审计时间格式。
func NowString() string { return time.Now().Format("2006-01-02 15:04:05") }

// QueryAuditLogs 过滤分页：module/level 精确、kw 匹配内容或 TraceID 包含、since 起始时间（含）；
// 时间倒序。limit 默认 20、上限 200；offset 默认 0。
func (s *Store) QueryAuditLogs(ctx context.Context, module, level, kw, since string, limit, offset int) (AuditPage, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	where := "WHERE 1=1"
	args := []any{}
	if module != "" {
		args = append(args, module)
		where += fmt.Sprintf(" AND module = $%d", len(args))
	}
	if level != "" {
		args = append(args, level)
		where += fmt.Sprintf(" AND level = $%d", len(args))
	}
	if kw != "" {
		args = append(args, "%"+kw+"%")
		where += fmt.Sprintf(" AND (content ILIKE $%d OR trace_id ILIKE $%d)", len(args), len(args))
	}
	if since != "" {
		args = append(args, normalizeSince(since))
		where += fmt.Sprintf(" AND at >= $%d", len(args))
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs `+where, args...).Scan(&total); err != nil {
		return AuditPage{}, err
	}

	q := `SELECT id, at, module, level, operator, content, trace_id FROM audit_logs ` +
		where + fmt.Sprintf(" ORDER BY at DESC, id DESC LIMIT %d OFFSET %d", limit, offset)
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return AuditPage{}, err
	}
	defer rows.Close()
	items := []AuditLog{}
	for rows.Next() {
		var e AuditLog
		if err := rows.Scan(&e.ID, &e.At, &e.Module, &e.Level, &e.Operator, &e.Content, &e.TraceID); err != nil {
			return AuditPage{}, err
		}
		items = append(items, e)
	}
	return AuditPage{Total: total, Items: items}, rows.Err()
}

// normalizeSince 宽松接受日期或日期时间，规整为可比较的字符串前缀。
func normalizeSince(since string) string {
	since = strings.TrimSpace(since)
	if since == "" {
		return ""
	}
	if len(since) == 10 { // 仅日期
		return since + " 00:00:00"
	}
	return since
}
