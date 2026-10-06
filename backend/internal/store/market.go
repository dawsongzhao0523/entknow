// 数据集市：可消费资产目录 CRUD 与权限申请审批。
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// MarketItem 集市资产。
type MarketItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Comment     string `json:"comment"`
	Type        string `json:"type"` // 表 | VIEW | API | KB 文档 | 代码索引
	Source      string `json:"source"`
	Domain      string `json:"domain"`
	Sensitive   string `json:"sensitive"`
	Owner       string `json:"owner"`
	Freq        string `json:"freq"`
	Status      string `json:"status"` // 上架 | 审核中 | 下架
	Subscribers int    `json:"subscribers"`
}

// MarketRequest 权限申请。
type MarketRequest struct {
	ID        string `json:"id"`
	ItemID    string `json:"itemId"`
	ItemName  string `json:"itemName"`
	Applicant string `json:"applicant"`
	Reason    string `json:"reason"`
	Status    string `json:"status"` // 待审批 | 已通过 | 已驳回
	At        string `json:"at"`
}

func (s *Store) ListMarketItems(ctx context.Context) ([]MarketItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, comment, type, source, domain, sensitive, owner, freq, status, subscribers
		FROM market_items ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MarketItem
	for rows.Next() {
		var m MarketItem
		if err := rows.Scan(&m.ID, &m.Name, &m.Comment, &m.Type, &m.Source, &m.Domain,
			&m.Sensitive, &m.Owner, &m.Freq, &m.Status, &m.Subscribers); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// CreateMarketItem 幂等创建（客户端 id）。
func (s *Store) CreateMarketItem(ctx context.Context, m MarketItem) (MarketItem, bool, error) {
	if m.Status == "" {
		m.Status = "审核中"
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO market_items (id, name, comment, type, source, domain, sensitive, owner, freq, status, subscribers)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0)
		ON CONFLICT (id) DO NOTHING`,
		m.ID, m.Name, m.Comment, m.Type, m.Source, m.Domain, m.Sensitive, m.Owner, m.Freq, m.Status)
	if err != nil {
		return m, false, err
	}
	if tag.RowsAffected() == 0 {
		return m, false, nil // 幂等重放：返回零值由 API 层回读
	}
	return m, true, nil
}

// UpdateMarketItem 编辑（未知 404）。
func (s *Store) UpdateMarketItem(ctx context.Context, m MarketItem) (MarketItem, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE market_items SET name=$2, comment=$3, type=$4, source=$5, domain=$6,
		       sensitive=$7, owner=$8, freq=$9, status=$10
		WHERE id=$1 RETURNING id, name, comment, type, source, domain, sensitive, owner, freq, status, subscribers`,
		m.ID, m.Name, m.Comment, m.Type, m.Source, m.Domain, m.Sensitive, m.Owner, m.Freq, m.Status).
		Scan(&m.ID, &m.Name, &m.Comment, &m.Type, &m.Source, &m.Domain,
			&m.Sensitive, &m.Owner, &m.Freq, &m.Status, &m.Subscribers)
	if errors.Is(err, pgx.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

// DeleteMarketItem 删除（有未审批申请 409）。
func (s *Store) DeleteMarketItem(ctx context.Context, id string) error {
	var n int
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM market_requests WHERE item_id=$1 AND status='待审批'`, id).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%w: 资产「%s」仍有 %d 条待审批申请", ErrConflict, id, n)
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM market_items WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListMarketRequests 申请列表（join 资产名）。
func (s *Store) ListMarketRequests(ctx context.Context) ([]MarketRequest, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT r.id, r.item_id, COALESCE(i.name, '（已删除）'), r.applicant, r.reason, r.status, r.at
		FROM market_requests r LEFT JOIN market_items i ON i.id = r.item_id
		ORDER BY r.status, r.at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MarketRequest
	for rows.Next() {
		var r MarketRequest
		if err := rows.Scan(&r.ID, &r.ItemID, &r.ItemName, &r.Applicant, &r.Reason, &r.Status, &r.At); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// CreateMarketRequest 幂等创建；资产不存在或非上架 → 400；同资产同人待审批重复 → 409。
func (s *Store) CreateMarketRequest(ctx context.Context, r MarketRequest) (MarketRequest, bool, error) {
	var status string
	err := s.pool.QueryRow(ctx, `SELECT status FROM market_items WHERE id=$1`, r.ItemID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, false, fmt.Errorf("%w: 资产 %s 不存在", ErrInvalid, r.ItemID)
	}
	if err != nil {
		return r, false, err
	}
	if status != "上架" {
		return r, false, fmt.Errorf("%w: 资产状态为「%s」，仅上架资产可申请", ErrInvalid, status)
	}
	var n int
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM market_requests WHERE item_id=$1 AND applicant=$2 AND status='待审批'`,
		r.ItemID, r.Applicant).Scan(&n); err != nil {
		return r, false, err
	}
	if n > 0 {
		return r, false, fmt.Errorf("%w: 你对该资产已有待审批申请", ErrConflict)
	}
	r.Status, r.At = "待审批", time.Now().Format("2006-01-02 15:04")
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO market_requests (id, item_id, applicant, reason, status, at)
		VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
		r.ID, r.ItemID, r.Applicant, r.Reason, r.Status, r.At)
	if err != nil {
		return r, false, err
	}
	return r, tag.RowsAffected() > 0, nil
}

// DecideMarketRequest 审批：approve → 已通过 + subscribers+1；reject → 已驳回；已决重放幂等返回。
func (s *Store) DecideMarketRequest(ctx context.Context, id, action string) (MarketRequest, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MarketRequest{}, err
	}
	defer tx.Rollback(ctx)

	var r MarketRequest
	var itemName string
	err = tx.QueryRow(ctx, `
		SELECT r.id, r.item_id, i.name, r.applicant, r.reason, r.status, r.at
		FROM market_requests r JOIN market_items i ON i.id = r.item_id
		WHERE r.id=$1 FOR UPDATE`, id).
		Scan(&r.ID, &r.ItemID, &itemName, &r.Applicant, &r.Reason, &r.Status, &r.At)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	if err != nil {
		return r, err
	}
	if r.Status != "待审批" {
		return r, nil // 同向重放：幂等返回现状
	}
	if action == "approve" {
		r.Status = "已通过"
		if _, err := tx.Exec(ctx, `UPDATE market_items SET subscribers = subscribers + 1 WHERE id=$1`, r.ItemID); err != nil {
			return r, err
		}
	} else {
		r.Status = "已驳回"
	}
	if _, err := tx.Exec(ctx, `UPDATE market_requests SET status=$2 WHERE id=$1`, id, r.Status); err != nil {
		return r, err
	}
	if err := tx.Commit(ctx); err != nil {
		return r, err
	}
	r.ItemName = itemName
	return r, nil
}
