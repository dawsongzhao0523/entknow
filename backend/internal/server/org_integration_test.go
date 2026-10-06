//go:build integration

// 组织架构与岗位字典集成测试：树读取、创建/重命名联动、删除保护、归集同步。
package server

import (
	"net/http"
	"testing"
)

func TestOrgUnitsCRUD(t *testing.T) {
	h := demoServer(t)

	// 树：平台部 → 数据AI部，path 全路径
	tree := []map[string]any{}
	loadList(t, h, "/api/v1/org-units", &tree)
	if len(tree) < 3 {
		t.Fatalf("组织树一级节点 = %d, want ≥3", len(tree))
	}
	var pt map[string]any
	for _, n := range tree {
		if n["id"] == "org-pt" {
			pt = n
		}
	}
	if pt == nil {
		t.Fatal("缺少平台部")
	}
	kids := pt["children"].([]any)
	if len(kids) == 0 {
		t.Fatal("平台部应含子组织")
	}
	if kids[0].(map[string]any)["path"] != "平台部 / 数据AI部" {
		t.Fatalf("子组织 path 异常: %v", kids[0])
	}

	// 父不存在 → 400
	rec := callJSON(t, h, http.MethodPost, "/api/v1/org-units",
		map[string]any{"id": "org-t1", "parentId": "org-nope", "name": "测试部"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("父不存在应 400，实际 %d", rec.Code)
	}
	// 正常创建
	rec = callJSON(t, h, http.MethodPost, "/api/v1/org-units",
		map[string]any{"id": "org-t1", "parentId": "org-pt", "name": "测试部", "sort": 9})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建失败: %d %s", rec.Code, rec.Body.String())
	}

	// 重命名联动：org-sc-pur「采购部」→「采购管理部」，用户 u2 部门应跟随
	rec = callJSON(t, h, http.MethodPut, "/api/v1/org-units/org-sc-pur",
		map[string]any{"name": "采购管理部", "sort": 1, "parentId": "org-sc"})
	if rec.Code != http.StatusOK {
		t.Fatalf("重命名失败: %d %s", rec.Code, rec.Body.String())
	}
	users := []map[string]any{}
	loadList(t, h, "/api/v1/users", &users)
	for _, u := range users {
		if u["account"] == "wangwu" && u["dept"] != "供应链 / 采购管理部" {
			t.Fatalf("用户部门未联动: %v", u["dept"])
		}
	}

	// 删除保护：有子组织 409；被用户引用 409；叶子未引用可删
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/org-units/org-sc", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("有子组织删除应 409，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/org-units/org-sc-pur", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("被用户引用删除应 409，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/org-units/org-t1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("叶子删除应 204，实际 %d", rec.Code)
	}
}

func TestPostsCRUDAndSync(t *testing.T) {
	h := demoServer(t)

	// 同名岗位 → 409
	rec := callJSON(t, h, http.MethodPost, "/api/v1/posts",
		map[string]any{"id": "post-t0", "name": "数据架构师"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("同名岗位应 409，实际 %d", rec.Code)
	}
	// 创建 + 重命名联动
	rec = callJSON(t, h, http.MethodPost, "/api/v1/posts",
		map[string]any{"id": "post-t1", "name": "质量专员", "descr": "来料检验", "sort": 9})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建岗位失败: %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/posts/post-t1",
		map[string]any{"name": "质量工程师", "descr": "来料检验", "sort": 9})
	if rec.Code != http.StatusOK {
		t.Fatalf("重命名失败: %d", rec.Code)
	}
	// 被引用不可删：post-arch 被 u1 引用
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/posts/post-arch", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("被引用岗位删除应 409，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/posts/post-t1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("未引用岗位删除应 204，实际 %d", rec.Code)
	}

	// 同步：先建一个带新部门/新岗位的用户，归集应新增对应字典
	rec = callJSON(t, h, http.MethodPost, "/api/v1/users", map[string]any{
		"id": "u-org-t", "account": "orgtest", "name": "同步测试", "dept": "质量管理部 / 体系组",
		"post": "体系工程师", "roles": []string{"数据开发"}, "status": "正常"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("建用户失败: %d %s", rec.Code, rec.Body.String())
	}
	res := decodeMap(t, callJSON(t, h, http.MethodPost, "/api/v1/org-units/sync", nil))
	if res["added"].(float64) < 2 {
		t.Fatalf("组织同步应新增 ≥2（质量管理部/体系组），实际 %v", res["added"])
	}
	res = decodeMap(t, callJSON(t, h, http.MethodPost, "/api/v1/posts/sync", nil))
	if res["added"].(float64) < 1 {
		t.Fatalf("岗位同步应新增 1（体系工程师），实际 %v", res["added"])
	}
	// 幂等：再同步一次 added=0（相对新增）
	res = decodeMap(t, callJSON(t, h, http.MethodPost, "/api/v1/posts/sync", nil))
	if res["added"].(float64) != 0 {
		t.Fatalf("重复同步应 added=0，实际 %v", res["added"])
	}
}
