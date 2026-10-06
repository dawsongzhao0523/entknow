// 系统日志（可观测性）：运行时事件查询与各引擎路径的实时发射（best-effort，失败不阻塞业务）。
package store

import (
	"context"
	"fmt"
	"strings"
)

// SystemLog 运行时事件。
type SystemLog struct {
	ID        int    `json:"id"`
	At        string `json:"at"`
	Level     string `json:"level"` // INFO | WARN | ERROR
	Component string `json:"component"`
	Content   string `json:"content"`
	TraceID   string `json:"traceId"`
}

// SystemLogPage 过滤分页结果。
type SystemLogPage struct {
	Total int         `json:"total"`
	Items []SystemLog `json:"items"`
}

// EmitSystemLog 写一条系统日志（失败仅返回错误由调用方记日志，不阻塞业务）。
func (s *Store) EmitSystemLog(ctx context.Context, level, component, content string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO system_logs (at, level, component, content, trace_id)
		VALUES ($1, $2, $3, $4, $5)`,
		NowString()[:len("2006-01-02 15:04:05")], level, component, content, "")
	return err
}

// QuerySystemLogs 过滤分页：level/component 精确、kw 匹配内容或 TraceID、since 起始时间；时间倒序。
func (s *Store) QuerySystemLogs(ctx context.Context, level, component, kw, since string, limit, offset int) (SystemLogPage, error) {
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
	if level != "" {
		args = append(args, level)
		where += fmt.Sprintf(" AND level = $%d", len(args))
	}
	if component != "" {
		args = append(args, component)
		where += fmt.Sprintf(" AND component = $%d", len(args))
	}
	if kw != "" {
		args = append(args, "%"+kw+"%")
		where += fmt.Sprintf(" AND (content ILIKE $%d OR trace_id ILIKE $%d)", len(args), len(args))
	}
	if since != "" {
		since = strings.TrimSpace(since)
		if len(since) == 10 {
			since += " 00:00:00"
		}
		args = append(args, since)
		where += fmt.Sprintf(" AND at >= $%d", len(args))
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM system_logs `+where, args...).Scan(&total); err != nil {
		return SystemLogPage{}, err
	}
	q := `SELECT id, at, level, component, content, trace_id FROM system_logs ` +
		where + fmt.Sprintf(" ORDER BY at DESC, id DESC LIMIT %d OFFSET %d", limit, offset)
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return SystemLogPage{}, err
	}
	defer rows.Close()
	items := []SystemLog{}
	for rows.Next() {
		var e SystemLog
		if err := rows.Scan(&e.ID, &e.At, &e.Level, &e.Component, &e.Content, &e.TraceID); err != nil {
			return SystemLogPage{}, err
		}
		items = append(items, e)
	}
	return SystemLogPage{Total: total, Items: items}, rows.Err()
}
