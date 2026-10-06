//go:build integration

// 本体运行时集成测试：实例 360（属性+时间线）/ 事件追加幂等 / 行动执行校验链
// （非行动函数 400、未知实例 404、未知用户 403、高风险未确认 400、确认后事务副作用、
// 重复执行幂等）/ 传播记录幂等与规则校验。
package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// doGet GET 快捷（返回原始 recorder，供 decodeMap 断言）。
func doGet(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestInstance360(t *testing.T) {
	h := demoServer(t)

	var list []map[string]any
	loadList(t, h, "/api/v1/instances?object=o4", &list)
	if len(list) != 2 {
		t.Fatalf("o4 实例数 = %d, want 2", len(list))
	}
	loadList(t, h, "/api/v1/instances?kw=MCU", &list)
	if len(list) != 1 {
		t.Fatalf("kw=MCU 命中 %d, want 1", len(list))
	}

	rec := doGet(t, h, "/api/v1/instances/PO20260930001")
	m := decodeMap(t, rec)
	if m["status"] != "已发货" || m["riskScore"].(float64) != 76 {
		t.Fatalf("实例属性异常: %v", m)
	}
	if n := len(m["timeline"].([]any)); n != 4 {
		t.Fatalf("时间线 = %d 条, want 4", n)
	}

	// 事件追加幂等
	body := map[string]any{"t": "2026-10-06 10:00", "e": "集成测试事件"}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/instances/PO20260930001/events", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("追加事件 status = %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/instances/PO20260930001/events", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("重复追加 status = %d", rec.Code)
	}
	rec = doGet(t, h, "/api/v1/instances/PO20260930001")
	if n := len(decodeMap(t, rec)["timeline"].([]any)); n != 5 {
		t.Fatalf("追加幂等后时间线 = %d 条, want 5", n)
	}

	// 未知实例 404
	rec = callJSON(t, h, http.MethodPost, "/api/v1/instances/NOPE/events", body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知实例事件追加应 404，实际 %d", rec.Code)
	}
}

// httptest2 已由 doGet 取代。

func actionBody(id, funcID, instance, user string, confirm bool) map[string]any {
	return map[string]any{"id": id, "funcId": funcID, "instanceId": instance, "user": user, "confirm": confirm}
}

func TestExecuteActionGovernance(t *testing.T) {
	h := demoServer(t)

	// 非行动函数 → 400
	rec := callJSON(t, h, http.MethodPost, "/api/v1/actions", actionBody("ACT-T1", "f1", "PO20260930001", "张三", false))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非行动函数应 400，实际 %d %s", rec.Code, rec.Body.String())
	}
	// 未知实例 → 404
	rec = callJSON(t, h, http.MethodPost, "/api/v1/actions", actionBody("ACT-T1", "f3", "NOPE", "张三", false))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知实例应 404，实际 %d", rec.Code)
	}
	// 未知用户 → 403
	rec = callJSON(t, h, http.MethodPost, "/api/v1/actions", actionBody("ACT-T1", "f3", "PO20260930001", "路人甲", false))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("未知用户应 403，实际 %d", rec.Code)
	}
	// 高风险（92）未确认 → 400，且无任何写入
	rec = callJSON(t, h, http.MethodPost, "/api/v1/actions", actionBody("ACT-T1", "f3", "PO20261002091", "张三", false))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("高风险未确认应 400，实际 %d", rec.Code)
	}
	var acts []map[string]any
	loadList(t, h, "/api/v1/actions?instance=PO20261002091", &acts)
	if len(acts) != 1 { // 只有 seed 的 ACT-1003-1017
		t.Fatalf("被拒执行不应产生记录，实际 %d 条", len(acts))
	}

	// 确认后成功：执行记录 + 实例事件 + 通知同一事务
	rec = callJSON(t, h, http.MethodPost, "/api/v1/actions", actionBody("ACT-T1", "f3", "PO20261002091", "张三", true))
	if rec.Code != http.StatusCreated {
		t.Fatalf("确认执行应 201，实际 %d %s", rec.Code, rec.Body.String())
	}
	rec = doGet(t, h, "/api/v1/instances/PO20261002091")
	last := decodeMap(t, rec)["timeline"].([]any)
	found := false
	for _, ev := range last {
		if s, ok := ev.(map[string]any)["e"].(string); ok && strings.Contains(s, "行动执行：冻结订单") {
			found = true
		}
	}
	if !found {
		t.Fatalf("实例时间线缺少行动事件: %v", last)
	}
	var notifs []map[string]any
	loadList(t, h, "/api/v1/notifications", &notifs)
	n := 0
	for _, x := range notifs {
		if x["id"] == "n-act-ACT-T1" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("行动通知 = %d 条, want 1", n)
	}

	// 幂等重放
	rec = callJSON(t, h, http.MethodPost, "/api/v1/actions", actionBody("ACT-T1", "f3", "PO20261002091", "张三", true))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重复执行应 201+replay，实际 %d", rec.Code)
	}
	loadList(t, h, "/api/v1/notifications", &notifs)
	n = 0
	for _, x := range notifs {
		if x["id"] == "n-act-ACT-T1" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("重放后通知 = %d 条, want 1", n)
	}
}

func TestRuleFirings(t *testing.T) {
	h := demoServer(t)

	var list []map[string]any
	loadList(t, h, "/api/v1/rule-firings?rule=R1", &list)
	if len(list) != 1 {
		t.Fatalf("R1 触发记录 = %d, want 1", len(list))
	}

	rec := callJSON(t, h, http.MethodPost, "/api/v1/rule-firings", map[string]any{
		"id": "rf-t1", "ruleId": "R4", "instanceId": "PO20261002091", "detail": "齐套率 78% → SUPPLY 边标记风险"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("记录触发 status = %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/rule-firings", map[string]any{
		"id": "rf-t1", "ruleId": "R4", "detail": "dup"})
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重复记录应 201+replay，实际 %d", rec.Code)
	}

	rec = callJSON(t, h, http.MethodPost, "/api/v1/rule-firings", map[string]any{
		"id": "rf-t2", "ruleId": "R99", "detail": "x"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("未知规则应 400，实际 %d", rec.Code)
	}
}
