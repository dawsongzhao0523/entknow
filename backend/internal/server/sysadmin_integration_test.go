//go:build integration

// 系统管理集成测试：菜单树/权限过滤/CRUD、行级规则、敏感级推导、依赖服务巡检、
// 审计中间件与查询导出、个性化设置、总览聚合。
package server

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestMenusTreeAndPerms(t *testing.T) {
	h := demoServer(t)

	// 全量树：9 个一级模块，assets 带 3 个子菜单
	list := []map[string]any{}
	loadList(t, h, "/api/v1/menus", &list)
	if len(list) != 9 {
		t.Fatalf("一级模块数 = %d, want 9", len(list))
	}
	var assetsMenu map[string]any
	for _, m := range list {
		if m["id"] == "assets" {
			assetsMenu = m
		}
	}
	if assetsMenu == nil || len(assetsMenu["children"].([]any)) != 5 {
		t.Fatalf("assets 子菜单数不对（应含 集市/工作台）: %v", assetsMenu)
	}

	// 按角色权限过滤：wangwu（评审员，perms=knowledge,modeling,governance）
	list = nil
	loadList(t, h, "/api/v1/menus?user=wangwu", &list)
	if len(list) != 3 {
		t.Fatalf("wangwu 可见模块数 = %d, want 3（knowledge/modeling/governance）", len(list))
	}
	for _, m := range list {
		id := m["id"].(string)
		if id != "knowledge" && id != "modeling" && id != "governance" {
			t.Fatalf("wangwu 不应看到模块 %s", id)
		}
	}

	// 幂等创建叶子菜单
	menu := map[string]any{"id": "admin/custom", "parentId": "admin", "name": "自定义页", "route": "admin/custom", "sort": 99, "visible": true}
	rec := callJSON(t, h, http.MethodPost, "/api/v1/menus", menu)
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建菜单 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/menus", menu)
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 编辑为隐藏：树中不再返回
	menu["visible"] = false
	rec = callJSON(t, h, http.MethodPut, "/api/v1/menus/admin/custom", menu)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["visible"] != false {
		t.Fatalf("更新菜单失败: %d %s", rec.Code, rec.Body.String())
	}
	list = nil
	loadList(t, h, "/api/v1/menus", &list)
	for _, m := range list {
		if m["id"] == "admin" {
			for _, c := range m["children"].([]any) {
				if c.(map[string]any)["id"] == "admin/custom" {
					t.Fatal("隐藏菜单不应出现在树中")
				}
			}
		}
	}

	// 删除：有子菜单 409；叶子 204；未知 404
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/menus/admin", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("删除有子菜单的一级菜单应 409，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/menus/admin/custom", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("删除叶子菜单应 204，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/menus/admin/custom", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("重复删除应 404，实际 %d", rec.Code)
	}
}

func TestDataRulesCRUD(t *testing.T) {
	h := demoServer(t)

	rule := map[string]any{"id": "rls-t1", "target": "对象[采购订单]", "rule": "amount < 5000", "role": "数据开发", "effect": "小额订单可见", "updatedBy": "张三"}
	rec := callJSON(t, h, http.MethodPost, "/api/v1/data-rules", rule)
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建规则 status = %d, body = %s", rec.Code, rec.Body.String())
	}

	// 绑定不存在角色 → 400 且不落库
	bad := map[string]any{"id": "rls-t2", "target": "对象[供应商]", "rule": "1=1", "role": "不存在的角色"}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/data-rules", bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("不存在角色应 400，实际 %d", rec.Code)
	}
	rule["role"] = "也还是不存在"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/data-rules/rls-t1", rule)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("更新绑定不存在角色应 400，实际 %d", rec.Code)
	}

	// 正常更新 / 删除 / 404
	rule["role"] = "评审员"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/data-rules/rls-t1", rule)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["role"] != "评审员" {
		t.Fatalf("更新规则失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/data-rules/rls-t1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("删除规则应 204，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/data-rules/rls-t1", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("重复删除应 404，实际 %d", rec.Code)
	}
}

func TestSensitivity(t *testing.T) {
	h := demoServer(t)
	list := []map[string]any{}
	loadList(t, h, "/api/v1/sensitivity", &list)
	if len(list) != 3 {
		t.Fatalf("敏感级推导行数 = %d, want 3", len(list))
	}
	for _, row := range list {
		if row["asset"] == "lv_order_delivery" && row["inherited"] != "L3" {
			t.Fatalf("lv_order_delivery 继承级 = %v, want L3（上游 srm=L3）", row["inherited"])
		}
	}
}

