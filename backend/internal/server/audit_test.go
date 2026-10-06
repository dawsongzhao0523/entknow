// 审计中间件纯函数单元测试：路径→模块映射、请求体→操作人提取、状态码→级别。
package server

import "testing"

func TestModuleOf(t *testing.T) {
	cases := []struct{ path, want string }{
		{"/api/v1/datasources", "assets"},
		{"/api/v1/datasources/ds-001", "assets"},
		{"/api/v1/pipeline-tasks/t1/run", "assets"},
		{"/api/v1/kb/entries/e1", "knowledge"},
		{"/api/v1/synonyms/s1/merge", "knowledge"},
		{"/api/v1/objects", "modeling"},
		{"/api/v1/elements/object/o1/transition", "modeling"},
		{"/api/v1/instances/i1/events", "runtime"},
		{"/api/v1/actions", "runtime"},
		{"/api/v1/queries", "reasoning"},
		{"/api/v1/sandbox-branches/b1/rollback", "sandbox"},
		{"/api/v1/capabilities/c1/invoke", "apps"},
		{"/api/v1/reviews", "governance"},
		{"/api/v1/roles", "admin"},
		{"/api/v1/menus/assets", "admin"},
		{"/api/v1/settings", "admin"},
		{"/api/v1/anything-else", "admin"},
	}
	for _, c := range cases {
		if got := moduleOf(c.path); got != c.want {
			t.Errorf("moduleOf(%q) = %q, want %q", c.path, got, c.want)
		}
	}
}

func TestPickOperator(t *testing.T) {
	cases := []struct {
		body string
		want string
	}{
		{`{"user":"张三"}`, "张三"},
		{`{"by":"王五","user":""}`, "王五"},
		{`{"from":"赵六"}`, "赵六"},
		{`{"name":"孙七"}`, "系统"},
		{`not json`, "系统"},
		{``, "系统"},
	}
	for _, c := range cases {
		if got := pickOperator([]byte(c.body)); got != c.want {
			t.Errorf("pickOperator(%q) = %q, want %q", c.body, got, c.want)
		}
	}
}

func TestLevelOf(t *testing.T) {
	for _, c := range []struct {
		status int
		want   string
	}{{200, "INFO"}, {201, "INFO"}, {204, "INFO"}, {400, "WARN"}, {404, "WARN"}, {409, "WARN"}, {500, "ERROR"}} {
		if got := levelOf(c.status); got != c.want {
			t.Errorf("levelOf(%d) = %q, want %q", c.status, got, c.want)
		}
	}
}
