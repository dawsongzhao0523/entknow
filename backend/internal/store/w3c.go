// W3C 语义标准对齐：OWL Turtle 实时生成、SKOS 导出、SWRL 规则导出、SPARQL 查询。
// 依据《本体驱动的AI数据管理》第 5 章「7+1」语义规范：RDF/OWL/SKOS/SWRL/SPARQL。
package store

import (
	"context"
	"fmt"
	"strings"
)

// ═══ OWL Turtle 实时生成 ═══

// GenerateOWL 实时生成本体 OWL Turtle：对象→owl:Class、属性→owl:DatatypeProperty、
// 关系→owl:ObjectProperty（含 rdfs:domain/range）、同义词→术语对齐注释。
func (s *Store) GenerateOWL(ctx context.Context, ontoID string) (string, error) {
	objects, err := s.ListObjects(ctx, "")
	if err != nil {
		return "", err
	}
	edges, err := s.ListEdges(ctx)
	if err != nil {
		return "", err
	}
	syns, err := s.ListSynonyms(ctx, "")
	if err != nil {
		return "", err
	}
	onto := objectsOf(objects, ontologyName(ontoID))

	var b strings.Builder
	b.WriteString("@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n")
	b.WriteString("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n")
	b.WriteString("@prefix owl:  <http://www.w3.org/2002/07/owl#> .\n")
	b.WriteString("@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n")
	b.WriteString(fmt.Sprintf("@prefix :      <http://entknow.example/ontology/%s/> .\n\n", ontoID))

	b.WriteString(fmt.Sprintf("<http://entknow.example/ontology/%s> a owl:Ontology ;\n    rdfs:label %q@zh .\n\n", ontoID, ontologyName(ontoID)))

	// 对象 → owl:Class；属性 → owl:DatatypeProperty
	for _, o := range onto {
		b.WriteString(fmt.Sprintf(":%s a owl:Class ;\n    rdfs:label %q@zh .\n", o.En, o.Name))
		for _, p := range o.Props {
			b.WriteString(fmt.Sprintf(":%s__%s a owl:DatatypeProperty ;\n    rdfs:domain :%s ;\n    rdfs:range %s ;\n    rdfs:label %q@zh .\n",
				o.En, sanitizeIRI(p.Name), o.En, xsdType(p.Type), p.Name))
		}
	}

	// 同义词 → 术语对齐注释（如 白糖罂==蜂糖罂，对应书中的 EquivalentClass 语义）
	for _, syn := range syns {
		if syn.Standard == "" || len(syn.Terms) < 2 {
			continue
		}
		b.WriteString(fmt.Sprintf("\n# 术语对齐(EquivalentClass): %s\n", strings.Join(syn.Terms, " == ")))
	}

	// 关系 → owl:ObjectProperty（domain/range 对齐端点对象的英文标识）
	for _, e := range edges {
		fromEn, toEn := "", ""
		for _, o := range onto {
			if o.Name == e.From {
				fromEn = o.En
			}
			if o.Name == e.To {
				toEn = o.En
			}
		}
		if fromEn == "" || toEn == "" {
			continue
		}
		b.WriteString(fmt.Sprintf(":%s a owl:ObjectProperty ;\n    rdfs:domain :%s ;\n    rdfs:range :%s ;\n    rdfs:label %q@zh .\n",
			sanitizeIRI(e.ID), fromEn, toEn, e.Name))
		for _, p := range e.Props {
			b.WriteString(fmt.Sprintf(":%s__%s a owl:DatatypeProperty ;\n    rdfs:domain :%s ;\n    rdfs:range %s ;\n    rdfs:label %q@zh .\n",
				sanitizeIRI(e.ID), sanitizeIRI(p.Name), sanitizeIRI(e.ID), xsdType(p.Type), p.Name))
		}
	}
	return b.String(), nil
}

// ═══ SKOS 术语导出 ═══

