// /api/v1 读接口：数据来自 store（PostgreSQL），JSON 形状与原型 mock 一致。
package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

// RoleMatrix 角色权限矩阵（规约常量，不进库），形状 = 原型 ROLE_MATRIX。
var RoleMatrix = []struct {
	Cap   string          `json:"cap"`
	Roles map[string]bool `json:"roles"`
}{
	{"检索与查看元素（含无引用权限元素）", map[string]bool{"所有者": true, "建模者": true, "评审者": true, "查看者": true}},
	{"引用元素到画布（仅 PUBLISHED 且有引用权限）", map[string]bool{"所有者": true, "建模者": true, "评审者": false, "查看者": false}},
	{"编辑草稿（对象/关系/函数）", map[string]bool{"所有者": true, "建模者": true, "评审者": false, "查看者": false}},
	{"提交评审", map[string]bool{"所有者": true, "建模者": true, "评审者": false, "查看者": false}},
	{"评审通过 / 驳回", map[string]bool{"所有者": true, "建模者": false, "评审者": true, "查看者": false}},
	{"发布版本", map[string]bool{"所有者": true, "建模者": false, "评审者": false, "查看者": false}},
	{"成员与授权管理", map[string]bool{"所有者": true, "建模者": false, "评审者": false, "查看者": false}},
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// handle 通用读端点包装：store 错误统一映射（404/409/403/400/500）。
func handle[T any](list func(r *http.Request) (T, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		v, err := list(r)
		if err != nil {
			mapStoreErr(w, err)
			return
		}
		writeJSON(w, v)
	}
}

// mapStoreErr store 层错误 → HTTP 状态码。
func mapStoreErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeErr(w, http.StatusNotFound, "资源不存在")
	case errors.Is(err, store.ErrConflict):
		writeErr(w, http.StatusConflict, err.Error())
	case errors.Is(err, store.ErrForbidden):
		writeErr(w, http.StatusForbidden, err.Error())
	case errors.Is(err, store.ErrInvalid):
		writeErr(w, http.StatusBadRequest, err.Error())
	default:
		writeErr(w, http.StatusInternalServerError, err.Error())
	}
}