func TestDepServicesInspect(t *testing.T) {
	h := demoServer(t)

	// 手动巡检：结果落库、状态刷新、历史追加
	before := []map[string]any{}
	loadList(t, h, "/api/v1/dep-services", &before)
	rec := callJSON(t, h, http.MethodPost, "/api/v1/dep-services/inspect", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("巡检 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	after := []map[string]any{}
	if err := json.Unmarshal(rec.Body.Bytes(), &after); err != nil {
		t.Fatalf("巡检响应不是数组: %v", err)
	}
	if len(after) != len(before) {
		t.Fatalf("巡检后服务数变化: %d → %d", len(before), len(after))
	}
	for _, svc := range after {
		if svc["checkedAt"] == "" || svc["status"] == "未巡检" {
			t.Fatalf("巡检后状态未刷新: %v", svc)
		}
	}

	// 巡检后应有「今日」的可用率点（seed 历史日期为 demo 冻结值，只做存在性断言）
	points := []map[string]any{}
	loadList(t, h, "/api/v1/dep-services/uptime", &points)
	today := time.Now().Format("2006-01-02")
	hasToday := false
	for _, p := range points {
		if p["serviceId"] == "dep-pg" && p["day"] == today {
			hasToday = true
		}
	}
	if !hasToday {
		t.Fatalf("巡检后 dep-pg 应有今日（%s）可用率点", today)
	}
}

func TestAuditMiddlewareAndQuery(t *testing.T) {
	h := demoServer(t)

	// 一次成功写（INFO，操作人取 body）+ 一次冲突写（WARN）
	rec := callJSON(t, h, http.MethodPost, "/api/v1/roles",
		map[string]any{"id": "role-aud", "name": "审计角色", "perms": []string{"assets"}})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建角色失败: %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/users",
		map[string]any{"id": "u-aud2", "account": "zhangsan", "name": "账号占用者", "roles": []string{"数据开发"}, "status": "正常"})
	if rec.Code != http.StatusConflict { // 账号已被 u1 占用
		t.Fatalf("账号冲突应 409，实际 %d", rec.Code)
	}

	// 中间件落库断言：module=admin 下应能找到本次两条写审计（201→INFO、409→WARN）
	page := decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/audit-logs?module=admin&limit=50", nil))
	items := page["items"].([]any)
	var gotInfo, gotWarn bool
	for _, it := range items {
		e := it.(map[string]any)
		content, _ := e["content"].(string)
		if !strings.Contains(content, "/api/v1/roles") && !strings.Contains(content, "/api/v1/users") {
			continue // 跳过 seed 叙事行
		}
		if e["operator"] != "系统" { // 两个请求体都无 user/by/from
			t.Fatalf("操作人应回退「系统」: %v", e["operator"])
		}
		if !strings.HasPrefix(e["traceId"].(string), "tr-") {
			t.Fatalf("traceId 形状不对: %v", e["traceId"])
		}
		if strings.Contains(content, "201") {
			gotInfo = true
		}
		if strings.Contains(content, "409") {
			gotWarn = true
		}
	}
	if !gotInfo || !gotWarn {
		t.Fatalf("应同时存在 INFO(201) 与 WARN(409) 的本次审计: info=%v warn=%v", gotInfo, gotWarn)
	}

	// 级别过滤
	page = decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/audit-logs?level=ERROR&limit=200", nil))
	for _, it := range page["items"].([]any) {
		if it.(map[string]any)["level"] != "ERROR" {
			t.Fatal("level=ERROR 过滤失效")
		}
	}

	// CSV 导出：BOM + 表头
	rec = callJSON(t, h, http.MethodGet, "/api/v1/audit-logs/export?level=ERROR", nil)
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Body.String(), "\xEF\xBB\xBF时间,模块,级别") {
		t.Fatalf("CSV 导出异常: %d %q", rec.Code, rec.Body.String())
	}
	rows, err := csv.NewReader(strings.NewReader(rec.Body.String()[3:])).ReadAll()
	if err != nil || len(rows) < 2 {
		t.Fatalf("CSV 行数异常: %v %d", err, len(rows))
	}
}

func TestSettings(t *testing.T) {
	h := demoServer(t)

	// 无记录账号返回空对象
	got := decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/settings?user=nobody", nil))
	if len(got["settings"].(map[string]any)) != 0 {
		t.Fatalf("无记录应返回空 settings: %v", got)
	}

	// upsert 后读取一致
	body := map[string]any{"account": "zhangsan", "settings": map[string]any{"theme": "dark", "density": "compact"}}
	rec := callJSON(t, h, http.MethodPut, "/api/v1/settings", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("保存设置失败: %d %s", rec.Code, rec.Body.String())
	}
	got = decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/settings?user=zhangsan", nil))
	s := got["settings"].(map[string]any)
	if s["theme"] != "dark" || s["density"] != "compact" {
		t.Fatalf("设置读取不一致: %v", s)
	}

	// account 缺失 → 400
	rec = callJSON(t, h, http.MethodPut, "/api/v1/settings", map[string]any{"settings": map[string]any{}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("缺 account 应 400，实际 %d", rec.Code)
	}
}

func TestAdminStats(t *testing.T) {
	h := demoServer(t)
	stats := decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/admin/stats", nil))

	want := map[string]float64{
		"users": 4, "roles": 6, "objects": 11, "dsTotal": 6, "dsNormal": 4, "dsError": 1,
	}
	for k, v := range want {
		if stats[k].(float64) != v {
			t.Fatalf("stats.%s = %v, want %v", k, stats[k], v)
		}
	}
	if len(stats["services"].([]any)) != 3 {
		t.Fatalf("服务数 = %v, want 3", stats["services"])
	}
}
