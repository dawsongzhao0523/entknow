// 推演沙盘：分支（假设/风险对比）、模拟（last-wins）、回滚（生产隔离）。
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type SandboxBranch struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Hypothesis   string `json:"hypothesis"`
	BaseInstance string `json:"baseInstance,omitempty"`
	RiskBefore   int    `json:"riskBefore"`
	RiskAfter    *int   `json:"riskAfter,omitempty"` // nil = 未推演
	Cost         string `json:"cost,omitempty"`
	Note         string `json:"note,omitempty"`
	Status       string `json:"status"`
	By           string `json:"by,omitempty"`
	At           string `json:"at,omitempty"`
}

func (s *Store) ListSandboxBranches(ctx context.Context) ([]SandboxBranch, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, hypothesis, base_instance, risk_before, risk_after, cost, note, status, by_user, at
		FROM sandbox_branches ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SandboxBranch
	for rows.Next() {
		b, err := scanBranch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func scanBranch(row rowScanner) (SandboxBranch, error) {
	var b SandboxBranch
	err := row.Scan(&b.ID, &b.Name, &b.Hypothesis, &b.BaseInstance, &b.RiskBefore,
		&b.RiskAfter, &b.Cost, &b.Note, &b.Status, &b.By, &b.At)
	return b, err
}

func (s *Store) getBranch(ctx context.Context, id string) (SandboxBranch, error) {
	b, err := scanBranch(s.pool.QueryRow(ctx, `
		SELECT id, name, hypothesis, base_instance, risk_before, risk_after, cost, note, status, by_user, at
		FROM sandbox_branches WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return b, ErrNotFound
	}
	return b, err
}

// CreateSandboxBranch 幂等建分支；riskBefore 缺省时取基准实例当前风险分（实例不存在则 0）。
func (s *Store) CreateSandboxBranch(ctx context.Context, b SandboxBranch) (SandboxBranch, bool, error) {
	if b.RiskBefore == 0 && b.BaseInstance != "" {
		_ = s.pool.QueryRow(ctx, `SELECT risk_score FROM instances WHERE id = $1`, b.BaseInstance).
			Scan(&b.RiskBefore) // 实例不存在（离线沙盘） tolerated
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO sandbox_branches (id, name, hypothesis, base_instance, risk_before, cost, note, status, by_user, at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'推演中',$8,$9) ON CONFLICT (id) DO NOTHING`,
		b.ID, b.Name, b.Hypothesis, b.BaseInstance, b.RiskBefore, b.Cost, b.Note,
		b.By, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return b, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getBranch(ctx, b.ID)
		return existing, false, err
	}
	b.Status = "推演中"
	return b, true, nil
}

// SimulateBranch 记录推演结果（last-wins，可重跑）；已回滚分支 409。
func (s *Store) SimulateBranch(ctx context.Context, id string, riskAfter int, cost, note, by string) (SandboxBranch, error) {
	b, err := s.getBranch(ctx, id)
	if err != nil {
		return b, err
	}
	if b.Status == "已回滚" {
		return b, fmt.Errorf("%w: 分支「%s」已回滚（世界已销毁），不可再推演", ErrConflict, b.Name)
	}
	if riskAfter < 0 || riskAfter > 100 {
		return b, fmt.Errorf("%w: riskAfter 必须在 [0,100]", ErrInvalid)
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE sandbox_branches SET risk_after=$2, cost=$3, note=$4, status='已对比', by_user=$5, at=$6
		WHERE id=$1`, id, riskAfter, cost, note, by, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return b, err
	}
	return s.getBranch(ctx, id)
}

// RollbackBranch 生产隔离：分支作废，不产生任何生产写入；重复回滚幂等。
func (s *Store) RollbackBranch(ctx context.Context, id, by string) (SandboxBranch, error) {
	b, err := s.getBranch(ctx, id)
	if err != nil {
		return b, err
	}
	if b.Status == "已回滚" { // 幂等重放
		return b, nil
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE sandbox_branches SET status='已回滚', by_user=$2, at=$3 WHERE id=$1`,
		id, by, time.Now().Format("2006-01-02 15:04"))
	if err != nil {
		return b, err
	}
	return s.getBranch(ctx, id)
}