// MountAPI 把 /api/v1 端点挂到 mux：全部注册进子 mux，再经审计中间件包装（写操作自动落审计）。
// ServeMux 注册顺序与匹配无关，子 mux 的挂载可先于具体路由完成。
func MountAPI(mux *http.ServeMux, st *store.Store) {
	api := http.NewServeMux()
	mux.Handle("/api/", withAudit(st, api))
	mountSysAdmin(api, st)
	mountModules(api, st)
	mountOrgPosts(api, st)
	api.HandleFunc("GET /api/v1/ontologies", handle(func(r *http.Request) ([]store.Ontology, error) {
		user := r.URL.Query().Get("user")
		if user == "" {
			user = "zhangsan"
		}
		return st.ListOntologies(r.Context(), user)
	}))
	api.HandleFunc("GET /api/v1/role-matrix", handle(func(*http.Request) (any, error) {
		return RoleMatrix, nil
	}))
	api.HandleFunc("GET /api/v1/objects", handle(func(r *http.Request) ([]store.Object, error) {
		return st.ListObjects(r.Context(), r.URL.Query().Get("scope"))
	}))
	api.HandleFunc("GET /api/v1/edges", handle(func(r *http.Request) ([]store.Edge, error) {
		return st.ListEdges(r.Context())
	}))
	api.HandleFunc("GET /api/v1/functions", handle(func(r *http.Request) ([]store.Func, error) {
		return st.ListFuncs(r.Context())
	}))
	api.HandleFunc("GET /api/v1/views", handle(func(r *http.Request) ([]store.View, error) {
		return st.ListViews(r.Context())
	}))
	api.HandleFunc("GET /api/v1/datasources", handle(func(r *http.Request) ([]store.Datasource, error) {
		return st.ListDatasources(r.Context())
	}))
	api.HandleFunc("GET /api/v1/rules", handle(func(r *http.Request) ([]store.Rule, error) {
		return st.ListRules(r.Context())
	}))
	api.HandleFunc("GET /api/v1/reviews", handle(func(r *http.Request) ([]store.Review, error) {
		return st.ListReviews(r.Context())
	}))
	api.HandleFunc("GET /api/v1/notifications", handle(func(r *http.Request) ([]store.Notification, error) {
		return st.ListNotifications(r.Context())
	}))
	api.HandleFunc("GET /api/v1/users", handle(func(r *http.Request) ([]store.User, error) {
		return st.ListUsers(r.Context())
	}))
	api.HandleFunc("GET /api/v1/capabilities", handle(func(r *http.Request) ([]store.Capability, error) {
		return st.ListCapabilities(r.Context())
	}))
	api.HandleFunc("GET /api/v1/versions", handle(func(r *http.Request) ([]store.Version, error) {
		onto := r.URL.Query().Get("onto")
		if onto == "" {
			onto = "scm"
		}
		return st.ListVersions(r.Context(), onto)
	}))
	api.HandleFunc("GET /api/v1/table-profiles/{name}", handle(func(r *http.Request) (store.TableProfile, error) {
		return st.GetTableProfile(r.Context(), r.PathValue("name"))
	}))

	// ─── 评审流转（写路径） ───

	api.HandleFunc("POST /api/v1/reviews", func(w http.ResponseWriter, r *http.Request) {
		var in store.Review
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.ID == "" || in.Title == "" || in.Type == "" || in.From == "" {
			writeErr(w, http.StatusBadRequest, "id / title / type / from 均为必填")
			return
		}
		out, created, err := st.CreateReview(r.Context(), in)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})

	api.HandleFunc("PUT /api/v1/reviews/{id}/decision", func(w http.ResponseWriter, r *http.Request) {
		var d store.Decision
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		d.ReviewID = r.PathValue("id")
		if d.Action == "" || d.By == "" {
			writeErr(w, http.StatusBadRequest, "action / by 均为必填")
			return
		}
		if d.Action == "reject" && d.Comment == "" {
			writeErr(w, http.StatusBadRequest, "驳回必须填写原因（comment）")
			return
		}
		out, err := st.DecideReview(r.Context(), d)
		switch {
		case errors.Is(err, store.ErrNotFound):
			writeErr(w, http.StatusNotFound, "评审不存在")
		case errors.Is(err, store.ErrConflict):
			writeErr(w, http.StatusConflict, err.Error())
		case err != nil:
			writeErr(w, http.StatusInternalServerError, err.Error())
		default:
			writeJSON(w, out)
		}
	})

	// ─── 知识运营 ───

	api.HandleFunc("GET /api/v1/kb/domains", handle(func(r *http.Request) ([]store.KbDomain, error) {
		return st.ListKbDomains(r.Context())
	}))
	api.HandleFunc("GET /api/v1/kb/entries", handle(func(r *http.Request) ([]store.KbEntry, error) {
		q := r.URL.Query()
		return st.ListKbEntries(r.Context(), q.Get("domain"), q.Get("kw"))
	}))
	api.HandleFunc("GET /api/v1/kb/entries/{id}", handle(func(r *http.Request) (store.KbEntry, error) {
		return st.GetKbEntry(r.Context(), r.PathValue("id"))
	}))

	api.HandleFunc("POST /api/v1/kb/entries", func(w http.ResponseWriter, r *http.Request) {
		var e store.KbEntry
		if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if e.ID == "" || e.Title == "" || e.DomainID == "" {
			writeErr(w, http.StatusBadRequest, "id / title / domainId 均为必填")
			return
		}
		if e.Status != "" && e.Status != "待评审" {
			writeErr(w, http.StatusBadRequest, "新建条目状态只能为「待评审」或不填")
			return
		}
		out, created, err := st.CreateKbEntry(r.Context(), e)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !created {
			w.Header().Set("X-Idempotent-Replay", "true")
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})

	api.HandleFunc("PUT /api/v1/kb/entries/{id}", func(w http.ResponseWriter, r *http.Request) {
		var e store.KbEntry
		if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		e.ID = r.PathValue("id")
		if e.Title == "" || e.DomainID == "" {
			writeErr(w, http.StatusBadRequest, "title / domainId 均为必填")
			return
		}
		if e.Status != "待评审" && e.Status != "已评审" { // 全量替换：status 必填；已失效只能经 DELETE
			writeErr(w, http.StatusBadRequest, "status 必填，只允许 待评审 / 已评审")
			return
		}
		if e.ExpectedVersion <= 0 {
			writeErr(w, http.StatusBadRequest, "expectedVersion 必填（乐观并发）")
			return
		}
		out, err := st.UpdateKbEntry(r.Context(), e, e.ExpectedVersion)
		writeStoreResult(w, out, err)
	})

	api.HandleFunc("DELETE /api/v1/kb/entries/{id}", func(w http.ResponseWriter, r *http.Request) {
		out, err := st.DeleteKbEntry(r.Context(), r.PathValue("id"))
		writeStoreResult(w, out, err)
	})

	api.HandleFunc("GET /api/v1/synonyms", handle(func(r *http.Request) ([]store.Synonym, error) {
		return st.ListSynonyms(r.Context(), r.URL.Query().Get("status"))
	}))
	api.HandleFunc("POST /api/v1/synonyms/{id}/merge", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Standard string `json:"standard"`
			By       string `json:"by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.Standard == "" || in.By == "" {
			writeErr(w, http.StatusBadRequest, "standard / by 均为必填")
			return
		}
		out, err := st.MergeSynonym(r.Context(), r.PathValue("id"), in.Standard, in.By)
		writeStoreResult(w, out, err)
	})

	// ─── 本体运行时 ───

	api.HandleFunc("GET /api/v1/instances", handle(func(r *http.Request) ([]store.Instance, error) {
		q := r.URL.Query()
		return st.ListInstances(r.Context(), q.Get("object"), q.Get("kw"))
	}))
	api.HandleFunc("GET /api/v1/instances/{id}", handle(func(r *http.Request) (store.Instance, error) {
		return st.GetInstance(r.Context(), r.PathValue("id"))
	}))
	api.HandleFunc("POST /api/v1/instances/{id}/events", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			T string `json:"t"`
			E string `json:"e"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.T == "" || in.E == "" {
			writeErr(w, http.StatusBadRequest, "t / e 均为必填")
			return
		}
		out, err := st.AppendInstanceEvent(r.Context(), r.PathValue("id"), in.T, in.E)
		writeStoreResult(w, out, err)
	})

	api.HandleFunc("GET /api/v1/rule-firings", handle(func(r *http.Request) ([]store.RuleFiring, error) {
		return st.ListRuleFirings(r.Context(), r.URL.Query().Get("rule"))
	}))
	api.HandleFunc("POST /api/v1/rule-firings", func(w http.ResponseWriter, r *http.Request) {
		var f store.RuleFiring
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if f.ID == "" || f.RuleID == "" || f.Detail == "" {
			writeErr(w, http.StatusBadRequest, "id / ruleId / detail 均为必填")
			return
		}
		out, created, err := st.CreateRuleFiring(r.Context(), f)
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

	api.HandleFunc("GET /api/v1/actions", handle(func(r *http.Request) ([]store.Action, error) {
		return st.ListActions(r.Context(), r.URL.Query().Get("instance"))
	}))
	api.HandleFunc("POST /api/v1/actions", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID         string `json:"id"`
			FuncID     string `json:"funcId"`
			InstanceID string `json:"instanceId"`
			User       string `json:"user"`
			Trigger    string `json:"trigger"`
			Confirm    bool   `json:"confirm"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.ID == "" || in.FuncID == "" || in.InstanceID == "" || in.User == "" {
			writeErr(w, http.StatusBadRequest, "id / funcId / instanceId / user 均为必填")
			return
		}
		out, created, err := st.ExecuteAction(r.Context(), store.ActionRequest{
			ID: in.ID, FuncID: in.FuncID, InstanceID: in.InstanceID,
			User: in.User, Trigger: in.Trigger, Confirm: in.Confirm,
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

	// ─── 组织与权限 ───

	api.HandleFunc("GET /api/v1/roles", handle(func(r *http.Request) ([]store.Role, error) {
		return st.ListRoles(r.Context())
	}))
	api.HandleFunc("POST /api/v1/roles", func(w http.ResponseWriter, r *http.Request) {
		var role store.Role
		if err := json.NewDecoder(r.Body).Decode(&role); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if role.ID == "" || role.Name == "" {
			writeErr(w, http.StatusBadRequest, "id / name 均为必填")
			return
		}
		out, created, err := st.CreateRole(r.Context(), role)
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
	api.HandleFunc("PUT /api/v1/roles/{id}", func(w http.ResponseWriter, r *http.Request) {
		var role store.Role
		if err := json.NewDecoder(r.Body).Decode(&role); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		role.ID = r.PathValue("id")
		if role.Name == "" {
			writeErr(w, http.StatusBadRequest, "name 必填")
			return
		}
		out, err := st.UpdateRole(r.Context(), role)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/roles/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteRole(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	api.HandleFunc("POST /api/v1/users", func(w http.ResponseWriter, r *http.Request) {
		var u store.User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if u.ID == "" || u.Account == "" || u.Name == "" {
			writeErr(w, http.StatusBadRequest, "id / account / name 均为必填")
			return
		}
		if u.Status != "" && u.Status != "正常" {
			writeErr(w, http.StatusBadRequest, "新建用户状态只能为「正常」或不填")
			return
		}
		out, created, err := st.CreateUser(r.Context(), u)
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
	api.HandleFunc("PUT /api/v1/users/{id}", func(w http.ResponseWriter, r *http.Request) {
		var u store.User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		u.ID = r.PathValue("id")
		if u.Account == "" || u.Name == "" {
			writeErr(w, http.StatusBadRequest, "account / name 均为必填")
			return
		}
		if u.Status != "正常" && u.Status != "停用" {
			writeErr(w, http.StatusBadRequest, "status 只允许 正常 / 停用")
			return
		}
		out, err := st.UpdateUser(r.Context(), u)
		writeStoreResult(w, out, err)
	})

	// ─── 能力出口 ───

	api.HandleFunc("POST /api/v1/capabilities", func(w http.ResponseWriter, r *http.Request) {
		var c store.Capability
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if c.ID == "" || c.Name == "" || c.Proto == "" {
			writeErr(w, http.StatusBadRequest, "id / name / proto 均为必填")
			return
		}
		out, created, err := st.CreateCapability(r.Context(), c)
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
	api.HandleFunc("PUT /api/v1/capabilities/{id}", func(w http.ResponseWriter, r *http.Request) {
		var c store.Capability
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		c.ID = r.PathValue("id")
		if c.Name == "" || c.Proto == "" {
			writeErr(w, http.StatusBadRequest, "name / proto 必填")
			return
		}
		out, err := st.UpdateCapability(r.Context(), c)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/capabilities/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteCapability(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("POST /api/v1/capabilities/{id}/invoke", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID        string `json:"id"`
			Caller    string `json:"caller"`
			Status    string `json:"status"`
			LatencyMs int    `json:"latencyMs"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.ID == "" || in.Caller == "" {
			writeErr(w, http.StatusBadRequest, "id / caller 均为必填")
			return
		}
		if in.Status != "" && in.Status != "ok" && in.Status != "error" {
			writeErr(w, http.StatusBadRequest, "status 只允许 ok / error")
			return
		}
		out, err := st.InvokeCapability(r.Context(), store.CapabilityCall{
			ID: in.ID, CapabilityID: r.PathValue("id"), Caller: in.Caller,
			Status: in.Status, LatencyMs: in.LatencyMs,
		})
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("GET /api/v1/capabilities/{id}/calls", handle(func(r *http.Request) ([]store.CapabilityCall, error) {
		limit := 0
		if v := r.URL.Query().Get("limit"); v != "" {
			fmt.Sscanf(v, "%d", &limit)
		}
		return st.ListCapabilityCalls(r.Context(), r.PathValue("id"), limit)
	}))

	// ─── 语义查询 ───

	api.HandleFunc("GET /api/v1/search", handle(func(r *http.Request) (store.SearchResults, error) {
		q := r.URL.Query().Get("q")
		if q == "" {
			return store.SearchResults{}, store.ErrInvalid
		}
		return st.Search(r.Context(), q)
	}))
	api.HandleFunc("POST /api/v1/queries", func(w http.ResponseWriter, r *http.Request) {
		var in store.QueryRecord
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.ID == "" || in.Question == "" || in.By == "" {
			writeErr(w, http.StatusBadRequest, "id / question / by 均为必填")
			return
		}
		out, err := st.ExecuteQuery(r.Context(), in)
		if err != nil {
			writeStoreResult(w, out, err)
			return
		}
		w.WriteHeader(http.StatusCreated)
		writeJSON(w, out)
	})
	api.HandleFunc("GET /api/v1/queries", handle(func(r *http.Request) ([]store.QueryRecord, error) {
		limit := 0
		if v := r.URL.Query().Get("limit"); v != "" {
			fmt.Sscanf(v, "%d", &limit)
		}
		return st.ListQueries(r.Context(), r.URL.Query().Get("by"), limit)
	}))

	// ─── 数据资产运营 ───

	api.HandleFunc("POST /api/v1/datasources", func(w http.ResponseWriter, r *http.Request) {
		var d store.Datasource
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if d.ID == "" || d.Name == "" || d.Type == "" || d.Owner == "" {
			writeErr(w, http.StatusBadRequest, "id / name / type / owner 均为必填")
			return
		}
		out, created, err := st.CreateDatasource(r.Context(), d)
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
	api.HandleFunc("PUT /api/v1/datasources/{id}", func(w http.ResponseWriter, r *http.Request) {
		var d store.Datasource
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		d.ID = r.PathValue("id")
		if d.Name == "" || d.Owner == "" {
			writeErr(w, http.StatusBadRequest, "name / owner 必填")
			return
		}
		out, err := st.UpdateDatasource(r.Context(), d)
		writeStoreResult(w, out, err)
	})

	api.HandleFunc("POST /api/v1/views", func(w http.ResponseWriter, r *http.Request) {
		var v store.View
		if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if v.ID == "" || v.Name == "" || v.Owner == "" {
			writeErr(w, http.StatusBadRequest, "id / name / owner 均为必填")
			return
		}
		if v.Status == "" {
			v.Status = "DRAFT"
		}
		if v.Version == "" {
			v.Version = "v1"
		}
		out, created, err := st.CreateView(r.Context(), v)
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
	api.HandleFunc("PUT /api/v1/views/{id}", func(w http.ResponseWriter, r *http.Request) {
		var v store.View
		if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		v.ID = r.PathValue("id")
		if v.Name == "" || v.Owner == "" || v.Status == "" {
			writeErr(w, http.StatusBadRequest, "name / owner / status 必填")
			return
		}
		out, err := st.UpdateView(r.Context(), v)
		writeStoreResult(w, out, err)
	})

	api.HandleFunc("GET /api/v1/pipeline-tasks", handle(func(r *http.Request) ([]store.PipelineTask, error) {
		return st.ListPipelineTasks(r.Context())
	}))
	api.HandleFunc("POST /api/v1/pipeline-tasks", func(w http.ResponseWriter, r *http.Request) {
		var p store.PipelineTask
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if p.ID == "" || p.Name == "" || p.Type == "" {
			writeErr(w, http.StatusBadRequest, "id / name / type 均为必填")
			return
		}
		out, created, err := st.CreatePipelineTask(r.Context(), p)
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
	api.HandleFunc("PUT /api/v1/pipeline-tasks/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Status == "" {
			writeErr(w, http.StatusBadRequest, "status 必填")
			return
		}
		out, err := st.UpdatePipelineTaskStatus(r.Context(), r.PathValue("id"), in.Status)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("POST /api/v1/pipeline-tasks/{id}/run", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID     string `json:"id"`
			Detail string `json:"detail"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ID == "" {
			writeErr(w, http.StatusBadRequest, "id（运行ID）必填")
			return
		}
		task, run, err := st.RunPipelineTask(r.Context(), store.PipelineRun{
			ID: in.ID, TaskID: r.PathValue("id"), Detail: in.Detail,
		})
		if err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		writeJSON(w, map[string]any{"task": task, "run": run})
	})
	api.HandleFunc("GET /api/v1/pipeline-runs", handle(func(r *http.Request) ([]store.PipelineRun, error) {
		return st.ListPipelineRuns(r.Context(), r.URL.Query().Get("task"))
	}))

	// ─── 本体设计器 ───

	api.HandleFunc("POST /api/v1/objects", func(w http.ResponseWriter, r *http.Request) {
		var o store.Object
		if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if o.ID == "" || o.Name == "" || o.En == "" || o.Owner == "" {
			writeErr(w, http.StatusBadRequest, "id / name / en / owner 均为必填")
			return
		}
		out, created, err := st.CreateObject(r.Context(), o)
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
	api.HandleFunc("PUT /api/v1/objects/{id}", func(w http.ResponseWriter, r *http.Request) {
		var o store.Object
		if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		o.ID = r.PathValue("id")
		if o.Name == "" || o.En == "" {
			writeErr(w, http.StatusBadRequest, "name / en 必填")
			return
		}
		out, err := st.UpdateObject(r.Context(), o)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("POST /api/v1/edges", func(w http.ResponseWriter, r *http.Request) {
		var e store.Edge
		if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if e.ID == "" || e.Name == "" || e.From == "" || e.To == "" {
			writeErr(w, http.StatusBadRequest, "id / name / from / to 均为必填")
			return
		}
		out, created, err := st.CreateEdge(r.Context(), e)
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
	api.HandleFunc("PUT /api/v1/edges/{id}", func(w http.ResponseWriter, r *http.Request) {
		var e store.Edge
		if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		e.ID = r.PathValue("id")
		if e.Name == "" || e.From == "" || e.To == "" {
			writeErr(w, http.StatusBadRequest, "name / from / to 必填")
			return
		}
		out, err := st.UpdateEdge(r.Context(), e)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("POST /api/v1/functions", func(w http.ResponseWriter, r *http.Request) {
		var f store.Func
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if f.ID == "" || f.Name == "" || f.Signature == "" {
			writeErr(w, http.StatusBadRequest, "id / name / signature 均为必填")
			return
		}
		out, created, err := st.CreateFunc(r.Context(), f)
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
	api.HandleFunc("PUT /api/v1/functions/{id}", func(w http.ResponseWriter, r *http.Request) {
		var f store.Func
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		f.ID = r.PathValue("id")
		if f.Name == "" || f.Cat == "" {
			writeErr(w, http.StatusBadRequest, "name / cat 必填")
			return
		}
		out, err := st.UpdateFunc(r.Context(), f)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("POST /api/v1/elements/{type}/{id}/transition", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Action string `json:"action"`
			By     string `json:"by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Action == "" {
			writeErr(w, http.StatusBadRequest, "action 必填")
			return
		}
		out, err := st.TransitionElement(r.Context(), r.PathValue("type"), r.PathValue("id"), in.Action, in.By)
		writeStoreResult(w, out, err)
	})

	// ─── 推演沙盘 ───

	api.HandleFunc("GET /api/v1/sandbox-branches", handle(func(r *http.Request) ([]store.SandboxBranch, error) {
		return st.ListSandboxBranches(r.Context())
	}))
	api.HandleFunc("POST /api/v1/sandbox-branches", func(w http.ResponseWriter, r *http.Request) {
		var b store.SandboxBranch
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if b.ID == "" || b.Name == "" || b.Hypothesis == "" {
			writeErr(w, http.StatusBadRequest, "id / name / hypothesis 均为必填")
			return
		}
		out, created, err := st.CreateSandboxBranch(r.Context(), b)
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
	api.HandleFunc("POST /api/v1/sandbox-branches/{id}/simulate", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			RiskAfter int    `json:"riskAfter"`
			Cost      string `json:"cost"`
			Note      string `json:"note"`
			By        string `json:"by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if in.By == "" {
			writeErr(w, http.StatusBadRequest, "by 必填")
			return
		}
		out, err := st.SimulateBranch(r.Context(), r.PathValue("id"), in.RiskAfter, in.Cost, in.Note, in.By)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("POST /api/v1/sandbox-branches/{id}/rollback", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			By string `json:"by"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.By == "" {
			writeErr(w, http.StatusBadRequest, "by 必填")
			return
		}
		out, err := st.RollbackBranch(r.Context(), r.PathValue("id"), in.By)
		writeStoreResult(w, out, err)
	})
}

// writeStoreResult 写端点结果：成功写 JSON，失败走统一错误映射。
func writeStoreResult(w http.ResponseWriter, out any, err error) {
	if err != nil {
		mapStoreErr(w, err)
		return
	}
	writeJSON(w, out)
}
