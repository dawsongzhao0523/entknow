//go:build integration

// 组织与权限集成测试：角色幂等创建/更新/删除链（内置 400、被引用 409、未引用可删）；
// 用户幂等创建、账号冲突 409、角色引用校验 400、停用流转、404。
package server

import (
	"net/http"
	"testing"
)

func roleBody(id, name string, perms ...string) map[string]any {
	return map[string]any{"id": id, "name": name, "desc": "集成测试角色", "perms": perms}
}

func userBody(id, account, name string, roles ...string) map[string]any {
	return map[string]any{"id": id, "account": account, "name": name,
		"dept": "平台部 / 数据AI部", "post": "工程师", "roles": roles, "status": "正常"}
}

func TestRoleCRUD(t *testing.T) {
	h := demoServer(t)

	// 幂等创建
	rec := callJSON(t, h, http.MethodPost, "/api/v1/roles", roleBody("role-t1", "测试角色", "assets", "knowledge"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建角色 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/roles", roleBody("role-t1", "测试角色", "assets"))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 更新
	rec = callJSON(t, h, http.MethodPut, "/api/v1/roles/role-t1", roleBody("role-t1", "测试角色改", "modeling"))
	if rec.Code != http.StatusOK || decodeMap(t, rec)["name"] != "测试角色改" {
		t.Fatalf("更新角色失败: %d %s", rec.Code, rec.Body.String())
	}

	// 内置角色删除 → 400
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/roles/admin", nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("内置角色删除应 400，实际 %d", rec.Code)
	}

	// 被引用角色删除 → 409（评审员被 u2 引用）
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/roles/reviewer", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("被引用角色删除应 409，实际 %d", rec.Code)
	}

	// 未引用角色可删；删除后不可再被用户引用
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/roles/role-t1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("删除未引用角色应 204，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/users", userBody("u-t0", "ut0", "测试者", "测试角色改"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("引用已删角色应 400，实际 %d", rec.Code)
	}

	// 未知角色 404
	rec = callJSON(t, h, http.MethodPut, "/api/v1/roles/role-nope", roleBody("role-nope", "x", "assets"))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知角色 PUT 应 404，实际 %d", rec.Code)
	}
}

func TestUserCreateUpdate(t *testing.T) {
	h := demoServer(t)

	// 幂等创建
	rec := callJSON(t, h, http.MethodPost, "/api/v1/users", userBody("u-t1", "utest", "测试用户", "数据开发"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建用户 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/users", userBody("u-t1", "utest", "测试用户", "数据开发"))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 同账号异 ID → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/users", userBody("u-t2", "utest", "冒名者", "数据开发"))
	if rec.Code != http.StatusConflict {
		t.Fatalf("账号冲突应 409，实际 %d", rec.Code)
	}

	// 不存在角色 → 400
	rec = callJSON(t, h, http.MethodPost, "/api/v1/users", userBody("u-t3", "utest3", "测试者3", "不存在的角色"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("不存在角色应 400，实际 %d", rec.Code)
	}

	// 更新 + 停用流转
	rec = callJSON(t, h, http.MethodPut, "/api/v1/users/u-t1",
		userBody("u-t1", "utest", "测试用户（停用）", "评审员", "数据开发"))
	if rec.Code != http.StatusOK {
		t.Fatalf("更新用户失败: %d %s", rec.Code, rec.Body.String())
	}
	body := userBody("u-t1", "utest", "测试用户", "数据开发")
	body["status"] = "停用"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/users/u-t1", body)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "停用" {
		t.Fatalf("停用流转失败: %d %s", rec.Code, rec.Body.String())
	}

	// 非法状态 → 400；未知用户 → 404
	body["status"] = "冻结"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/users/u-t1", body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法状态应 400，实际 %d", rec.Code)
	}
	body["status"] = "停用"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/users/u-nope", body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知用户应 404，实际 %d", rec.Code)
	}
}
