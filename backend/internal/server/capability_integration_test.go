//go:build integration

// 能力出口集成测试：统计真实化（基数+日志）/ invoke 幂等 / 状态校验 /
// 删除级联清理 / 注册幂等 / 最近调用倒序。
package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCapabilityStatsAndInvoke(t *testing.T) {
	h := demoServer(t)

	// 统计真实化：c3 基数 231，无日志 → 231
	var caps []map[string]any
	loadList(t, h, "/api/v1/capabilities", &caps)
	byID := map[string]map[string]any{}
	for _, c := range caps {
		byID[c["id"].(string)] = c
	}
	if byID["c3"]["callsTotal"].(float64) != 231 || byID["c3"]["calls"] != "231" {
		t.Fatalf("c3 初始计数异常: %v", byID["c3"])
	}

	// invoke 一次 → 计数 232
	invoke := func(callID string) *httptest.ResponseRecorder {
		return callJSON(t, h, http.MethodPost, "/api/v1/capabilities/c3/invoke",
			map[string]any{"id": callID, "caller": "scm-assistant", "latencyMs": 42})
	}
	rec := invoke("call-t1")
	if rec.Code != http.StatusOK {
		t.Fatalf("invoke status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if v := decodeMap(t, rec)["callsTotal"].(float64); v != 232 {
		t.Fatalf("invoke 后计数 = %v, want 232", v)
	}

	// 幂等重放 → 计数不变
	rec = invoke("call-t1")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["callsTotal"].(float64) != 232 {
		t.Fatalf("重复 invoke 应幂等，计数 = %v", decodeMap(t, rec)["callsTotal"])
	}

	// 非法状态 → 400
	rec = callJSON(t, h, http.MethodPost, "/api/v1/capabilities/c3/invoke",
		map[string]any{"id": "call-t2", "caller": "x", "status": "timeout"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法 status 应 400，实际 %d", rec.Code)
	}

	// 未知能力 → 404
	rec = callJSON(t, h, http.MethodPost, "/api/v1/capabilities/c99/invoke",
		map[string]any{"id": "call-t3", "caller": "x"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知能力 invoke 应 404，实际 %d", rec.Code)
	}

	// 最近调用（倒序）
	var calls []map[string]any
	loadList(t, h, "/api/v1/capabilities/c3/calls", &calls)
	if len(calls) != 1 || calls[0]["caller"] != "scm-assistant" {
		t.Fatalf("最近调用异常: %v", calls)
	}
}

func TestCapabilityCRUDAndCascade(t *testing.T) {
	h := demoServer(t)

	// 幂等注册
	body := map[string]any{"id": "c-e2e", "name": "kb_search", "desc": "知识条目检索",
		"proto": "MCP/REST", "owner": "平台组"}
	rec := callJSON(t, h, http.MethodPost, "/api/v1/capabilities", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("注册 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/capabilities", body)
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重复注册应 201+replay，实际 %d", rec.Code)
	}

	// 编辑
	body["desc"] = "知识条目检索（含同义词扩展）"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/capabilities/c-e2e", body)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["desc"] != "知识条目检索（含同义词扩展）" {
		t.Fatalf("编辑失败: %d %s", rec.Code, rec.Body.String())
	}

	// 产生 2 条调用日志后删除 → 级联清理
	for i, id := range []string{"call-a", "call-b"} {
		rec = callJSON(t, h, http.MethodPost, "/api/v1/capabilities/c-e2e/invoke",
			map[string]any{"id": id, "caller": "tester", "latencyMs": 10 + i})
		if rec.Code != http.StatusOK {
			t.Fatalf("invoke %s 失败: %d", id, rec.Code)
		}
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/capabilities/c-e2e", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("删除 status = %d", rec.Code)
	}
	rec = doGet(t, h, "/api/v1/capabilities/c-e2e/calls")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("删除后调用日志应 404，实际 %d", rec.Code)
	}

	// 未知能力 PUT → 404
	rec = callJSON(t, h, http.MethodPut, "/api/v1/capabilities/c-nope", body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知能力 PUT 应 404，实际 %d", rec.Code)
	}
}
