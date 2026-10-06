//go:build integration

// 日志分离集成测试：审计/系统日志权限差异（governance|admin vs admin）、
// 运行时发射（巡检/绑定同步/规则执行）、过滤分页与 CSV 导出。
package server

import (
	"net/http"
	"strings"
	"testing"
)

func TestLogPermissionSplit(t *testing.T) {
	h := demoServer(t)

	// 张三（本体管理员）：两者均可
	rec := callJSON(t, h, http.MethodGet, "/api/v1/audit-logs?user=zhangsan&limit=1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("管理员审计日志应 200，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodGet, "/api/v1/system-logs?user=zhangsan&limit=1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("管理员系统日志应 200，实际 %d", rec.Code)
	}

	// 王五（评审员：knowledge/modeling/governance）：审计可看，系统日志 403
	rec = callJSON(t, h, http.MethodGet, "/api/v1/audit-logs?user=wangwu&limit=1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("评审员审计日志应 200，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodGet, "/api/v1/system-logs?user=wangwu&limit=1", nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("评审员系统日志应 403，实际 %d", rec.Code)
	}
	// 导出同样受门控
	rec = callJSON(t, h, http.MethodGet, "/api/v1/system-logs/export?user=wangwu", nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("评审员系统日志导出应 403，实际 %d", rec.Code)
	}
}

func TestSystemLogEmission(t *testing.T) {
	h := demoServer(t)

	// 巡检 → 依赖巡检日志
	if _, err := callJSON(t, h, http.MethodPost, "/api/v1/dep-services/inspect", nil), error(nil); err != nil {
		t.Fatal(err)
	}
	// 绑定同步 → 数据绑定日志
	rec := callJSON(t, h, http.MethodPost, "/api/v1/bindings/bd-1/sync", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("同步失败: %d", rec.Code)
	}
	// 规则执行 → 推理引擎日志
	rec = callJSON(t, h, http.MethodPost, "/api/v1/reasoning/run", map[string]any{"ruleId": "R2"})
	if rec.Code != http.StatusOK {
		t.Fatalf("规则执行失败: %d", rec.Code)
	}

	page := decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/system-logs?user=zhangsan&limit=50", nil))
	items := page["items"].([]any)
	comps := map[string]bool{}
	for _, it := range items {
		comps[it.(map[string]any)["component"].(string)] = true
	}
	for _, want := range []string{"依赖巡检", "数据绑定", "推理引擎"} {
		if !comps[want] {
			t.Fatalf("系统日志缺少组件 %q 的实时记录，现有组件: %v", want, comps)
		}
	}

	// 组件过滤 + 导出
	page = decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/system-logs?user=zhangsan&component=推理引擎&limit=10", nil))
	for _, it := range page["items"].([]any) {
		if it.(map[string]any)["component"] != "推理引擎" {
			t.Fatal("组件过滤失效")
		}
	}
	rec = callJSON(t, h, http.MethodGet, "/api/v1/system-logs/export?user=zhangwu&level=ERROR", nil)
	if rec.Code == http.StatusOK && !strings.HasPrefix(rec.Body.String(), "\xEF\xBB\xBF时间,组件,级别") {
		t.Fatalf("系统日志 CSV 表头异常: %q", rec.Body.String()[:30])
	}
}

func TestAuditOnlyUserActions(t *testing.T) {
	h := demoServer(t)
	// 触发一次写操作
	callJSON(t, h, http.MethodPost, "/api/v1/roles",
		map[string]any{"id": "role-sys", "name": "日志分离验证", "perms": []string{"assets"}})

	page := decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/audit-logs?kw=roles&limit=10", nil))
	items := page["items"].([]any)
	if len(items) == 0 {
		t.Fatal("写操作审计缺失")
	}
	// 审计日志不应再包含运行时事件（如 CDC 断连恢复）
	page = decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/audit-logs?kw=CDC&limit=10", nil))
	if n := len(page["items"].([]any)); n != 0 {
		t.Fatalf("审计日志不应包含运行时事件（CDC），命中 %d 条", n)
	}
	// 运行时事件在系统日志中
	page = decodeMap(t, callJSON(t, h, http.MethodGet, "/api/v1/system-logs?kw=CDC&user=zhangsan&limit=10", nil))
	if n := len(page["items"].([]any)); n == 0 {
		t.Fatal("系统日志应包含 CDC 运行时事件")
	}
}
