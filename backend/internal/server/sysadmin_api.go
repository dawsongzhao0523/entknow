// 系统管理端点：总览聚合 / 菜单 / 行级规则 / 敏感级 / 依赖服务巡检 / 审计查询导出 / 个性化设置。
package server

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

func mountSysAdmin(api *http.ServeMux, st *store.Store) {
	// ─── 系统运营总览 ───
	api.HandleFunc("GET /api/v1/admin/stats", handle(func(r *http.Request) (store.StatsSnapshot, error) {
		return st.Stats(r.Context())
	}))

	// ─── 菜单管理 ───
	api.HandleFunc("GET /api/v1/menus", handle(func(r *http.Request) ([]store.Menu, error) {
		return st.ListMenus(r.Context(), r.URL.Query().Get("user"))
	}))
	api.HandleFunc("POST /api/v1/menus", func(w http.ResponseWriter, r *http.Request) {
		var m store.Menu
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if m.ID == "" || m.Name == "" {
			writeErr(w, http.StatusBadRequest, "id / name 均为必填")
			return
		}
		if m.ParentID == m.ID {
			writeErr(w, http.StatusBadRequest, "parent_id 不能等于自身 id")
			return
		}
		out, created, err := st.CreateMenu(r.Context(), m)
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
	// 菜单 id 形如 assets/datasources（含斜杠），需多段通配 {id...} 才能整段取回
	api.HandleFunc("PUT /api/v1/menus/{id...}", func(w http.ResponseWriter, r *http.Request) {
		var m store.Menu
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		m.ID = r.PathValue("id")
		if m.Name == "" {
			writeErr(w, http.StatusBadRequest, "name 必填")
			return
		}
		out, err := st.UpdateMenu(r.Context(), m)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/menus/{id...}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteMenu(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	// ─── 行级数据权限规则 ───
	api.HandleFunc("GET /api/v1/data-rules", handle(func(r *http.Request) ([]store.DataRule, error) {
		return st.ListDataRules(r.Context())
	}))
	api.HandleFunc("POST /api/v1/data-rules", func(w http.ResponseWriter, r *http.Request) {
		var d store.DataRule
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if d.ID == "" || d.Target == "" || d.Rule == "" || d.Role == "" {
			writeErr(w, http.StatusBadRequest, "id / target / rule / role 均为必填")
			return
		}
		out, created, err := st.CreateDataRule(r.Context(), d)
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
	api.HandleFunc("PUT /api/v1/data-rules/{id}", func(w http.ResponseWriter, r *http.Request) {
		var d store.DataRule
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		d.ID = r.PathValue("id")
		if d.Target == "" || d.Rule == "" || d.Role == "" {
			writeErr(w, http.StatusBadRequest, "target / rule / role 均为必填")
			return
		}
		out, err := st.UpdateDataRule(r.Context(), d)
		writeStoreResult(w, out, err)
	})
	api.HandleFunc("DELETE /api/v1/data-rules/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := st.DeleteDataRule(r.Context(), r.PathValue("id")); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	// ─── 敏感级继承（只读推导） ───
	api.HandleFunc("GET /api/v1/sensitivity", handle(func(r *http.Request) ([]store.SensRow, error) {
		return st.ListSensitivity(r.Context())
	}))

	// ─── 依赖服务监控 ───
	api.HandleFunc("GET /api/v1/dep-services", handle(func(r *http.Request) ([]store.DepService, error) {
		return st.ListDepServices(r.Context())
	}))
	api.HandleFunc("GET /api/v1/dep-services/uptime", handle(func(r *http.Request) ([]store.UptimePoint, error) {
		return st.Uptime7d(r.Context())
	}))
	api.HandleFunc("POST /api/v1/dep-services/inspect", handle(func(r *http.Request) ([]store.DepService, error) {
		return st.InspectAll(r.Context())
	}))

	// ─── 审计日志：查询 / 导出 ───
	// 日志权限门：审计日志（governance|admin）/ 系统日志（admin）；user 缺省 zhangsan
	logUser := func(r *http.Request) string {
		u := r.URL.Query().Get("user")
		if u == "" {
			u = "zhangsan"
		}
		return u
	}
	requireLogAccess := func(w http.ResponseWriter, r *http.Request, keys ...string) bool {
		allowed := map[string]bool{}
		if err := st.UserModulePerms(r.Context(), logUser(r), allowed); err != nil {
			mapStoreErr(w, err)
			return false
		}
		for _, k := range keys {
			if allowed[k] {
				return true
			}
		}
		writeErr(w, http.StatusForbidden, "当前用户角色无「"+strings.Join(keys, " / ")+"」域权限，无法访问该日志")
		return false
	}

	auditFilters := func(r *http.Request) (module, level, kw, since string, limit, offset int) {
		q := r.URL.Query()
		limit, _ = strconv.Atoi(q.Get("limit"))
		offset, _ = strconv.Atoi(q.Get("offset"))
		return q.Get("module"), q.Get("level"), q.Get("kw"), q.Get("since"), limit, offset
	}
	api.HandleFunc("GET /api/v1/audit-logs", func(w http.ResponseWriter, r *http.Request) {
		if !requireLogAccess(w, r, "governance", "admin") {
			return
		}
		m, lv, kw, since, limit, offset := auditFilters(r)
		page, err := st.QueryAuditLogs(r.Context(), m, lv, kw, since, limit, offset)
		writeStoreResult(w, page, err)
	})
	api.HandleFunc("GET /api/v1/audit-logs/export", func(w http.ResponseWriter, r *http.Request) {
		if !requireLogAccess(w, r, "governance", "admin") {
			return
		}
		m, lv, kw, since, _, _ := auditFilters(r)
		// 分页拉全量（上限 200/页，导出量级足够；真到百万级再换流式）
		var all []store.AuditLog
		for offset := 0; ; offset += 200 {
			page, err := st.QueryAuditLogs(r.Context(), m, lv, kw, since, 200, offset)
			if err != nil {
				mapStoreErr(w, err)
				return
			}
			all = append(all, page.Items...)
			if len(page.Items) < 200 {
				break
			}
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="audit_logs.csv"`)
		// UTF-8 BOM：Excel 直接打开不乱码
		_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})
		cw := csv.NewWriter(w)
		_ = cw.Write([]string{"时间", "模块", "级别", "操作人", "内容", "TraceID"})
		for _, e := range all {
			_ = cw.Write([]string{e.At, e.Module, e.Level, e.Operator, e.Content, e.TraceID})
		}
		cw.Flush()
	})

	// ─── 通知中心（已读管理） ───
	api.HandleFunc("PUT /api/v1/notifications/{id}/read", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			User string `json:"user"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.User == "" {
			in.User = "zhangsan"
		}
		if err := st.MarkNotificationRead(r.Context(), r.PathValue("id"), in.User); err != nil {
			writeStoreResult(w, nil, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	api.HandleFunc("PUT /api/v1/notifications/read-all", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			User string `json:"user"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.User == "" {
			in.User = "zhangsan"
		}
		n, err := st.MarkAllNotificationsRead(r.Context(), in.User)
		writeStoreResult(w, map[string]any{"marked": n}, err)
	})

	// ─── 系统日志（可观测性，admin 域） ───
	sysFilters := func(r *http.Request) (level, component, kw, since string, limit, offset int) {
		q := r.URL.Query()
		limit, _ = strconv.Atoi(q.Get("limit"))
		offset, _ = strconv.Atoi(q.Get("offset"))
		return q.Get("level"), q.Get("component"), q.Get("kw"), q.Get("since"), limit, offset
	}
	api.HandleFunc("GET /api/v1/system-logs", func(w http.ResponseWriter, r *http.Request) {
		if !requireLogAccess(w, r, "admin") {
			return
		}
		lv, comp, kw, since, limit, offset := sysFilters(r)
		page, err := st.QuerySystemLogs(r.Context(), lv, comp, kw, since, limit, offset)
		writeStoreResult(w, page, err)
	})
	api.HandleFunc("GET /api/v1/system-logs/export", func(w http.ResponseWriter, r *http.Request) {
		if !requireLogAccess(w, r, "admin") {
			return
		}
		lv, comp, kw, since, _, _ := sysFilters(r)
		var all []store.SystemLog
		for offset := 0; ; offset += 200 {
			page, err := st.QuerySystemLogs(r.Context(), lv, comp, kw, since, 200, offset)
			if err != nil {
				mapStoreErr(w, err)
				return
			}
			all = append(all, page.Items...)
			if len(page.Items) < 200 {
				break
			}
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="system_logs.csv"`)
		_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})
		cw := csv.NewWriter(w)
		_ = cw.Write([]string{"时间", "组件", "级别", "内容", "TraceID"})
		for _, e := range all {
			_ = cw.Write([]string{e.At, e.Component, e.Level, e.Content, e.TraceID})
		}
		cw.Flush()
	})

	// ─── 个性化设置 ───
	api.HandleFunc("GET /api/v1/settings", handle(func(r *http.Request) (store.UserSetting, error) {
		user := r.URL.Query().Get("user")
		if user == "" {
			user = "zhangsan"
		}
		return st.GetUserSetting(r.Context(), user)
	}))
	api.HandleFunc("PUT /api/v1/settings", func(w http.ResponseWriter, r *http.Request) {
		var u store.UserSetting
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			writeErr(w, http.StatusBadRequest, "请求体不是合法 JSON")
			return
		}
		if u.Account == "" {
			writeErr(w, http.StatusBadRequest, "account 必填")
			return
		}
		out, err := st.SaveUserSetting(r.Context(), u)
		writeStoreResult(w, out, err)
	})
}
