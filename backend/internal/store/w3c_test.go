package store

import (
	"reflect"
	"testing"
)

// 三元组夹具：模拟一个供应链本体的 RDF 映射。
func fixtureTriples() []triple {
	return []triple{
		{"Supplier", "rdf:type", "owl:Class"},
		{"Supplier", "rdfs:label", "供应商"},
		{"Material", "rdf:type", "owl:Class"},
		{"Material", "rdfs:label", "原材料"},
		{"supplies", "rdf:type", "owl:ObjectProperty"},
		{"supplies", "rdfs:domain", "Supplier"},
		{"supplies", "rdfs:range", "Material"},
		{"Supplier", "supplies", "Material"},
		{"Supplier__hasVariety", "rdf:type", "owl:DatatypeProperty"},
		{"Supplier__hasVariety", "rdfs:domain", "Supplier"},
		{"Supplier__hasVariety", "rdfs:label", "hasVariety"},
	}
}

func TestExtractTriplePatterns(t *testing.T) {
	cases := []struct {
		q    string
		want [][3]string
	}{
		{"SELECT ?s WHERE { ?s rdf:type owl:Class }", [][3]string{{"?s", "rdf:type", "owl:Class"}}},
		{"SELECT ?s ?o WHERE { ?s rdfs:label ?o }", [][3]string{{"?s", "rdfs:label", "?o"}}},
		{"SELECT * WHERE { ?s a :Supplier }", [][3]string{{"?s", "a", ":Supplier"}}},
		{"SELECT ?s ?o WHERE { ?s supplies ?o . ?s rdfs:label \"供应商\" }", [][3]string{
			{"?s", "supplies", "?o"}, {"?s", "rdfs:label", "\"供应商\""},
		}},
		{"SELECT ?s WHERE { ?s rdf:type owl:Class . # 注释\n }", [][3]string{{"?s", "rdf:type", "owl:Class"}}},
	}
	for _, c := range cases {
		got := extractTriplePatterns(normalizeQuery(c.q))
		if !reflect.DeepEqual(got, c.want) {
			t.Errorf("extractTriplePatterns(%q) = %v, want %v", c.q, got, c.want)
		}
	}
}

func TestMatchPatternsSingleVar(t *testing.T) {
	ts := fixtureTriples()
	rows := matchPatterns(ts, [][3]string{{"?s", "rdf:type", "owl:Class"}}, []string{"s"})
	if len(rows) != 2 { // Supplier + Material
		t.Errorf("expect 2 classes, got %d rows: %v", len(rows), rows)
	}
}

func TestMatchPatternsJoin(t *testing.T) {
	ts := fixtureTriples()
	// ?s supplies ?o . ?o rdf:type owl:Class → 1 行（Supplier→Material）
	rows := matchPatterns(ts, [][3]string{
		{"?s", "supplies", "?o"},
		{"?o", "rdf:type", "owl:Class"},
	}, []string{"s", "o"})
	if len(rows) != 1 || rows[0]["s"] != "Supplier" || rows[0]["o"] != "Material" {
		t.Errorf("join mismatch: %v", rows)
	}
}

func TestMatchPatternsSharedVarConflict(t *testing.T) {
	ts := fixtureTriples()
	// ?x supplies ?x → 要求 domain==range，应无结果
	rows := matchPatterns(ts, [][3]string{{"?x", "supplies", "?x"}}, []string{"x"})
	if len(rows) != 0 {
		t.Errorf("expect 0 rows for self-loop, got %v", rows)
	}
}

func TestNormTerm(t *testing.T) {
	cases := map[string]string{
		"a":          "rdf:type",
		":Foo":       "Foo",
		"Foo":        "Foo",
		" rdf:type ": "rdf:type",
	}
	for in, want := range cases {
		if got := normTerm(in); got != want {
			t.Errorf("normTerm(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSanitizeIRI(t *testing.T) {
	if got := sanitizeIRI("供应商"); got != "_" {
		t.Errorf("pure CJK should yield _, got %q", got)
	}
	if got := sanitizeIRI("hasVariety-2 (x)"); got != "hasVariety-2x" {
		t.Errorf("got %q", got)
	}
}

func TestXSDType(t *testing.T) {
	cases := map[string]string{
		"INT":    "xsd:integer",
		"金额":     "xsd:decimal",
		"bool":   "xsd:boolean",
		"日期":     "xsd:date",
		"string": "xsd:string",
	}
	for in, want := range cases {
		if got := xsdType(in); got != want {
			t.Errorf("xsdType(%q) = %q, want %q", in, got, want)
		}
	}
}
