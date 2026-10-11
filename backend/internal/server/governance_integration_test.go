//go:build integration

// 推理治理集成测试：事实-事理-行动贯通 / 推理轨迹 / 约束分级网关。
package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// 验收 5.1+5.2：R1 触发 → 自动执行冻结订单 Action → 实例风险分更新 + 轨迹可追溯。
func TestRunRuleActionPipeline(t *testing.T) {
	h := demoServer(t)

	// R1（齐套率<80% → +5，action_func=f3 冻结订单）
	m := postJSON(t, h, "/api/v1/reasoning/run", map[string]any{"ruleId": "R1"})
	if m["fired"].(float64) < 1 {
		t.Fatalf("R1 应至少触发 1 个实例: %v", m)
	}
	// 事实-事理-行动贯通：自动行动数 = 触发数（弱约束对象 PO 实例）
	if m["actions"].(float64) < 1 {
		t.Fatalf("应自动执行关联行动: %v", m)
	}
	// 轨迹数 = 触发数
	if m["trails"].(float64) != m["fired"].(float64) {
		t.Fatalf("每个触发实例应有一条轨迹: %v", m)
	}

	// 轨迹查询：链路包含 事实/事理/行动 三步
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/reasoning/trails?rule=R1", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("trails status = %d", rec.Code)
	}
	var trails []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &trails); err != nil || len(trails) == 0 {
		t.Fatalf("轨迹为空: %v", err)
	}
	steps := trails[0]["steps"].([]any)
	if len(steps) != 3 {
		t.Fatalf("轨迹应为三步（事实/事理/行动），实际 %d: %v", len(steps), trails[0])
	}
	for i, want := range []string{"事实", "事理", "行动"} {
		if steps[i].(map[string]any)["step"] != want {
			t.Fatalf("第 %d 步应为 %s: %v", i, want, steps[i])
		}
	}
	if !strings.Contains(trails[0]["conclusion"].(string), "自动执行") {
		t.Fatalf("结论应含自动执行: %v", trails[0]["conclusion"])
	}

	// 按实例过滤
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/reasoning/trails?instance=PO20260930001", nil))
	var byInst []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &byInst); err != nil {
		t.Fatal(err)
	}
	for _, tr := range byInst {
		if tr["instanceId"] != "PO20260930001" {
			t.Fatalf("实例过滤失效: %v", tr)
		}
	}
}

// 验收 5.3：strong 约束 + 风险>60 未确认 → 行动网关 403 拦截。
func TestStrongConstraintGate(t *testing.T) {
	h := demoServer(t)

	// 将 o4（采购订单，有实例 PO20260930001/PO20261002091）临时调为 strong
	setLevel := func(level string) {
		st := demoStore(t)
		if err := st.SetConstraintLevel(context.Background(), "object", "o4", level); err != nil {
			t.Fatalf("调整约束等级失败: %v", err)
		}
	}
	setLevel("strong")
	t.Cleanup(func() { setLevel("weak") })

	// 高风险实例（92）未确认 → 403（强约束拦截，而非弱约束的 400）
	rec := httptest.NewRecorder()
	body := actionBodyRaw("act-strong-1", "f3", "PO20261002091", "张三", false)
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/actions", strings.NewReader(body)))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("强约束高风险未确认应 403，实际 %d: %s", rec.Code, rec.Body.String())
	}

	// 确认后放行
	rec = httptest.NewRecorder()
	body = actionBodyRaw("act-strong-2", "f3", "PO20261002091", "张三", true)
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/actions", strings.NewReader(body)))
	if rec.Code != http.StatusCreated {
		t.Fatalf("强约束确认后应 201，实际 %d: %s", rec.Code, rec.Body.String())
	}
}

func actionBodyRaw(id, funcID, instance, user string, confirm bool) string {
	b, _ := json.Marshal(map[string]any{"id": id, "funcId": funcID, "instanceId": instance, "user": user, "confirm": confirm})
	return string(b)
}