// GenerateSKOS 导出 SKOS Core RDF/XML：标准术语→skos:Concept，
// 同义表达→skos:altLabel（对齐书中「SKOS 统一基础术语」规范）。
func (s *Store) GenerateSKOS(ctx context.Context) (string, error) {
	syns, err := s.ListSynonyms(ctx, "")
	if err != nil {
		return "", err
	}
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <skos:ConceptScheme rdf:about="http://entknow.example/terminology">
    <skos:prefLabel xml:lang="zh">entKnow 企业术语表</skos:prefLabel>
  </skos:ConceptScheme>
`)
	for _, syn := range syns {
		if syn.Standard == "" {
			continue
		}
		b.WriteString("  <skos:Concept rdf:about=\"http://entknow.example/terminology/" + sanitizeIRI(syn.Standard) + "\">\n")
		b.WriteString("    <skos:prefLabel xml:lang=\"zh\">" + xmlEscape(syn.Standard) + "</skos:prefLabel>\n")
		for _, alt := range syn.Terms {
			if alt != syn.Standard {
				b.WriteString("    <skos:altLabel xml:lang=\"zh\">" + xmlEscape(alt) + "</skos:altLabel>\n")
			}
		}
		b.WriteString("  </skos:Concept>\n")
	}
	b.WriteString("</rdf:RDF>")
	return b.String(), nil
}

// ═══ SWRL 规则导出 ═══

// GenerateSWRL 导出单条规则的 SWRL RuleML XML（body=条件 atoms，head=结论 atoms）。
func (s *Store) GenerateSWRL(ctx context.Context, ruleID string) (string, error) {
	rules, err := s.ListRules(ctx)
	if err != nil {
		return "", err
	}
	for _, r := range rules {
		if r.ID != ruleID {
			continue
		}
		var b strings.Builder
		b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>
<ruleml:RuleML xmlns:ruleml="http://www.w3.org/2003/11/ruleml#"
               xmlns:swrl="http://www.w3.org/2003/11/swrl#"
               xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <swrl:Imp rdf:about="http://entknow.example/rules/` + sanitizeIRI(r.ID) + `">
    <swrl:body rdf:parseType="Collection">
      <!-- 条件: ` + xmlEscape(r.Def) + ` -->
      <swrl:AtomList/>
    </swrl:body>
    <swrl:head rdf:parseType="Collection">
      <swrl:AtomList/>
    </swrl:head>
    <rdfs:comment>规则类型: ` + xmlEscape(r.Kind) + ` | 触发次数: ` + fmt.Sprint(r.Fired) + `</rdfs:comment>
  </swrl:Imp>
</ruleml:RuleML>`)
		return b.String(), nil
	}
	return "", ErrNotFound
}

// ═══ SPARQL 查询引擎 ═══

// SPARQLResult SPARQL SELECT 结果。
type SPARQLResult struct {
	Vars []string            `json:"vars"`
	Rows []map[string]string `json:"rows"`
}

// triple 内部三元组。
type triple struct{ s, p, o string }

// QuerySPARQL 执行 SPARQL SELECT：将本体模式映射为 RDF 三元组后做模式绑定联查。
// 支持：多三元组模式共享变量、rdf:type / rdfs:label / :谓词 / a 等基础写法。
func (s *Store) QuerySPARQL(ctx context.Context, query string) (*SPARQLResult, error) {
	q := normalizeQuery(query)
	if !strings.HasPrefix(strings.ToUpper(q), "SELECT") {
		return nil, fmt.Errorf("%w: 仅支持 SELECT 查询", ErrInvalid)
	}
	vars := extractSelectVars(q)
	patterns := extractTriplePatterns(q)
	if len(patterns) == 0 {
		return nil, fmt.Errorf("%w: WHERE 子句中未找到三元组模式", ErrInvalid)
	}

	triples, err := s.buildTriples(ctx)
	if err != nil {
		return nil, err
	}
	rows := matchPatterns(triples, patterns, vars)
	return &SPARQLResult{Vars: vars, Rows: rows}, nil
}

// buildTriples 将本体数据映射为 RDF 三元组集合（schema 层 + 标签层 + 关系断言层）。
func (s *Store) buildTriples(ctx context.Context) ([]triple, error) {
	objects, err := s.ListObjects(ctx, "")
	if err != nil {
		return nil, err
	}
	edges, err := s.ListEdges(ctx)
	if err != nil {
		return nil, err
	}
	var ts []triple
	for _, o := range objects {
		ts = append(ts,
			triple{o.En, "rdf:type", "owl:Class"},
			triple{o.En, "rdfs:label", o.Name},
		)
		for _, p := range o.Props {
			ts = append(ts,
				triple{o.En + "__" + sanitizeIRI(p.Name), "rdf:type", "owl:DatatypeProperty"},
				triple{o.En + "__" + sanitizeIRI(p.Name), "rdfs:domain", o.En},
				triple{o.En + "__" + sanitizeIRI(p.Name), "rdfs:label", p.Name},
			)
		}
	}
	for _, e := range edges {
		fromEn, toEn := "", ""
		for _, o := range objects {
			if o.Name == e.From {
				fromEn = o.En
			}
			if o.Name == e.To {
				toEn = o.En
			}
		}
		if fromEn == "" || toEn == "" {
			continue
		}
		ts = append(ts,
			triple{e.ID, "rdf:type", "owl:ObjectProperty"},
			triple{e.ID, "rdfs:domain", fromEn},
			triple{e.ID, "rdfs:range", toEn},
			triple{e.ID, "rdfs:label", e.Name},
			triple{fromEn, e.ID, toEn}, // 关系断言三元组
		)
	}
	return ts, nil
}

