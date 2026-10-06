// M9 权限管理数据层：行级数据权限规则 CRUD（角色引用校验）与敏感级继承推导。
package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// DataRule 行级数据权限规则。
type DataRule struct {
	ID        string `json:"id"`
	Target    string `json:"target"`
	Rule      string `json:"rule"`
	Role      string `json:"role"`
	Effect    string `json:"effect"`
	UpdatedBy string `json:"updatedBy"`
	UpdatedAt string `json:"updatedAt"`
}

func (s *Store) ListDataRules(ctx context.Context) ([]DataRule, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, target, rule, role, effect, updated_by, updated_at FROM data_rules ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DataRule
	for rows.Next() {
		var r DataRule
		if err := rows.Scan(&r.ID, &r.Target, &r.Rule, &r.Role, &r.Effect, &r.UpdatedBy, &r.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// CreateDataRule 幂等创建（客户端 id）；绑定角色必须已存在。
func (s *Store) CreateDataRule(ctx context.Context, r DataRule) (DataRule, bool, error) {
	if err := s.checkRoles(ctx, []string{r.Role}); err != nil {
		return r, false, err
	}
	r.UpdatedAt = time.Now().Format("2006-01-02 15:04")
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO data_rules (id, target, rule, role, effect, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO NOTHING`,
		r.ID, r.Target, r.Rule, r.Role, r.Effect, r.UpdatedBy, r.UpdatedAt)
	if err != nil {
		return r, false, err
	}
	if tag.RowsAffected() == 0 {
		var existing DataRule
		err = s.pool.QueryRow(ctx, `
			SELECT id, target, rule, role, effect, updated_by, updated_at FROM data_rules WHERE id = $1`, r.ID).
			Scan(&existing.ID, &existing.Target, &existing.Rule, &existing.Role, &existing.Effect,
				&existing.UpdatedBy, &existing.UpdatedAt)
		return existing, false, err
	}
	return r, true, nil
}

// UpdateDataRule 更新（角色存在性校验；未知 404）。
func (s *Store) UpdateDataRule(ctx context.Context, r DataRule) (DataRule, error) {
	if err := s.checkRoles(ctx, []string{r.Role}); err != nil {
		return r, err
	}
	r.UpdatedAt = time.Now().Format("2006-01-02 15:04")
	err := s.pool.QueryRow(ctx, `
		UPDATE data_rules SET target = $2, rule = $3, role = $4, effect = $5, updated_by = $6, updated_at = $7
		WHERE id = $1
		RETURNING id, target, rule, role, effect, updated_by, updated_at`,
		r.ID, r.Target, r.Rule, r.Role, r.Effect, r.UpdatedBy, r.UpdatedAt).
		Scan(&r.ID, &r.Target, &r.Rule, &r.Role, &r.Effect, &r.UpdatedBy, &r.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}

// DeleteDataRule 删除（未知 404）。
func (s *Store) DeleteDataRule(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM data_rules WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SensRow 敏感级继承推导结果行。
type SensRow struct {
	Asset     string   `json:"asset"`     // 下游资产（视图名）
	Upstream  []string `json:"upstream"`  // 上游依赖（表(数据源)）
	Levels    []string `json:"levels"`    // 各上游数据源敏感级
	Inherited string   `json:"inherited"` // 继承敏感级（上游最高）
	Stored    string   `json:"stored"`    // 视图存量标注
	Note      string   `json:"note"`      // 规则说明
	By        string   `json:"by"`        // 来源（系统继承 / 显式指定）
}

// ListSensitivity 由 views.upstream × datasources.sensitive 实时推导：
// 每个上游项形如「表(数据源)」，取数据源敏感级；继承级 = max(L1,L2,L3)。
func (s *Store) ListSensitivity(ctx context.Context) ([]SensRow, error) {
	var dsSensitive = map[string]string{}
	rows, err := s.pool.Query(ctx, `SELECT name, sensitive FROM datasources`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var name, lv string
		if err := rows.Scan(&name, &lv); err != nil {
			return nil, err
		}
		dsSensitive[name] = lv
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	views, err := s.ListViews(ctx)
	if err != nil {
		return nil, err
	}
	var out []SensRow
	for _, v := range views {
		row := SensRow{Asset: v.Name, Upstream: v.Upstream, Stored: v.Sensitive, By: "系统继承"}
		for _, up := range v.Upstream {
			ds := up
			if i := strings.LastIndexByte(up, '('); i >= 0 && strings.HasSuffix(up, ")") {
				ds = up[i+1 : len(up)-1]
			}
			lv := dsSensitive[ds]
			row.Levels = append(row.Levels, ds+"("+lv+")")
			if rank(lv) > rank(row.Inherited) {
				row.Inherited = lv
			}
		}
		if row.Inherited == "" {
			row.Inherited = "L1"
		}
		row.Note = "取上游最高 " + row.Inherited
		if row.Stored != row.Inherited {
			row.Note = fmt.Sprintf("继承 %s ≠ 存量标注 %s，降敏需治理评审", row.Inherited, row.Stored)
		}
		out = append(out, row)
	}
	return out, nil
}

// rank 敏感级可比序：L1 < L2 < L3，未知按 L1 处理。
func rank(lv string) int {
	switch lv {
	case "L2":
		return 2
	case "L3":
		return 3
	default:
		return 1
	}
}
