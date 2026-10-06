// 审计中间件纯函数单元测试：路径→模块映射、请求体→操作人提取、状态码→级别。
package server

import "testing"

func TestModuleOf(t *testing.T) {
	cases := []struct{ path, want string }{
		{"/api/v1/datasources", "m1"},
		{"/api/v1/datasources/ds-001", "m1"},
		{"/api/v1/pipeline-tasks/t1/run", "m1"},
		{"/api/v1/kb/entries/e1", "m2"},
		{"/api/v1/synonyms/s1/merge", "m2"},
		{"/api/v1/objects", "m3"},
		{"/api/v1/elements/object/o1/transition", "m3"},
		{"/api/v1/instances/i1/events", "m4"},
		{"/api/v1/actions", "m4"},
		{"/api/v1/queries", "m5"},
		{"/api/v1/sandbox-branches/b1/rollback", "m6"},
		{"/api/v1/capabilities/c1/invoke", "m7"},
		{"/api/v1/reviews", "m8"},
		{"/api/v1/roles", "m9"},
		{"/api/v1/menus/m1", "m9"},
		{"/api/v1/settings", "m9"},
		{"/api/v1/anything-else", "m9"},
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
