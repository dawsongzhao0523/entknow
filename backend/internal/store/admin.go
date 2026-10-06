// 组织与权限：角色 CRUD（内置保护/引用保护）与用户创建/更新（账号唯一/角色引用完整）。
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type Role struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Descr   string   `json:"desc,omitempty"`
	Perms   []string `json:"perms"`
	BuiltIn bool     `json:"builtIn"`
}

func (s *Store) ListRoles(ctx context.Context) ([]Role, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, descr, perms, built_in FROM roles ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Descr, &r.Perms, &r.BuiltIn); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) getRole(ctx context.Context, id string) (Role, error) {
	var r Role
	err := s.pool.QueryRow(ctx, `SELECT id, name, descr, perms, built_in FROM roles WHERE id = $1`, id).
		Scan(&r.ID, &r.Name, &r.Descr, &r.Perms, &r.BuiltIn)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}

// CreateRole 幂等创建（客户端 id）。
func (s *Store) CreateRole(ctx context.Context, r Role) (Role, bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO roles (id, name, descr, perms, built_in) VALUES ($1, $2, $3, $4, false)
		ON CONFLICT (id) DO NOTHING`, r.ID, r.Name, r.Descr, normNil(r.Perms))
	if err != nil {
		return r, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getRole(ctx, r.ID)
		return existing, false, err
	}
	r.Perms = normNil(r.Perms)
	return r, true, nil
}

// UpdateRole 更新 name/descr/perms。
func (s *Store) UpdateRole(ctx context.Context, r Role) (Role, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE roles SET name = $2, descr = $3, perms = $4 WHERE id = $1
		RETURNING id, name, descr, perms, built_in`,
		r.ID, r.Name, r.Descr, normNil(r.Perms)).
		Scan(&r.ID, &r.Name, &r.Descr, &r.Perms, &r.BuiltIn)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}

// DeleteRole：内置 400；被用户引用 409；正常删除。
func (s *Store) DeleteRole(ctx context.Context, id string) error {
	r, err := s.getRole(ctx, id)
	if err != nil {
		return err
	}
	if r.BuiltIn {
		return fmt.Errorf("%w: 内置角色「%s」不可删除", ErrInvalid, r.Name)
	}
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM users WHERE $1 = ANY(roles)`, r.Name).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%w: 角色「%s」仍被 %d 个用户引用", ErrConflict, r.Name, n)
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM roles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreateUser 幂等创建（id）；同 account 不同 id → 409。
func (s *Store) CreateUser(ctx context.Context, u User) (User, bool, error) {
	if err := s.checkRoles(ctx, u.Roles); err != nil {
		return u, false, err
	}
	if u.Status == "" {
		u.Status = "正常"
	}
	u.LastLogin = ""
	// 账号唯一：先查后插（管理操作并发极低，足够；id 幂等冲突仍回读）
	var existID string
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE account = $1`, u.Account).Scan(&existID)
	if err == nil && existID != u.ID {
		return u, false, fmt.Errorf("%w: 账号 %s 已被用户 %s 占用", ErrConflict, u.Account, existID)
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return u, false, err
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, account, name, dept, post, roles, status, last_login)
		VALUES ($1, $2, $3, $4, $5, $6, $7, '')
		ON CONFLICT (id) DO NOTHING`,
		u.ID, u.Account, u.Name, u.Dept, u.Post, normNil(u.Roles), u.Status)
	if err != nil {
		return u, false, err
	}
	if tag.RowsAffected() == 0 { // id 冲突：幂等重放回读
		var existing User
		err = s.pool.QueryRow(ctx, `
			SELECT id, account, name, dept, post, roles, status, last_login FROM users WHERE id = $1`, u.ID).
			Scan(&existing.ID, &existing.Account, &existing.Name, &existing.Dept, &existing.Post,
				&existing.Roles, &existing.Status, &existing.LastLogin)
		return existing, false, err
	}
	return u, true, nil
}

// UpdateUser 编辑（角色存在性 400；status ∈ 正常/停用 由 API 层校验）。
func (s *Store) UpdateUser(ctx context.Context, u User) (User, error) {
	if err := s.checkRoles(ctx, u.Roles); err != nil {
		return u, err
	}
	u.LastLogin = time.Now().Format("2006-01-02 15:04") // 展示最近变更时间
	err := s.pool.QueryRow(ctx, `
		UPDATE users SET account = $2, name = $3, dept = $4, post = $5, roles = $6, status = $7, last_login = $8
		WHERE id = $1
		RETURNING id, account, name, dept, post, roles, status, last_login`,
		u.ID, u.Account, u.Name, u.Dept, u.Post, normNil(u.Roles), u.Status, u.LastLogin).
		Scan(&u.ID, &u.Account, &u.Name, &u.Dept, &u.Post, &u.Roles, &u.Status, &u.LastLogin)
	if errors.Is(err, pgx.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}

// checkRoles 校验 roles 中的每个角色名都已存在。
func (s *Store) checkRoles(ctx context.Context, names []string) error {
	for _, n := range names {
		var cnt int
		if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM roles WHERE name = $1`, n).Scan(&cnt); err != nil {
			return err
		}
		if cnt == 0 {
			return fmt.Errorf("%w: 角色「%s」不存在，请先创建", ErrInvalid, n)
		}
	}
	return nil
}
