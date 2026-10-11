// W3C 语义标准端点：OWL 实时生成、SKOS 导出、SWRL 规则导出、SPARQL 查询控制台。
package server

import (
	"encoding/json"
	"net/http"

	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

func mountW3C(api *http.ServeMux, st *store.Store) {
	// OWL Turtle 实时生成（对象→Class、属性→DatatypeProperty、关系→ObjectProperty）
	api.HandleFunc("GET /api/v1/ontologies/{id}/owl", func(w http.ResponseWriter, r *http.Request) {
		text, err := st.GenerateOWL(r.Context(), r.PathValue("id"))
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		w.Header().Set("Content-Type", "text/turtle; charset=utf-8")
		_, _ = w.Write([]byte(text))
	})

	// SKOS Core RDF/XML 术语导出（prefLabel/altLabel）
	api.HandleFunc("GET /api/v1/skos", func(w http.ResponseWriter, r *http.Request) {
		text, err := st.GenerateSKOS(r.Context())
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		w.Header().Set("Content-Type", "application/rdf+xml; charset=utf-8")
		_, _ = w.Write([]byte(text))
	})

	// SWRL RuleML 规则导出
	api.HandleFunc("GET /api/v1/rules/{id}/swrl", func(w http.ResponseWriter, r *http.Request) {
		text, err := st.GenerateSWRL(r.Context(), r.PathValue("id"))
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		w.Header().Set("Content-Type", "application/xml; charset=utf-8")
		_, _ = w.Write([]byte(text))
	})

	// SPARQL 查询控制台（SELECT 三元组模式绑定联查）
	api.HandleFunc("POST /api/v1/sparql", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Query string `json:"query"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Query == "" {
			writeErr(w, http.StatusBadRequest, "query 必填")
			return
		}
		out, err := st.QuerySPARQL(r.Context(), in.Query)
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		writeJSON(w, out)
	})
}
