// 组织架构与岗位字典：树/列表 CRUD（引用保护、重命名联动用户）与从现有用户数据的归集同步。
package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// OrgUnit 组织节点（树形输出时携带 children 与全路径）。
type OrgUnit struct {
	ID       string    `json:"id"`
	ParentID string    `json:"parentId"`
	Name     string    `json:"name"`
	Sort     int       `json:"sort"`
	Path     string    `json:"path"`
	Children []OrgUnit `json:"children,omitempty"`
}

// Post 岗位。
type Post struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Descr string `json:"descr"`
	Sort  int    `json:"sort"`
}

const orgPathSep = " / "

// ListOrgUnits 返回组织树（按 sort/name 排序，节点含全路径）。
func (s *Store) ListOrgUnits(ctx context.Context) ([]OrgUnit, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, parent_id, name, sort FROM org_units ORDER BY sort, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	all := map[string]*OrgUnit{}
	var order []string
	for rows.Next() {
		var u OrgUnit
		if err := rows.Scan(&u.ID, &u.ParentID, &u.Name, &u.Sort); err != nil {
			return nil, err
		}
		all[u.ID] = &u
		order = append(order, u.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// 递归求 path 并组树（组织树极小，内存遍历即可）
	var pathOf func(id string) string
	pathOf = func(id string) string {
		u := all[id]
		if u == nil {
			return ""
		}
		if u.ParentID == "" {
			return u.Name
		}
		return pathOf(u.ParentID) + orgPathSep + u.Name
	}
	return rebuildTree(all, order, pathOf), nil
}

// rebuildTree 以值语义构建树（避免指针共享导致的顺序问题）。
func rebuildTree(all map[string]*OrgUnit, order []string, pathOf func(string) string) []OrgUnit {
	childrenOf := map[string][]OrgUnit{}
	var roots []OrgUnit
	for _, id := range order {
		u := *all[id]
		u.Path = pathOf(id)
		u.Children = nil
		if u.ParentID == "" || all[u.ParentID] == nil {
			roots = append(roots, u)
		} else {
			childrenOf[u.ParentID] = append(childrenOf[u.ParentID], u)
		}
	}
	var attach func(list []OrgUnit) []OrgUnit
	attach = func(list []OrgUnit) []OrgUnit {
		for i := range list {
			list[i].Children = attach(childrenOf[list[i].ID])
		}
		return list
	}
	return attach(roots)
}

// orgPath 计算指定组织的当前全路径。
func (s *Store) orgPath(ctx context.Context, id string) (string, error) {
	var name, parentID string
	err := s.pool.QueryRow(ctx, `SELECT name, parent_id FROM org_units WHERE id=$1`, id).Scan(&name, &parentID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	if parentID == "" {
		return name, nil
	}
	parentPath, err := s.orgPath(ctx, parentID)
	if err != nil {
		return "", err
	}
	return parentPath + orgPathSep + name, nil
}

// CreateOrgUnit 幂等创建；父组织必须存在（400）。
func (s *Store) CreateOrgUnit(ctx context.Context, u OrgUnit) (OrgUnit, bool, error) {
	if u.ParentID != "" {
		var n int
		if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM org_units WHERE id=$1`, u.ParentID).Scan(&n); err != nil {
			return u, false, err
		}
		if n == 0 {
			return u, false, fmt.Errorf("%w: 父组织 %s 不存在", ErrInvalid, u.ParentID)
		}
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO org_units (id, parent_id, name, sort) VALUES ($1,$2,$3,$4)
		ON CONFLICT (id) DO NOTHING`, u.ID, u.ParentID, u.Name, u.Sort)
	if err != nil {
		return u, false, err
	}
	if tag.RowsAffected() == 0 {
		u.Path, err = s.orgPath(ctx, u.ID)
		return u, false, err
	}
	if u.Path, err = s.orgPath(ctx, u.ID); err != nil {
		return u, false, err
	}
	return u, true, nil
}

// UpdateOrgUnit 重命名/排序/移动父级：重命名联动以旧 path 为前缀的用户部门。
func (s *Store) UpdateOrgUnit(ctx context.Context, u OrgUnit) (OrgUnit, error) {
	oldPath, err := s.orgPath(ctx, u.ID)
	if err != nil {
		return u, err
	}
	if _, err := s.pool.Exec(ctx, `
		UPDATE org_units SET name=$2, sort=$3, parent_id=$4 WHERE id=$1`,
		u.ID, u.Name, u.Sort, u.ParentID); err != nil {
		return u, err
	}
	newPath, err := s.orgPath(ctx, u.ID)
	if err != nil {
		return u, err
	}
	if oldPath != newPath {
		// 联动：旧前缀 → 新前缀（含子组织路径自然由读取时重算）
		if _, err := s.pool.Exec(ctx, `
			UPDATE users SET dept = $1 || substring(dept from $2::int) WHERE dept LIKE $3`,
			newPath, len(oldPath)+1, oldPath+"%"); err != nil {
			return u, err
		}
	}
	u.Path = newPath
	return u, nil
}

// DeleteOrgUnit：有子组织 409；被用户部门引用（路径前缀命中）409。
func (s *Store) DeleteOrgUnit(ctx context.Context, id string) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM org_units WHERE parent_id=$1`, id).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%w: 组织下仍有 %d 个子组织，请先删除", ErrConflict, n)
	}
	path, err := s.orgPath(ctx, id)
	if err != nil {
		return err
	}
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM users WHERE dept = $1 OR dept LIKE $2`, path, path+orgPathSep+"%").Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%w: 组织被 %d 个用户引用，不可删除", ErrConflict, n)
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM org_units WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SyncOrgUnits 从现有用户的部门字符串归集合并组织树（确定性 upsert，幂等）。
func (s *Store) SyncOrgUnits(ctx context.Context) (map[string]any, error) {
	rows, err := s.pool.Query(ctx, `SELECT DISTINCT dept FROM users WHERE dept <> ''`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var depts []string
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		depts = append(depts, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	added := 0
	for _, dept := range depts {
		parent := ""
		for _, seg := range strings.Split(dept, "/") {
			name := strings.TrimSpace(seg)
			if name == "" {
				continue
			}
			var id string
			err := s.pool.QueryRow(ctx,
				`SELECT id FROM org_units WHERE name=$1 AND parent_id=$2`, name, parent).Scan(&id)
			if errors.Is(err, pgx.ErrNoRows) {
				id = fmt.Sprintf("org-sync-%d", time.Now().UnixNano()%1e9)
				if _, err := s.pool.Exec(ctx, `
					INSERT INTO org_units (id, parent_id, name, sort) VALUES ($1,$2,$3,99)`,
					id, parent, name); err != nil {
					return nil, err
				}
				added++
			} else if err != nil {
				return nil, err
			}
			parent = id
		}
	}
	tree, err := s.ListOrgUnits(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{"added": added, "sources": len(depts), "tree": tree}, nil
}

// ─── 岗位 ───

func (s *Store) ListPosts(ctx context.Context) ([]Post, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, descr, sort FROM posts ORDER BY sort, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.ID, &p.Name, &p.Descr, &p.Sort); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// CreatePost 幂等创建；同名岗位（不同 id）409。
func (s *Store) CreatePost(ctx context.Context, p Post) (Post, bool, error) {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM posts WHERE name=$1 AND id<>$2`, p.Name, p.ID).Scan(&n); err != nil {
		return p, false, err
	}
	if n > 0 {
		return p, false, fmt.Errorf("%w: 岗位「%s」已存在", ErrConflict, p.Name)
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO posts (id, name, descr, sort) VALUES ($1,$2,$3,$4)
		ON CONFLICT (id) DO NOTHING`, p.ID, p.Name, p.Descr, p.Sort)
	if err != nil {
		return p, false, err
	}
	return p, tag.RowsAffected() > 0, nil
}

// UpdatePost 重命名联动用户岗位。
func (s *Store) UpdatePost(ctx context.Context, p Post) (Post, error) {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM posts WHERE name=$1 AND id<>$2`, p.Name, p.ID).Scan(&n); err != nil {
		return p, err
	}
	if n > 0 {
		return p, fmt.Errorf("%w: 岗位「%s」已存在", ErrConflict, p.Name)
	}
	var oldName string
	err := s.pool.QueryRow(ctx, `SELECT name FROM posts WHERE id=$1`, p.ID).Scan(&oldName)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	if err != nil {
		return p, err
	}
	if _, err := s.pool.Exec(ctx, `UPDATE posts SET name=$2, descr=$3, sort=$4 WHERE id=$1`,
		p.ID, p.Name, p.Descr, p.Sort); err != nil {
		return p, err
	}
	if oldName != p.Name {
		if _, err := s.pool.Exec(ctx, `UPDATE users SET post=$2 WHERE post=$1`, oldName, p.Name); err != nil {
			return p, err
		}
	}
	return p, nil
}

// DeletePost：被用户引用 409。
func (s *Store) DeletePost(ctx context.Context, id string) error {
	var name string
	err := s.pool.QueryRow(ctx, `SELECT name FROM posts WHERE id=$1`, id).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM users WHERE post=$1`, name).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("%w: 岗位被 %d 个用户引用，不可删除", ErrConflict, n)
	}
	_, err = s.pool.Exec(ctx, `DELETE FROM posts WHERE id=$1`, id)
	return err
}

// SyncPosts 从现有用户岗位归集合并（确定性 upsert，幂等）。
func (s *Store) SyncPosts(ctx context.Context) (map[string]any, error) {
	rows, err := s.pool.Query(ctx, `SELECT DISTINCT post FROM users WHERE post <> ''`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		names = append(names, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	added := 0
	for _, name := range names {
		var n int
		if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM posts WHERE name=$1`, name).Scan(&n); err != nil {
			return nil, err
		}
		if n == 0 {
			if _, err := s.pool.Exec(ctx, `
				INSERT INTO posts (id, name, sort) VALUES ($1,$2,99)`,
				fmt.Sprintf("post-sync-%d", time.Now().UnixNano()%1e9), name); err != nil {
				return nil, err
			}
			added++
		}
	}
	list, err := s.ListPosts(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{"added": added, "sources": len(names), "posts": list}, nil
}
