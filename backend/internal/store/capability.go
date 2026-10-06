// 能力出口：目录 CRUD、调用记录（幂等）与统计真实化（base_calls + 日志数）。
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// CapabilityCall 一次真实调用记录。
type CapabilityCall struct {
	ID           string `json:"id"`
	CapabilityID string `json:"capabilityId"`
	Caller       string `json:"caller"`
	Status       string `json:"status"`
	LatencyMs    int    `json:"latencyMs"`
	CalledAt     string `json:"calledAt"`
}

const capAggCols = `c.id, c.name, c.description, c.proto, c.owner,
	c.base_calls + (SELECT count(*) FROM capability_calls l WHERE l.capability_id = c.id) AS total,
	(SELECT count(*) FROM capability_calls l WHERE l.capability_id = c.id) AS real_calls`

func scanCapability(row pgx.Row) (Capability, error) {
	var c Capability
	var total, real int
	err := row.Scan(&c.ID, &c.Name, &c.Desc, &c.Proto, &c.Owner, &total, &real)
	if err != nil {
		return c, err
	}
	c.CallsTotal, c.RealCalls = total, real
	c.Calls = fmt.Sprintf("%d", total) // 前端格式化展示；保留字段兼容
	return c, nil
}

func thousandSep(n int) string {
	s := fmt.Sprintf("%d", n)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "," + s[i:]
	}
	return s
}

// ListCapabilities 统计真实化后的目录（calls 千分位字符串 + callsTotal/realCalls 数值）。
func (s *Store) ListCapabilities(ctx context.Context) ([]Capability, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+capAggCols+` FROM capabilities c ORDER BY c.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Capability
	for rows.Next() {
		c, err := scanCapability(rows)
		if err != nil {
			return nil, err
		}
		c.Calls = thousandSep(c.CallsTotal)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) getCapability(ctx context.Context, id string) (Capability, error) {
	c, err := scanCapability(s.pool.QueryRow(ctx, `SELECT `+capAggCols+` FROM capabilities c WHERE c.id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrNotFound
	}
	if err == nil {
		c.Calls = thousandSep(c.CallsTotal)
	}
	return c, err
}

// CreateCapability 幂等注册。
func (s *Store) CreateCapability(ctx context.Context, c Capability) (Capability, bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO capabilities (id, name, description, proto, calls, owner, base_calls)
		VALUES ($1, $2, $3, $4, '', $5, 0) ON CONFLICT (id) DO NOTHING`,
		c.ID, c.Name, c.Desc, c.Proto, c.Owner)
	if err != nil {
		return c, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getCapability(ctx, c.ID)
		return existing, false, err
	}
	out, err := s.getCapability(ctx, c.ID)
	return out, true, err
}

// UpdateCapability 编辑 name/desc/proto/owner。
func (s *Store) UpdateCapability(ctx context.Context, c Capability) (Capability, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE capabilities SET name = $2, description = $3, proto = $4, owner = $5
		WHERE id = $1`, c.ID, c.Name, c.Desc, c.Proto, c.Owner)
	if err != nil {
		return c, err
	}
	if tag.RowsAffected() == 0 {
		return c, ErrNotFound
	}
	return s.getCapability(ctx, c.ID)
}

// DeleteCapability 单事务删除能力及其全部调用日志。
func (s *Store) DeleteCapability(ctx context.Context, id string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `DELETE FROM capabilities WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	if _, err := tx.Exec(ctx, `DELETE FROM capability_calls WHERE capability_id = $1`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// InvokeCapability 记录一次调用（幂等），返回更新后的能力。
func (s *Store) InvokeCapability(ctx context.Context, call CapabilityCall) (Capability, error) {
	if _, err := s.getCapability(ctx, call.CapabilityID); err != nil {
		return Capability{}, err // 404
	}
	if call.Status == "" {
		call.Status = "ok"
	}
	if call.CalledAt == "" {
		call.CalledAt = time.Now().Format("2006-01-02 15:04:05")
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO capability_calls (id, capability_id, caller, status, latency_ms, called_at)
		VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
		call.ID, call.CapabilityID, call.Caller, call.Status, call.LatencyMs, call.CalledAt); err != nil {
		return Capability{}, err
	}
	return s.getCapability(ctx, call.CapabilityID)
}

// ListCapabilityCalls 最近调用（倒序，默认 20 条）。
func (s *Store) ListCapabilityCalls(ctx context.Context, capabilityID string, limit int) ([]CapabilityCall, error) {
	if _, err := s.getCapability(ctx, capabilityID); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, capability_id, caller, status, latency_ms, called_at FROM capability_calls
		WHERE capability_id = $1 ORDER BY called_at DESC, id LIMIT $2`, capabilityID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CapabilityCall
	for rows.Next() {
		var c CapabilityCall
		if err := rows.Scan(&c.ID, &c.CapabilityID, &c.Caller, &c.Status, &c.LatencyMs, &c.CalledAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
