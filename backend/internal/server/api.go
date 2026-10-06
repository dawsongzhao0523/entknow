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
}
