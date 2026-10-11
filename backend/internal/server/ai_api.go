// AI 驱动建模端点：LLM 对话、AI 本体生成、29 句话模板、知识萃取。
package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/dawsongzhao0523/entknow/backend/internal/llm"
	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

func mountAI(api *http.ServeMux, st *store.Store, llmc *llm.Client) {
	// LLM 配置探针（前端展示当前接入状态，不泄露 key）
	api.HandleFunc("GET /api/v1/llm/status", handle(func(*http.Request) (any, error) {
		return llmc.Describe(), nil
	}))

	// 统一 LLM 对话端点
	api.HandleFunc("POST /api/v1/llm/chat", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			System string `json:"system"`
			User   string `json:"user"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.User) == "" {
			writeErr(w, http.StatusBadRequest, "user 消息必填")
			return
		}
		if !llmc.Enabled() {
			writeErr(w, http.StatusServiceUnavailable, "LLM 未配置：请设置 ENTKNOW_LLM_PROVIDER/ENTKNOW_LLM_API_KEY（支持 openai/anthropic/ollama）")
			return
		}
		reply, err := llmc.Chat(r.Context(), in.System, in.User)
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		writeJSON(w, map[string]string{"reply": reply})
	})

	// AI 本体生成：preview=true 仅预览；apply=true 直接入库
	api.HandleFunc("POST /api/v1/modeling/ai-generate", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Input     string `json:"input"`
			Apply     bool   `json:"apply"`
			Ontology  string `json:"ontology"`
			By        string `json:"by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Input) == "" {
			writeErr(w, http.StatusBadRequest, "input（场景描述）必填")
			return
		}
		draft, err := st.AIGenerate(r.Context(), llmc, in.Input)
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		if !in.Apply {
			writeJSON(w, draft)
			return
		}
		out, err := st.ApplyAIDraft(r.Context(), draft, in.Ontology, in.By)
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		writeJSON(w, out)
	})

	// 29 句话模板库
	api.HandleFunc("GET /api/v1/templates", handle(func(*http.Request) ([]store.Template, error) {
		return st.ListTemplates(), nil
	}))
	api.HandleFunc("GET /api/v1/templates/categories", handle(func(*http.Request) ([]map[string]any, error) {
		return store.TemplateCategories(), nil
	}))

	// 知识萃取：从知识条目提取候选对象/关系（进入隐式收敛裁决流）
	api.HandleFunc("POST /api/v1/kb/entries/{id}/extract", handle(func(r *http.Request) (any, error) {
		return st.ExtractKbEntry(r.Context(), r.PathValue("id"), llmc)
	}))
}
