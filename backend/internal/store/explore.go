// 数据探索：多类型数据源浏览（数据库 Schema/Data/ER · 知识库文档 · API 接口）。
package store

import (
	"context"
	"fmt"
)

// ExploreTableColumn 表列信息。
type ExploreTableColumn struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Key      string `json:"key,omitempty"` // PK | FK
	Default  string `json:"default,omitempty"`
	Comment  string `json:"comment"`
}

// ExploreTableData 表数据预览。
type ExploreTableData struct {
	Name    string               `json:"name"`
	Rows    string               `json:"rows"`
	Columns []ExploreTableColumn `json:"columns"`
	Sample  []map[string]string  `json:"sample"`
	Fks     []ExploreFK          `json:"fks"`
}

// ExploreFK 外键关系。
type ExploreFK struct {
	Column    string `json:"column"`
	RefTable  string `json:"refTable"`
	RefColumn string `json:"refColumn"`
}

// ExploreSource 数据源目录节点。
type ExploreSource struct {
	Key      string         `json:"key"`
	Title    string         `json:"title"`
	Kind     string         `json:"kind"` // database | kb | api
	Children []ExploreTable `json:"children,omitempty"`
}

// ExploreTable 目录中的表节点。
type ExploreTable struct {
	Key    string `json:"key"`
	Title  string `json:"title"`
	IsLeaf bool   `json:"isLeaf"`
}

// GetExploreTree 返回用户可见的数据源目录树（数据库+知识库+API）。
func (s *Store) GetExploreTree(ctx context.Context) ([]ExploreSource, error) {
	out := []ExploreSource{}

	// 1) 数据库类型源 → 真实表列表（pg_tables，保证可查询）
	dss, err := s.ListDatasources(ctx)
	if err != nil {
		return nil, err
	}
	// 只需一个源展示所有真实表（多个源会导致重复）
	if len(dss) > 0 {
		src := ExploreSource{Key: "db:main", Title: "PostgreSQL (entknow)", Kind: "database"}
		rows, qerr := s.pool.Query(ctx, `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LIMIT 30`)
		if qerr == nil {
			defer rows.Close()
			for rows.Next() {
				var name string
				if err := rows.Scan(&name); err == nil {
					src.Children = append(src.Children, ExploreTable{Key: "tbl:" + name, Title: name, IsLeaf: true})
				}
			}
		}
		out = append(out, src)
	}

	// 2) 知识库文档
	kbRows, err := s.pool.Query(ctx, `SELECT id, title FROM kb_entries WHERE status <> '已失效' ORDER BY title LIMIT 30`)
	if err == nil {
		kbSrc := ExploreSource{Key: "kb", Title: "知识库文档", Kind: "kb"}
		defer kbRows.Close()
		for kbRows.Next() {
			var id, title string
			if err := kbRows.Scan(&id, &title); err == nil {
				kbSrc.Children = append(kbSrc.Children, ExploreTable{Key: "doc:" + id, Title: title, IsLeaf: true})
			}
		}
		if len(kbSrc.Children) > 0 {
			out = append(out, kbSrc)
		}
	}

	// 3) API 接口（从 capabilities 提取）
	caps, err := s.ListCapabilities(ctx)
	if err == nil && len(caps) > 0 {
		apiSrc := ExploreSource{Key: "api", Title: "API 接口", Kind: "api"}
		for _, c := range caps {
			apiSrc.Children = append(apiSrc.Children, ExploreTable{Key: "ep:" + c.ID, Title: c.Name, IsLeaf: true})
		}
		out = append(out, apiSrc)
	}

	return out, nil
}

// GetExploreTable 返回表结构、样本数据和外键。
func (s *Store) GetExploreTable(ctx context.Context, tableName string) (*ExploreTableData, error) {
	data := &ExploreTableData{Name: tableName}

	// 列信息
	colRows, err := s.pool.Query(ctx, `
		SELECT column_name, data_type, is_nullable, COALESCE(column_default, ''),
		       COALESCE(col_description((table_schema||'.'||table_name)::regclass, ordinal_position), '')
		FROM information_schema.columns
		WHERE table_name = $1 AND table_schema = 'public'
		ORDER BY ordinal_position`, tableName)
	if err != nil {
		return nil, err
	}
	defer colRows.Close()
	for colRows.Next() {
		var c ExploreTableColumn
		var nullable string
		if err := colRows.Scan(&c.Name, &c.Type, &nullable, &c.Default, &c.Comment); err != nil {
			return nil, err
		}
		c.Nullable = nullable == "YES"
		data.Columns = append(data.Columns, c)
	}

	// 主键
	pkRows, err := s.pool.Query(ctx, `
		SELECT a.attname FROM pg_index i
		JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
		WHERE i.indrelid = $1::regclass AND i.indisprimary`, tableName)
	if err == nil {
		defer pkRows.Close()
		for pkRows.Next() {
			var pk string
			if err := pkRows.Scan(&pk); err == nil {
				for i := range data.Columns {
					if data.Columns[i].Name == pk {
						data.Columns[i].Key = "PK"
					}
				}
			}
		}
	}

	// 外键
	fkRows, err := s.pool.Query(ctx, `
		SELECT kcu.column_name, ccu.table_name, ccu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
		JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
		WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'`, tableName)
	if err == nil {
		defer fkRows.Close()
		for fkRows.Next() {
			var fk ExploreFK
			if err := fkRows.Scan(&fk.Column, &fk.RefTable, &fk.RefColumn); err == nil {
				data.Fks = append(data.Fks, fk)
				for i := range data.Columns {
					if data.Columns[i].Name == fk.Column {
						data.Columns[i].Key = "FK"
					}
				}
			}
		}
	}

	// 行数（估算）
	_ = s.pool.QueryRow(ctx, `SELECT count(*) FROM `+tableName).Scan(new(int))
	data.Rows = "—" // 大表 count 慢，用占位

	// 样本数据（前 10 行）
	sampleRows, err := s.pool.Query(ctx, `SELECT * FROM `+tableName+` LIMIT 10`)
	if err == nil {
		defer sampleRows.Close()
		cols := sampleRows.FieldDescriptions()
		for sampleRows.Next() {
			vals, err := sampleRows.Values()
			if err != nil {
				break
			}
			row := map[string]string{}
			for i, col := range cols {
				v := ""
				if vals[i] != nil {
					v = fmt.Sprintf("%v", vals[i])
					if len(v) > 100 {
						v = v[:100] + "…"
					}
				}
				row[string(col.Name)] = v
			}
			data.Sample = append(data.Sample, row)
		}
	}

	return data, nil
}

// GetExploreDoc 返回知识库文档内容。
func (s *Store) GetExploreDoc(ctx context.Context, docID string) (map[string]any, error) {
	var title, mode string
	err := s.pool.QueryRow(ctx, `SELECT title, COALESCE(mode,'') FROM kb_entries WHERE id = $1`, docID).
		Scan(&title, &mode)
	if err != nil {
		return nil, ErrNotFound
	}
	return map[string]any{"id": docID, "title": title, "content": mode}, nil
}

// GetExploreApi 返回 API 能力详情。
func (s *Store) GetExploreApi(ctx context.Context, epID string) (map[string]any, error) {
	caps, err := s.ListCapabilities(ctx)
	if err != nil {
		return nil, err
	}
	for _, c := range caps {
		if c.ID == epID {
			return map[string]any{
				"id": c.ID, "name": c.Name, "desc": c.Desc,
				"proto": c.Proto, "owner": c.Owner,
			}, nil
		}
	}
	return nil, ErrNotFound
}
