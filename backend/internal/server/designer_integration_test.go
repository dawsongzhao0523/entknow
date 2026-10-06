//go:build integration

// 设计器集成测试：对象幂等创建与流转链 / 非法迁移 409 / 重放幂等；
// 关系引用联动（PUBLISHED 校验 + refCount+1 事务）；函数 cat 校验；404。
package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func objBody(id, name string) map[string]any {
	return map[string]any{"id": id, "name": name, "en": "Test" + id, "kind": "静态事实",
		"owner": "张三", "ontology": "供应链本体", "mapping": "ods_test（物理表）",
		"props": []map[string]any{{"name": "tid", "type": "string", "comment": "测试ID"}}}
}

func transition(t *testing.T, h http.Handler, typ, id, action string) *httptest.ResponseRecorder {
	t.Helper()
	return callJSON(t, h, http.MethodPost, "/api/v1/elements/"+typ+"/"+id+"/transition",
		map[string]any{"action": action, "by": "张三"})
}

func TestObjectLifecycle(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/objects", objBody("o-t1", "测试对象"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建对象 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/objects", objBody("o-t1", "测试对象"))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 非法 kind → 400
	bad := objBody("o-bad", "坏对象")
	bad["kind"] = "动态事实"
	rec = callJSON(t, h, http.MethodPost, "/api/v1/objects", bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法 kind 应 400，实际 %d", rec.Code)
	}

	// 流转链：submit → IN_REVIEW；deprecate 于 IN_REVIEW 非法 409；publish → PUBLISHED；重放幂等
	rec = transition(t, h, "objects", "o-t1", "submit")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "IN_REVIEW" {
		t.Fatalf("submit 失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = transition(t, h, "objects", "o-t1", "deprecate")
	if rec.Code != http.StatusConflict {
		t.Fatalf("IN_REVIEW deprecate 应 409，实际 %d", rec.Code)
	}
	rec = transition(t, h, "objects", "o-t1", "publish")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "PUBLISHED" {
		t.Fatalf("publish 失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = transition(t, h, "objects", "o-t1", "publish")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "PUBLISHED" {
		t.Fatalf("publish 重放应幂等，实际 %d", rec.Code)
	}
	rec = transition(t, h, "objects", "o-nope", "submit")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知对象应 404，实际 %d", rec.Code)
	}
}

func TestEdgeReferenceCount(t *testing.T) {
	h := demoServer(t)

	refBefore := func(name string) float64 {
		var objs []map[string]any
		loadList(t, h, "/api/v1/objects?scope=registry", &objs)
		for _, o := range objs {
			if o["name"] == name {
				return o["refCount"].(float64)
			}
		}
		t.Fatalf("对象 %s 不存在", name)
		return -1
	}
	supplierBefore, plantBefore := refBefore("供应商"), refBefore("工厂")

	// 创建合法关系（两端 PUBLISHED）→ refCount 各 +1
	rec := callJSON(t, h, http.MethodPost, "/api/v1/edges", map[string]any{
		"id": "e-t1", "name": "TEST_REF（测试引用）", "from": "供应商", "to": "工厂",
		"props": []map[string]any{{"name": "qty", "type": "int", "comment": "数量"}}})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建关系 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if got := refBefore("供应商"); got != supplierBefore+1 {
		t.Fatalf("供应商 refCount = %v, want %v", got, supplierBefore+1)
	}
	if got := refBefore("工厂"); got != plantBefore+1 {
		t.Fatalf("工厂 refCount = %v, want %v", got, plantBefore+1)
	}

	// 引用 DRAFT 对象（o4 采购订单为 DRAFT）→ 400，计数不变
	rec = callJSON(t, h, http.MethodPost, "/api/v1/edges", map[string]any{
		"id": "e-t2", "name": "BAD_REF", "from": "供应商", "to": "采购订单"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("引用 DRAFT 应 400，实际 %d", rec.Code)
	}
	if got := refBefore("供应商"); got != supplierBefore+1 {
		t.Fatalf("被拒引用后供应商 refCount 变动: %v", got)
	}

	// 幂等重放不重复计数
	rec = callJSON(t, h, http.MethodPost, "/api/v1/edges", map[string]any{
		"id": "e-t1", "name": "TEST_REF（测试引用）", "from": "供应商", "to": "工厂"})
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("关系重放应 201+replay，实际 %d", rec.Code)
	}
	if got := refBefore("供应商"); got != supplierBefore+1 {
		t.Fatalf("重放后供应商 refCount 变动: %v", got)
	}
}

func TestFuncCreateAndTransition(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/functions", map[string]any{
		"id": "f-t1", "name": "测试指标", "cat": "指标", "signature": "() → decimal", "impl": "sum(x)"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建函数 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = transition(t, h, "functions", "f-t1", "publish")
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "PUBLISHED" {
		t.Fatalf("函数 publish 失败: %d %s", rec.Code, rec.Body.String())
	}
	bad := map[string]any{"id": "f-bad", "name": "坏函数", "cat": "魔法", "signature": "() → x"}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/functions", bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非法 cat 应 400，实际 %d", rec.Code)
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/functions/f-nope",
		map[string]any{"name": "x", "cat": "指标"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知函数 PUT 应 404，实际 %d", rec.Code)
	}
}
