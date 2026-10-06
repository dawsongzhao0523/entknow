// 本体创建：幂等（客户端 id）与三种初始化（空白画布 / 供应链模板 / 数据资产逆向）。
package store

import (
	"context"
	"fmt"
)

// CreateOntology 创建本体；创建者自动成为所有者。
// init：blank 仅元数据；template 供应链最小集（4 对象 + 3 关系，画布草稿）；
// reverse 从 table_profiles 生成对象草稿（上限 4 张，画布草稿，映射指向源表）。
func (s *Store) CreateOntology(ctx context.Context, id, name, scene, owner, init string) (Ontology, bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO ontologies (id, name, scene, version, status, owner, members, object_count, edge_count, created)
		VALUES ($1, $2, $3, 'v0.1', 'DRAFT', $4, 1, 0, 0, to_char(now(), 'YYYY-MM-DD'))
		ON CONFLICT (id) DO NOTHING`, id, name, scene, owner)
	if err != nil {
		return Ontology{}, false, err
	}
	if tag.RowsAffected() == 0 {
		o, err := s.getOntology(ctx, id)
		return o, false, err
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO memberships (onto_id, user_id, role) VALUES ($1, $2, '所有者')
		ON CONFLICT (onto_id, user_id) DO NOTHING`, id, owner); err != nil {
		return Ontology{}, false, err
	}

	objCount, edgeCount := 0, 0
	switch init {
	case "", "blank":
	case "template":
		tpl := []struct {
			id, name, en, kind string
			sm                 []string
		}{
			{"tpl-supp", "供应商", "Supplier", "静态事实", nil},
			{"tpl-plant", "工厂", "Plant", "静态事实", nil},
			{"tpl-mat", "物料", "Material", "静态事实", nil},
			{"tpl-po", "采购订单", "PO", "单体动态", []string{"草稿", "已下达", "已发货", "已收货", "已关闭"}},
		}
		for _, t := range tpl {
			obj := Object{ID: fmt.Sprintf("%s-%s", id, t.id), Name: t.name, En: t.en, Kind: t.kind,
				Version: "v0.1", Status: "DRAFT", Owner: owner, Ontology: name, StateMachine: t.sm,
				Props: []Prop{{Name: t.en + "编码", Type: "string", Comment: "模板生成，待补全"}}}
			if _, _, err := s.CreateObject(ctx, obj); err != nil {
				return Ontology{}, false, fmt.Errorf("模板对象 %s: %w", t.name, err)
			}
			if _, err := s.pool.Exec(ctx, `UPDATE objects SET canvas=true WHERE id=$1`, obj.ID); err != nil {
				return Ontology{}, false, err
			}
			objCount++
		}
		edges := []struct{ id, name, from, to string }{
			{"supply", "供应", "tpl-supp", "tpl-po"},
			{"bom", "生产", "tpl-mat", "tpl-po"},
			{"ship", "发货", "tpl-plant", "tpl-po"},
		}
		for _, e := range edges {
			eid := fmt.Sprintf("%s-%s", id, e.id)
			if _, err := s.pool.Exec(ctx, `
				INSERT INTO edges (id, name, from_obj, to_obj, version, status, ref_count, props)
				VALUES ($1, $2, $3, $4, 'v0.1', 'DRAFT', 0, '[]') ON CONFLICT (id) DO NOTHING`,
				eid, e.name, fmt.Sprintf("%s-%s", id, e.from), fmt.Sprintf("%s-%s", id, e.to)); err != nil {
				return Ontology{}, false, err
			}
			edgeCount++
		}
	case "reverse":
		rows, err := s.pool.Query(ctx, `SELECT name, comment FROM table_profiles ORDER BY name LIMIT 4`)
		if err != nil {
			return Ontology{}, false, err
		}
		defer rows.Close()
		type tbl struct{ name, comment string }
		var tables []tbl
		for rows.Next() {
			var t tbl
			if err := rows.Scan(&t.name, &t.comment); err != nil {
				return Ontology{}, false, err
			}
			tables = append(tables, t)
		}
		for _, t := range tables {
			display := t.comment
			if display == "" {
				display = t.name
			}
			obj := Object{ID: fmt.Sprintf("%s-%s", id, t.name), Name: display, En: t.name, Kind: "静态事实",
				Version: "v0.1", Status: "DRAFT", Owner: owner, Ontology: name,
				Mapping: t.name + "（物理表）",
				Props:   []Prop{{Name: t.name + "_id", Type: "string", Comment: "逆向生成，待补全"}}}
			if _, _, err := s.CreateObject(ctx, obj); err != nil {
				return Ontology{}, false, fmt.Errorf("逆向对象 %s: %w", t.name, err)
			}
			if _, err := s.pool.Exec(ctx, `UPDATE objects SET canvas=true WHERE id=$1`, obj.ID); err != nil {
				return Ontology{}, false, err
			}
			objCount++
		}
	default:
		return Ontology{}, false, fmt.Errorf("%w: init 必须为 blank / template / reverse", ErrInvalid)
	}

	if _, err := s.pool.Exec(ctx, `
		UPDATE ontologies SET object_count=$2, edge_count=$3 WHERE id=$1`, id, objCount, edgeCount); err != nil {
		return Ontology{}, false, err
	}
	o, err := s.getOntology(ctx, id)
	if err != nil {
		return Ontology{}, false, err
	}
	o.MyRole = "所有者"
	return o, true, nil
}

func (s *Store) getOntology(ctx context.Context, id string) (Ontology, error) {
	var o Ontology
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, scene, version, status, owner, members, object_count, edge_count, created
		FROM ontologies WHERE id = $1`, id).
		Scan(&o.ID, &o.Name, &o.Scene, &o.Version, &o.Status, &o.Owner, &o.Members, &o.Objects, &o.Edges, &o.Created)
	if err != nil {
		return o, err
	}
	return o, nil
}