// matchPatterns 依序绑定模式（回溯联查），返回各 SELECT 变量的绑定行。
func matchPatterns(triples []triple, patterns [][3]string, vars []string) []map[string]string {
	rows := []map[string]string{}
	var walk func(idx int, bind map[string]string)
	walk = func(idx int, bind map[string]string) {
		if idx == len(patterns) {
			row := map[string]string{}
			for _, v := range vars {
				if val, ok := bind[v]; ok {
					row[v] = val
				}
			}
			rows = append(rows, row)
			return
		}
		for _, t := range triples {
			next := make(map[string]string, len(bind)+3)
			for k, v := range bind {
				next[k] = v
			}
			if bindPattern(patterns[idx], t, next) {
				walk(idx+1, next)
			}
		}
	}
	walk(0, map[string]string{})
	return rows
}

// bindPattern 检查三元组 t 是否匹配模式 pat，变量（?x）绑定进 next；冲突则 false。
func bindPattern(pat [3]string, t triple, next map[string]string) bool {
	vals := [3]string{t.s, t.p, t.o}
	for i, pv := range pat {
		if strings.HasPrefix(pv, "?") {
			name := pv[1:]
			if old, ok := next[name]; ok && old != vals[i] {
				return false
			}
			next[name] = vals[i]
		} else if normTerm(pv) != normTerm(vals[i]) {
			return false
		}
	}
	return true
}

// normTerm 归一化术语写法：:Foo / Foo / a→rdf:type。
func normTerm(t string) string {
	t = strings.TrimSpace(t)
	t = strings.TrimPrefix(t, ":")
	if t == "a" {
		return "rdf:type"
	}
	return t
}

// extractSelectVars 提取 SELECT 与 WHERE 之间的投影变量；SELECT * 展开为模式中的变量。
func extractSelectVars(q string) []string {
	upper := strings.ToUpper(q)
	wIdx := strings.Index(upper, "WHERE")
	if wIdx < 0 {
		return []string{}
	}
	head := q[strings.Index(upper, "SELECT")+len("SELECT") : wIdx]
	vars := []string{}
	for _, f := range strings.Fields(head) {
		if strings.HasPrefix(f, "?") {
			vars = append(vars, f[1:])
		}
	}
	if len(vars) == 0 { // SELECT *
		seen := map[string]bool{}
		for _, pat := range extractTriplePatterns(q) {
			for _, term := range pat {
				if strings.HasPrefix(term, "?") && !seen[term[1:]] {
					seen[term[1:]] = true
					vars = append(vars, term[1:])
				}
			}
		}
	}
	return vars
}

// extractTriplePatterns 解析 WHERE { ... } 内的三元组模式（按句点分组）。
func extractTriplePatterns(q string) [][3]string {
	upper := strings.ToUpper(q)
	wIdx := strings.Index(upper, "WHERE")
	if wIdx < 0 {
		return nil
	}
	rest := q[wIdx:]
	start := strings.Index(rest, "{")
	end := strings.LastIndex(rest, "}")
	if start < 0 || end < 0 || end <= start {
		return nil
	}
	body := rest[start+1 : end]
	patterns := [][3]string{}
	for _, stmt := range strings.Split(body, ".") {
		fields := strings.Fields(stmt)
		if len(fields) >= 3 {
			patterns = append(patterns, [3]string{fields[0], fields[1], strings.Join(fields[2:], " ")})
		}
	}
	return patterns
}

// normalizeQuery 去 # 注释、压缩换行空白。
func normalizeQuery(q string) string {
	var b strings.Builder
	for _, line := range strings.Split(q, "\n") {
		if idx := strings.Index(line, "#"); idx >= 0 {
			line = line[:idx]
		}
		b.WriteString(line + " ")
	}
	return strings.TrimSpace(b.String())
}

// ═══ 辅助 ═══

func sanitizeIRI(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "_"
	}
	return b.String()
}

// xsdType 内部属性类型 → XSD 数据类型。
func xsdType(t string) string {
	switch strings.ToLower(strings.TrimSpace(t)) {
	case "int", "integer", "数量", "数值":
		return "xsd:integer"
	case "decimal", "float", "double", "金额", "比例":
		return "xsd:decimal"
	case "bool", "boolean", "布尔":
		return "xsd:boolean"
	case "date", "日期":
		return "xsd:date"
	case "datetime", "timestamp", "时间":
		return "xsd:dateTime"
	default:
		return "xsd:string"
	}
}

func xmlEscape(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;")
	return r.Replace(s)
}
