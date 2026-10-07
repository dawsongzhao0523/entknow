// 解析策略与非结构化加工：parse_profiles CRUD 与传播规则创建。
package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// ParseProfile 非结构化解析策略。
type ParseProfile struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	DocType string `json:"docType"`
	Chunk   string `json:"chunk"`
	Extract string `json:"extract"`
	Status  string `json:"status"`
	Owner   string `json:"owner"`
}

func (s *Store) ListParseProfiles(ctx context.Context) ([]ParseProfile, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, doc_type, chunk, extract, status, owner FROM parse_profiles ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ParseProfile
	for rows.Next() {
		var p ParseProfile
		if err := rows.Scan(&p.ID, &p.Name, &p.DocType, &p.Chunk, &p.Extract, &p.Status, &p.Owner); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// CreateParseProfile 幂等创建；同名（不同 id）409。
func (s *Store) CreateParseProfile(ctx context.Context, p ParseProfile) (ParseProfile, bool, error) {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM parse_profiles WHERE name=$1 AND id<>$2`, p.Name, p.ID).Scan(&n); err != nil {
		return p, false, err
	}
	if n > 0 {
		return p, false, fmt.Errorf("%w: 解析策略「%s」已存在", ErrConflict, p.Name)
	}
	if p.Status == "" {
		p.Status = "启用"
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO parse_profiles (id, name, doc_type, chunk, extract, status, owner)
		VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
		p.ID, p.Name, p.DocType, p.Chunk, p.Extract, p.Status, p.Owner)
	if err != nil {
		return p, false, err
	}
	return p, tag.RowsAffected() > 0, nil
}

// UpdateParseProfile 编辑（未知 404）。
func (s *Store) UpdateParseProfile(ctx context.Context, p ParseProfile) (ParseProfile, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE parse_profiles SET name=$2, doc_type=$3, chunk=$4, extract=$5, status=$6, owner=$7
		WHERE id=$1 RETURNING id, name, doc_type, chunk, extract, status, owner`,
		p.ID, p.Name, p.DocType, p.Chunk, p.Extract, p.Status, p.Owner).
		Scan(&p.ID, &p.Name, &p.DocType, &p.Chunk, &p.Extract, &p.Status, &p.Owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// DeleteParseProfile（未知 404）。
func (s *Store) DeleteParseProfile(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM parse_profiles WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreateRule 幂等创建传播规则（DRAFT，发布走治理）。
func (s *Store) CreateRule(ctx context.Context, r Rule) (Rule, bool, error) {
	if r.Kind != "V→V" && r.Kind != "V→E" && r.Kind != "E→V" && r.Kind != "E→E" {
		return r, false, fmt.Errorf("%w: kind 必须为 V→V / V→E / E→V / E→E", ErrInvalid)
	}
	r.Status = "草稿"
	r.Fired = 0
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO rules (id, def, kind, status, fired) VALUES ($1,$2,$3,$4,0)
		ON CONFLICT (id) DO NOTHING`, r.ID, r.Def, r.Kind, r.Status)
	if err != nil {
		return r, false, err
	}
	if tag.RowsAffected() == 0 {
		existing, err := s.getRule(ctx, r.ID)
		return existing, false, err
	}
	return r, true, nil
}

func (s *Store) getRule(ctx context.Context, id string) (Rule, error) {
	var r Rule
	err := s.pool.QueryRow(ctx, `SELECT id, def, kind, status, fired FROM rules WHERE id=$1`, id).
		Scan(&r.ID, &r.Def, &r.Kind, &r.Status, &r.Fired)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	return r, err
}
