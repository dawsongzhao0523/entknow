//go:build integration

// M2 知识运营集成测试：条目幂等创建 / 版本乐观并发 / 软删除幂等 / 发布流转 /
// 领域计数与过滤 / 同义词归并（幂等、换词 409、非组内词 400）。
package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func kbEntryBody(id string) map[string]any {
	return map[string]any{
		"id": id, "domainId": "purchase", "title": "集成测试条目：" + id, "status": "待评审",
		"source": "手工", "mode": "## 业务模式\n测试条目。",
		"terms":     []map[string]any{{"term": "测试术语", "en": "test_term", "def": "集成测试用", "source": "KB 词条"}},
		"sops":      []string{"测试 SOP"},
		"updatedBy": "张三",
	}
}

func listKb(t *testing.T, h http.Handler, domain, kw string) []map[string]any {
	t.Helper()
	path := "/api/v1/kb/entries?domain=" + domain + "&kw=" + kw
	var list []map[string]any
	loadList(t, h, path, &list)
	return list
}

func countID(list []map[string]any, id string) int {
	n := 0
	for _, x := range list {
		if x["id"] == id {
			n++
		}
	}
	return n
}

func TestKbEntryCRUD(t *testing.T) {
	h := demoServer(t)

	// 创建 + 幂等重放
	rec := callJSON(t, h, http.MethodPost, "/api/v1/kb/entries", kbEntryBody("kb-t1"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("创建 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodPost, "/api/v1/kb/entries", kbEntryBody("kb-t1"))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重放应 201+replay，实际 %d", rec.Code)
	}

	// 领域过滤与幂等不重复
	if n := countID(listKb(t, h, "purchase", ""), "kb-t1"); n != 1 {
		t.Fatalf("kb-t1 在 purchase 出现 %d 次，want 1", n)
	}

	// 乐观并发：同一 version 两次更新，第二次 409
	body := kbEntryBody("kb-t1")
	body["expectedVersion"] = 1
	body["title"] = "集成测试条目：kb-t1（改）"
	body["updatedBy"] = "王五"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/kb/entries/kb-t1", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("首次更新 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if v := decodeMap(t, rec)["version"].(float64); v != 2 {
		t.Fatalf("更新后 version = %v, want 2", v)
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/kb/entries/kb-t1", body) // 仍是 expectedVersion=1
	if rec.Code != http.StatusConflict {
		t.Fatalf("过期 version 更新应 409，实际 %d", rec.Code)
	}

	// 发布流转：待评审 → 已评审
	body["expectedVersion"] = 2
	body["status"] = "已评审"
	rec = callJSON(t, h, http.MethodPut, "/api/v1/kb/entries/kb-t1", body)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已评审" {
		t.Fatalf("发布失败: %d %s", rec.Code, rec.Body.String())
	}

	// 软删除幂等：列表不再可见
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/kb/entries/kb-t1", nil)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已失效" {
		t.Fatalf("软删除失败: %d %s", rec.Code, rec.Body.String())
	}
	rec = callJSON(t, h, http.MethodDelete, "/api/v1/kb/entries/kb-t1", nil)
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已失效" {
		t.Fatalf("重复软删除应幂等 200，实际 %d", rec.Code)
	}
	if n := countID(listKb(t, h, "purchase", ""), "kb-t1"); n != 0 {
		t.Fatalf("软删除后仍出现在列表 %d 次", n)
	}

	// 404
	rec = callJSON(t, h, http.MethodPut, "/api/v1/kb/entries/kb-nope", body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知条目 PUT 应 404，实际 %d", rec.Code)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/kb/entries/kb-nope", nil)
	r2 := httptest.NewRecorder()
	h.ServeHTTP(r2, req)
	if r2.Code != http.StatusNotFound {
		t.Fatalf("未知条目 GET 应 404，实际 %d", r2.Code)
	}
}

func TestKbDomainsAndKwFilter(t *testing.T) {
	h := demoServer(t)
	var domains []map[string]any
	loadList(t, h, "/api/v1/kb/domains", &domains)
	counts := map[string]float64{}
	for _, d := range domains {
		counts[d["id"].(string)] = d["entryCount"].(float64)
	}
	for id, want := range map[string]float64{"purchase": 3, "plan": 1, "quality": 1, "scm": 0} {
		if counts[id] != want {
			t.Fatalf("领域 %s 计数 = %v, want %v", id, counts[id], want)
		}
	}
	if n := len(listKb(t, h, "", "订单")); n != 1 { // 标题「采购订单」
		t.Fatalf("kw=订单 命中 %d 条，want 1", n)
	}
}

func TestSynonymMerge(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/synonyms/s1/merge",
		map[string]any{"standard": "供应商", "by": "王五"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已归并" {
		t.Fatalf("归并失败: %d %s", rec.Code, rec.Body.String())
	}

	// 同词幂等重放
	rec = callJSON(t, h, http.MethodPost, "/api/v1/synonyms/s1/merge",
		map[string]any{"standard": "供应商", "by": "王五"})
	if rec.Code != http.StatusOK || decodeMap(t, rec)["standard"] != "供应商" {
		t.Fatalf("同词重放应 200 幂等，实际 %d", rec.Code)
	}

	// 换词重复归并 → 409
	rec = callJSON(t, h, http.MethodPost, "/api/v1/synonyms/s1/merge",
		map[string]any{"standard": "供货商", "by": "李四"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("换词归并应 409，实际 %d", rec.Code)
	}

	// 标准词不在组内 → 400
	rec = callJSON(t, h, http.MethodPost, "/api/v1/synonyms/s2/merge",
		map[string]any{"standard": "物料", "by": "王五"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("非组内标准词应 400，实际 %d", rec.Code)
	}

	// 404
	rec = callJSON(t, h, http.MethodPost, "/api/v1/synonyms/nope/merge",
		map[string]any{"standard": "x", "by": "y"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知同义词组应 404，实际 %d", rec.Code)
	}

	// status 过滤
	var pending []map[string]any
	loadList(t, h, "/api/v1/synonyms?status=待归并", &pending)
	if len(pending) != 2 { // s2、s3（s1 已归并）
		t.Fatalf("待归并 = %d 组, want 2", len(pending))
	}
}
