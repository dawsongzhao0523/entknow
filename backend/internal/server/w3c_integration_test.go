//go:build integration

// W3C 标准集成测试：OWL Turtle 实时生成 / SKOS 导出 / SWRL 导出 / SPARQL 查询。
package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestW3COWLGeneration(t *testing.T) {
	h := demoServer(t)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/ontologies/scm/owl", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("owl status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	for _, want := range []string{"@prefix owl:", "a owl:Ontology", "a owl:Class", "rdfs:label"} {
		if !strings.Contains(body, want) {
			t.Fatalf("OWL Turtle 缺少 %q:\n%s", want, body[:min(len(body), 500)])
		}
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/turtle") {
		t.Fatalf("Content-Type = %q, want text/turtle", ct)
	}
}

func TestW3CSKOSExport(t *testing.T) {
	h := demoServer(t)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/skos", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("skos status = %d", rec.Code)
	}
	body := rec.Body.String()
	for _, want := range []string{"skos:ConceptScheme", "skos:Concept", "skos:prefLabel"} {
		if !strings.Contains(body, want) {
			t.Fatalf("SKOS RDF/XML 缺少 %q", want)
		}
	}
}

func TestW3CSWRLExport(t *testing.T) {
	h := demoServer(t)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/rules/R1/swrl", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("swrl status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "swrl:Imp") {
		t.Fatalf("SWRL 缺少 swrl:Imp")
	}

	// 不存在的规则 → 404
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/rules/nope/swrl", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("不存在规则应 404, got %d", rec.Code)
	}
}

func TestW3CSPARQLConsole(t *testing.T) {
	h := demoServer(t)

	// 查询所有类
	m := sparqlQuery(t, h, "SELECT ?s WHERE { ?s rdf:type owl:Class }")
	if len(m["rows"].([]any)) == 0 {
		t.Fatalf("应有 owl:Class 结果: %v", m)
	}

	// 标签联查
	m = sparqlQuery(t, h, "SELECT ?s ?label WHERE { ?s rdf:type owl:Class . ?s rdfs:label ?label }")
	rows := m["rows"].([]any)
	if len(rows) == 0 {
		t.Fatalf("类-标签联查应有结果")
	}

	// 关系查询（domain 已知谓词）
	m = sparqlQuery(t, h, "SELECT ?p ?o WHERE { ?p rdf:type owl:ObjectProperty . ?p rdfs:range ?o }")
	if len(m["rows"].([]any)) == 0 {
		t.Fatalf("ObjectProperty-range 联查应有结果: %v", m)
	}

	// 非 SELECT → 400
	rec := httptest.NewRecorder()
	body := `{"query":"ASK { ?s ?p ?o }"}`
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/sparql", strings.NewReader(body)))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("ASK 应 400（仅支持 SELECT）, got %d", rec.Code)
	}
}

func sparqlQuery(t *testing.T, h http.Handler, q string) map[string]any {
	t.Helper()
	rec := httptest.NewRecorder()
	payload, _ := json.Marshal(map[string]string{"query": q})
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/sparql", strings.NewReader(string(payload))))
	if rec.Code != http.StatusOK {
		t.Fatalf("sparql(%q) status = %d, body = %s", q, rec.Code, rec.Body.String())
	}
	var m map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatal(err)
	}
	return m
}
