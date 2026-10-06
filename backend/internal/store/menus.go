// 菜单管理：两级菜单树的查询（按用户角色权限过滤）、幂等创建、更新与删除（子菜单保护）。
package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// Menu 菜单节点；树形输出时父节点携带 children。
type Menu struct {
	ID       string `json:"id"`
	ParentID string `json:"parentId"`
	Name     string `json:"name"`
	Route    string `json:"route"`
	Icon     string `json:"icon"`
	Sort     int    `json:"sort"`
	Visible  bool   `json:"visible"`
	Children []Menu `json:"children,omitempty"`
}

// ListMenus 返回两级菜单树（visible=false 的节点不返回）。
// user 非空时按该用户角色的 perms 并集过滤一级模块（无任何角色或 perms 为空则不过滤）。
func (s *Store) ListMenus(ctx context.Context, user string) ([]Menu, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, parent_id, name, route, icon, sort, visible FROM menus ORDER BY sort, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var all []Menu
	for rows.Next() {
		var m Menu
		if err := rows.Scan(&m.ID, &m.ParentID, &m.Name, &m.Route, &m.Icon, &m.Sort, &m.Visible); err != nil {
			return nil, err
		}
		all = append(all, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	allowed := map[string]bool{}
	if user != "" {
		if err := s.UserModulePerms(ctx, user, allowed); err != nil {
			return nil, err
		}
	}

	var tree []Menu
	for _, m := range all {
		if !m.Visible || m.ParentID != "" {
			continue
		}
		if user != "" && len(allowed) > 0 && !allowed[m.ID] {
			continue
		}
		for _, c := range all {
			if c.ParentID == m.ID && c.Visible {
				m.Children = append(m.Children, c)
			}
		}
		tree = append(tree, m)
	}
	return tree, nil
}

// UserModulePerms 汇总用户全部角色的模块权限（roles.name 匹配 users.roles 任一元素）。
func (s *Store) UserModulePerms(ctx context.Context, user string, out map[string]bool) error {
	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT unnest(r.perms) FROM roles r
		WHERE r.name = ANY (SELECT unnest(roles) FROM users WHERE account = $1)`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return err
		}
		out[p] = true
	}
	return rows.Err()
}

// CreateMenu 幂等创建（客户端 id）。
func (s *Store) CreateMenu(ctx context.Context, m Menu) (Menu, bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO menus (id, parent_id, name, route, icon, sort, visible)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO NOTHING`,
		m.ID, m.ParentID, m.Name, m.Route, m.Icon, m.Sort, m.Visible)
	if err != nil {
		return m, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getMenu(ctx, m.ID)
		return existing, false, err
	}
	return m, true, nil
}

func (s *Store) getMenu(ctx context.Context, id string) (Menu, error) {
	var m Menu
	err := s.pool.QueryRow(ctx,
		`SELECT id, parent_id, name, route, icon, sort, visible FROM menus WHERE id = $1`, id).
		Scan(&m.ID, &m.ParentID, &m.Name, &m.Route, &m.Icon, &m.Sort, &m.Visible)
	if errors.Is(err, pgx.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

// UpdateMenu 更新 name/route/icon/sort/visible（parent 不可移动，保持树稳定）。
func (s *Store) UpdateMenu(ctx context.Context, m Menu) (Menu, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE menus SET name = $2, route = $3, icon = $4, sort = $5, visible = $6
		WHERE id = $1
		RETURNING id, parent_id, name, route, icon, sort, visible`,
		m.ID, m.Name, m.Route, m.Icon, m.Sort, m.Visible).
		Scan(&m.ID, &m.ParentID, &m.Name, &m.Route, &m.Icon, &m.Sort, &m.Visible)
	if errors.Is(err, pgx.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

// DeleteMenu：仍有子菜单 → 409；正常删除。
func (s *Store) DeleteMenu(ctx context.Context, id string) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM menus WHERE parent_id = $1`, id).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%w: 菜单「%s」下仍有 %d 个子菜单，请先删除子菜单", ErrConflict, id, n)
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM menus WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
