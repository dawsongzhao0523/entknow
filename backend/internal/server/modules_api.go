// 模块补齐端点：数据集市 / 工作台 / 数据绑定 / 隐式收敛与对齐 / 本体成员·发布·导出·撤回 / 发布门禁 / 推理引擎。
package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

func mountModules(api *http.ServeMux, st *store.Store) {
	// ─── 数据集市 ───
	api.HandleFunc("GET /api/v1/market-items", handle(func(r *http.Request) ([]store.MarketItem, error) {
		return st.ListMarketItems(r.Context())
	}))
	api.HandleFunc("POST /api/v1/market-items", func(w http.ResponseWriter, r *http.Request) {
		var m store.MarketItem
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if m.ID == "" || m.Name == "" || m.Type == "" {
			writeErr(w, http.StatusBadRequest, "id / name / type 均为必填")
			return
		}
		out, created, err := st.CreateMarketItem(r.Context(), m)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("PUT /api/v1/market-items/{id}", func(w http.ResponseWriter, r *http.Request) {
		var m store.MarketItem
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		m.ID = r.PathValue("id")
		out, err := st.UpdateMarketItem(r.Context(), m)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/market-items/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteMarketItem(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("GET /api/v1/market-requests", handle(func(r *http.Request) ([]store.MarketRequest, error) {
		return st.ListMarketRequests(r.Context())
	}))
	api.HandleFunc("POST /api/v1/market-items/{id}/request", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID        string `json:"id"`
			Applicant string `json:"applicant"`
			Reason    string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Applicant == "" {
			writeErr(w, http.StatusBadRequest, "applicant 必填")
			return
		}
		if in.ID == "" {
			in.ID = "mr-" + strconv.FormatInt(time.Now().UnixNano()%1e9, 36)
		}
		out, created, err := st.CreateMarketRequest(r.Context(), store.MarketRequest{
			ID: in.ID, ItemID: r.PathValue("id"), Applicant: in.Applicant, Reason: in.Reason,
		})
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("PUT /api/v1/market-requests/{id}", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Action string `json:"action"` // approve | reject
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil ||
			(in.Action != "approve" && in.Action != "reject") {
			writeErr(w, http.StatusBadRequest, "action 必须为 approve / reject")
			return
		}
		out, err := st.DecideMarketRequest(r.Context(), r.PathValue("id"), in.Action)
		writeStoreResult(w, out, err)
	})

	// ─── 数据工作台 ───
	api.HandleFunc("GET /api/v1/workbench", handle(func(r *http.Request) (store.WorkbenchSnapshot, error) {
		user := r.URL.Query().Get("user")
		if user == "" {
			user = "张三"
		}
		return st.GetWorkbench(r.Context(), user)
	}))

	// ─── 数据绑定 ───
	api.HandleFunc("GET /api/v1/bindings", handle(func(r *http.Request) ([]store.Binding, error) {
		return st.ListBindings(r.Context())
	}))
	api.HandleFunc("POST /api/v1/bindings", func(w http.ResponseWriter, r *http.Request) {
		var b store.Binding
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if b.ID == "" || b.ObjectID == "" || b.ViewID == "" {
			writeErr(w, http.StatusBadRequest, "id / objectId / viewId 均为必填")
			return
		}
		out, created, err := st.CreateBinding(r.Context(), b)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("PUT /api/v1/bindings/{id}", func(w http.ResponseWriter, r *http.Request) {
		var b store.Binding
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		b.ID = r.PathValue("id")
		out, err := st.UpdateBinding(r.Context(), b)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/bindings/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteBinding(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("GET /api/v1/binding-runs", handle(func(r *http.Request) ([]store.BindingRun, error) {
		return st.ListBindingRuns(r.Context(), r.URL.Query().Get("binding"))
	}))
	api.HandleFunc("POST /api/v1/bindings/{id}/sync", func(w http.ResponseWriter, r *http.Request) {
		out, err := st.SyncBinding(r.Context(), r.PathValue("id"))
		writeStoreResult(w, out, err)
	})

	// ─── 隐式收敛与跨源对齐 ───
	api.HandleFunc("GET /api/v1/convergence/candidates", handle(func(r *http.Request) ([]store.OntoCandidate, error) {
		return st.ListCandidates(r.Context(), r.URL.Query().Get("status"))
	}))
	api.HandleFunc("POST /api/v1/convergence/generate", handle(func(r *http.Request) ([]store.OntoCandidate, error) {
		return st.GenerateCandidates(r.Context())
	}))
	api.HandleFunc("POST /api/v1/convergence/candidates/{id}/adopt", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			By string `json:"by"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.By == "" {
			in.By = "张三"
		}
		out, err := st.AdoptCandidate(r.Context(), r.PathValue("id"), in.By)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("POST /api/v1/convergence/candidates/{id}/drop", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			By string `json:"by"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.By == "" {
			in.By = "张三"
		}
		out, err := st.DropCandidate(r.Context(), r.PathValue("id"), in.By)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("GET /api/v1/alignments", handle(func(r *http.Request) ([]store.EntityAlignment, error) {
		return st.ListAlignments(r.Context(), r.URL.Query().Get("status"))
	}))
	api.HandleFunc("POST /api/v1/alignments/generate", handle(func(r *http.Request) ([]store.EntityAlignment, error) {
		return st.GenerateAlignments(r.Context())
	}))
	api.HandleFunc("POST /api/v1/alignments/{id}/decide", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Action string `json:"action"` // merge | drop
			By     string `json:"by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil ||
			(in.Action != "merge" && in.Action != "drop") {
			writeErr(w, http.StatusBadRequest, "action 必须为 merge / drop")
			return
		}
		if in.By == "" {
			in.By = "张三"
		}
		out, err := st.DecideAlignment(r.Context(), r.PathValue("id"), in.Action, in.By)
		writeStoreResult(w, out, err)
	})

	// ─── 本体成员 / 发布 / 导出 / 撤回 / 门禁 ───
	api.HandleFunc("GET /api/v1/ontologies/{id}/members", handle(func(r *http.Request) ([]store.Member, error) {
		return st.ListMembers(r.Context(), r.PathValue("id"))
	}))
	api.HandleFunc("PUT /api/v1/ontologies/{id}/members", func(w http.ResponseWriter, r *http.Request) {
		var m store.Member
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil || m.UserID == "" || m.Role == "" {
			writeErr(w, http.StatusBadRequest, "userId / role 必填")
			return
		}
		m.OntoID = r.PathValue("id")
		out, err := st.SetMember(r.Context(), m)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/ontologies/{id}/members/{user}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.RemoveMember(r.Context(), r.PathValue("id"), r.PathValue("user")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("GET /api/v1/release-gate", handle(func(r *http.Request) ([]store.GateCheck, error) {
		onto := r.URL.Query().Get("onto")
		if onto == "" {
			onto = "scm"
		}
		return st.ReleaseGate(r.Context(), onto)
	}))
	api.HandleFunc("POST /api/v1/ontologies/{id}/publish", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			By string `json:"by"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.By == "" {
			in.By = "张三"
		}
		v, checks, err := st.PublishOnto(r.Context(), r.PathValue("id"), in.By)
		if err != nil {
			// 门禁失败附带检查项，前端可直接渲染（409=门禁未过，其余按统一映射）
			code := http.StatusInternalServerError
			if errors.Is(err, store.ErrConflict) {
				code = http.StatusConflict
			} else if errors.Is(err, store.ErrInvalid) {
				code = http.StatusBadRequest
			} else if errors.Is(err, store.ErrNotFound) {
				code = http.StatusNotFound
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(code)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error(), "checks": checks})
			return
		}
		writeJSON(w, map[string]any{"version": v, "checks": checks})
	})
	api.HandleFunc("GET /api/v1/ontologies/{id}/export", func(w http.ResponseWriter, r *http.Request) {
		format := r.URL.Query().Get("format")
		if format == "" {
			format = "owl"
		}
		text, err := st.ExportOnto(r.Context(), r.PathValue("id"), format)
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte(text))
	})
	api.HandleFunc("POST /api/v1/versions/{id}/retract", func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeErr(w, http.StatusBadRequest, "版本 id 必须为数字")
			return
		}
		var in struct {
			By string `json:"by"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.By == "" {
			in.By = "张三"
		}
		out, err := st.RetractVersion(r.Context(), id, in.By)
		writeStoreResult(w, out, err)
	})

	// ─── 推理引擎 ───
	api.HandleFunc("GET /api/v1/reasoning/consistency", handle(func(r *http.Request) ([]store.ConsistencyIssue, error) {
		onto := r.URL.Query().Get("onto")
		if onto == "" {
			onto = "scm"
		}
		return st.Consistency(r.Context(), onto)
	}))
	api.HandleFunc("POST /api/v1/reasoning/run", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			RuleID string `json:"ruleId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.RuleID == "" {
			writeErr(w, http.StatusBadRequest, "ruleId 必填")
			return
		}
		out, err := st.RunRule(r.Context(), in.RuleID)
		writeStoreResult(w, out, err)
	})
}

func mountOrgPosts(api *http.ServeMux, st *store.Store) {
	// ─── 数据源连接测试 ───
	api.HandleFunc("POST /api/v1/datasources/test", handle(func(r *http.Request) (map[string]any, error) {
		var in struct {
			Host string `json:"host"`
			Type string `json:"type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Host == "" {
			return nil, fmt.Errorf("%w: host 必填", store.ErrInvalid)
		}
		// 校验连接串格式：协议://地址
		if !strings.Contains(in.Host, "://") {
			return nil, fmt.Errorf("%w: 连接串格式应为 protocol://host:port/db", store.ErrInvalid)
		}
		// 模拟连接延迟 + 返回表数（生产环境此处应真实拨测并查询表数量）
		time.Sleep(300 * time.Millisecond)
		tableCount := map[string]int{
			"MySQL": 142, "PostgreSQL": 38, "SQLServer": 96, "Oracle": 210, "ClickHouse": 24,
		}[in.Type]
		if tableCount == 0 {
			tableCount = 50
		}
		return map[string]any{"ok": true, "tables": tableCount, "latency": "12ms"}, nil
	}))

	// ─── 解析策略（非结构化加工） ───
	api.HandleFunc("GET /api/v1/parse-profiles", handle(func(r *http.Request) ([]store.ParseProfile, error) {
		return st.ListParseProfiles(r.Context())
	}))
	api.HandleFunc("POST /api/v1/parse-profiles", func(w http.ResponseWriter, r *http.Request) {
		var p store.ParseProfile
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil || p.ID == "" || p.Name == "" {
			writeErr(w, http.StatusBadRequest, "id / name 均为必填")
			return
		}
		out, created, err := st.CreateParseProfile(r.Context(), p)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("PUT /api/v1/parse-profiles/{id}", func(w http.ResponseWriter, r *http.Request) {
		var p store.ParseProfile
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil || p.Name == "" {
			writeErr(w, http.StatusBadRequest, "name 必填")
			return
		}
		p.ID = r.PathValue("id")
		out, err := st.UpdateParseProfile(r.Context(), p)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/parse-profiles/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteParseProfile(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	// ─── 传播规则创建 ───
	api.HandleFunc("POST /api/v1/rules", func(w http.ResponseWriter, r *http.Request) {
		var in store.Rule
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ID == "" || in.Def == "" {
			writeErr(w, http.StatusBadRequest, "id / def 均为必填")
			return
		}
		out, created, err := st.CreateRule(r.Context(), in)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})

	// ─── 本体创建（三初始化） ───
	api.HandleFunc("POST /api/v1/ontologies", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Scene string `json:"scene"`
			Owner string `json:"owner"`
			Init  string `json:"init"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ID == "" || in.Name == "" || in.Scene == "" {
			writeErr(w, http.StatusBadRequest, "id / name / scene 均为必填")
			return
		}
		if in.Owner == "" {
			in.Owner = "zhangsan"
		}
		out, created, err := st.CreateOntology(r.Context(), in.ID, in.Name, in.Scene, in.Owner, in.Init)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})

	// ─── 组织架构 ───
	api.HandleFunc("GET /api/v1/org-units", handle(func(r *http.Request) ([]store.OrgUnit, error) {
		return st.ListOrgUnits(r.Context())
	}))
	api.HandleFunc("POST /api/v1/org-units", func(w http.ResponseWriter, r *http.Request) {
		var u store.OrgUnit
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil || u.ID == "" || u.Name == "" {
			writeErr(w, http.StatusBadRequest, "id / name 均为必填")
			return
		}
		out, created, err := st.CreateOrgUnit(r.Context(), u)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("PUT /api/v1/org-units/{id}", func(w http.ResponseWriter, r *http.Request) {
		var u store.OrgUnit
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil || u.Name == "" {
			writeErr(w, http.StatusBadRequest, "name 必填")
			return
		}
		u.ID = r.PathValue("id")
		out, err := st.UpdateOrgUnit(r.Context(), u)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/org-units/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteOrgUnit(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("POST /api/v1/org-units/sync", handle(func(r *http.Request) (map[string]any, error) {
		return st.SyncOrgUnits(r.Context())
	}))

	// ─── 岗位 ───
	api.HandleFunc("GET /api/v1/posts", handle(func(r *http.Request) ([]store.Post, error) {
		return st.ListPosts(r.Context())
	}))
	api.HandleFunc("POST /api/v1/posts", func(w http.ResponseWriter, r *http.Request) {
		var p store.Post
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil || p.ID == "" || p.Name == "" {
			writeErr(w, http.StatusBadRequest, "id / name 均为必填")
			return
		}
		out, created, err := st.CreatePost(r.Context(), p)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("PUT /api/v1/posts/{id}", func(w http.ResponseWriter, r *http.Request) {
		var p store.Post
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil || p.Name == "" {
			writeErr(w, http.StatusBadRequest, "name 必填")
			return
		}
		p.ID = r.PathValue("id")
		out, err := st.UpdatePost(r.Context(), p)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/posts/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeletePost(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("POST /api/v1/posts/sync", handle(func(r *http.Request) (map[string]any, error) {
		return st.SyncPosts(r.Context())
	}))
}
