//go:build integration

// 推演沙盘集成测试：建分支幂等+基准风险带出 / simulate 流转与 last-wins /
// 已回滚 409 / 回滚幂等 / 404。
package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSandboxLifecycle(t *testing.T) {
	h := demoServer(t)

	// seed 三分支
	var list []map[string]any
	loadList(t, h, "/api/v1/sandbox-branches", &list)
	if len(list) != 3 {
		t.Fatalf("seed 分支 = %d, want 3", len(list))
	}

	// 建分支幂等 + riskBefore 从基准实例（PO20261002091=92）带出
	body := map[string]any{"id": "sb-t1", "name": "分支 D · 加急空运", "hypothesis": "运输方式 海运→空运", "baseInstance": "PO20261002091"}
	rec := callJSON(t, h, http.MethodPost, "/api/v1/sandbox-branches", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("建分支 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if v := decodeMap(t, rec)["riskBefore"].(float64); v != 92 {
		t.Fatalf("riskBefore = %v, want 92（基准实例带出）", v)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/sandbox-branches", body)
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// simulate：last-wins + 状态已对比
	sim := func(risk int, cost string) *httptest.ResponseRecorder {
		return callJSON(t, h, http.MethodPost, "/api/v1/sandbox-branches/sb-t1/simulate",
			map[string]any{"riskAfter": risk, "cost": cost, "note": "集成推演", "by": "张三"})
	}
	rec = sim(45, "+3.4%")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已对比" {
		t.Fatalf("simulate 失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = sim(38, "+2.9%")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["riskAfter"].(float64) != 38 {
		t.Fatalf("重跑应 last-wins: %s", rec.Body.String())
	}

	// 非法 riskAfter → 400
	rec = sim(150, "x")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("riskAfter=150 应 400，实际 %d", rec.Code)
	}

	// 回滚幂等；回滚后 simulate 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/sandbox-branches/sb-t1/rollback", map[string]any{"by": "张三"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已回滚" {
		t.Fatalf("回滚失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/sandbox-branches/sb-t1/rollback", map[string]any{"by": "张三"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已回滚" {
		t.Fatalf("重复回滚应幂等，实际 %d", rec.Code)
	}
	rec = sim(30, "x")
	if rec.Code != http.StatusConflict {
		t.Fatalf("已回滚 simulate 应 409，实际 %d", rec.Code)
	}

	// 404
	rec = callJSON(t, h, http.MethodPost, "/api/v1/sandbox-branches/nope/rollback", map[string]any{"by": "x"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知分支应 404，实际 %d", rec.Code)
	}
}
