// /api/v1 读接口：数据来自 store（PostgreSQL），JSON 形状与原型 mock 一致。
package server

import (
	"encoding/json"
	"errors"
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

// handle 通用列表端点包装：统一错误为 500。
func handle[T any](list func(r *http.Request) (T, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		v, err := list(r)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeErr(w, http.StatusNotFound, "not found")
				return
			}
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, v)
	}
}

// MountAPI 把 /api/v1 读端点挂到 mux。
func MountAPI(mux *http.ServeMux, st *store.Store) {
	mux.HandleFunc("GET /api/v1/ontologies", handle(func(r *http.Request) ([]store.Ontology, error) {
		user := r.URL.Query().Get("user")
		if user == "" {
			user = "zhangsan"
		}
		return st.ListOntologies(r.Context(), user)
	}))
	mux.HandleFunc("GET /api/v1/role-matrix", handle(func(*http.Request) (any, error) {
		return RoleMatrix, nil
	}))
	mux.HandleFunc("GET /api/v1/objects", handle(func(r *http.Request) ([]store.Object, error) {
		return st.ListObjects(r.Context(), r.URL.Query().Get("scope"))
	}))
	mux.HandleFunc("GET /api/v1/edges", handle(func(r *http.Request) ([]store.Edge, error) {
		return st.ListEdges(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/functions", handle(func(r *http.Request) ([]store.Func, error) {
		return st.ListFuncs(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/views", handle(func(r *http.Request) ([]store.View, error) {
		return st.ListViews(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/datasources", handle(func(r *http.Request) ([]store.Datasource, error) {
		return st.ListDatasources(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/rules", handle(func(r *http.Request) ([]store.Rule, error) {
		return st.ListRules(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/reviews", handle(func(r *http.Request) ([]store.Review, error) {
		return st.ListReviews(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/notifications", handle(func(r *http.Request) ([]store.Notification, error) {
		return st.ListNotifications(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/users", handle(func(r *http.Request) ([]store.User, error) {
		return st.ListUsers(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/capabilities", handle(func(r *http.Request) ([]store.Capability, error) {
		return st.ListCapabilities(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/versions", handle(func(r *http.Request) ([]store.Version, error) {
		onto := r.URL.Query().Get("onto")
		if onto == "" {
			onto = "scm"
		}
		return st.ListVersions(r.Context(), onto)
	}))
	mux.HandleFunc("GET /api/v1/table-profiles/{name}", handle(func(r *http.Request) (store.TableProfile, error) {
		return st.GetTableProfile(r.Context(), r.PathValue("name"))
	}))

	// ─── 评审流转（写路径） ───

	mux.HandleFunc("POST /api/v1/reviews", func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("PUT /api/v1/reviews/{id}/decision", func(w http.ResponseWriter, r *http.Request) {
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

	// ─── M2 知识运营 ───

	mux.HandleFunc("GET /api/v1/kb/domains", handle(func(r *http.Request) ([]store.KbDomain, error) {
		return st.ListKbDomains(r.Context())
	}))
	mux.HandleFunc("GET /api/v1/kb/entries", handle(func(r *http.Request) ([]store.KbEntry, error) {
		q := r.URL.Query()
		return st.ListKbEntries(r.Context(), q.Get("domain"), q.Get("kw"))
	}))
	mux.HandleFunc("GET /api/v1/kb/entries/{id}", handle(func(r *http.Request) (store.KbEntry, error) {
		return st.GetKbEntry(r.Context(), r.PathValue("id"))
	}))

	mux.HandleFunc("POST /api/v1/kb/entries", func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("PUT /api/v1/kb/entries/{id}", func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("DELETE /api/v1/kb/entries/{id}", func(w http.ResponseWriter, r *http.Request) {
		out, err := st.DeleteKbEntry(r.Context(), r.PathValue("id"))
		writeStoreResult(w, out, err)
	})

	mux.HandleFunc("GET /api/v1/synonyms", handle(func(r *http.Request) ([]store.Synonym, error) {
		return st.ListSynonyms(r.Context(), r.URL.Query().Get("status"))
	}))
	mux.HandleFunc("POST /api/v1/synonyms/{id}/merge", func(w http.ResponseWriter, r *http.Request) {
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

	// ─── M4 本体运行时 ───

	mux.HandleFunc("GET /api/v1/instances", handle(func(r *http.Request) ([]store.Instance, error) {
		q := r.URL.Query()
		return st.ListInstances(r.Context(), q.Get("object"), q.Get("kw"))
	}))
	mux.HandleFunc("GET /api/v1/instances/{id}", handle(func(r *http.Request) (store.Instance, error) {
		return st.GetInstance(r.Context(), r.PathValue("id"))
	}))
	mux.HandleFunc("POST /api/v1/instances/{id}/events", func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("GET /api/v1/rule-firings", handle(func(r *http.Request) ([]store.RuleFiring, error) {
		return st.ListRuleFirings(r.Context(), r.URL.Query().Get("rule"))
	}))
	mux.HandleFunc("POST /api/v1/rule-firings", func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("GET /api/v1/actions", handle(func(r *http.Request) ([]store.Action, error) {
		return st.ListActions(r.Context(), r.URL.Query().Get("instance"))
	}))
	mux.HandleFunc("POST /api/v1/actions", func(w http.ResponseWriter, r *http.Request) {
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

	// ─── M9 组织与权限 ───

	mux.HandleFunc("GET /api/v1/roles", handle(func(r *http.Request) ([]store.Role, error) {
		return st.ListRoles(r.Context())
	}))
	mux.HandleFunc("POST /api/v1/roles", func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("PUT /api/v1/roles/{id}", func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("DELETE /api/v1/roles/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteRole(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("POST /api/v1/users", func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("PUT /api/v1/users/{id}", func(w http.ResponseWriter, r *http.Request) {
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
}

// writeStoreResult 统一写端点错误映射：404 / 409 / 403 / 400 / 500。
func writeStoreResult(w http.ResponseWriter, out any, err error) {
	switch {
	case err == nil:
		writeJSON(w, out)
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
