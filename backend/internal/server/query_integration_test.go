//go:build integration

// 语义查询集成测试：统一检索分类命中 / 查询执行幂等与 DSL / 空 q 400 / 历史过滤。
package server

import (
	"net/http"
	"testing"
)

func TestSearchCategories(t *testing.T) {
	h := demoServer(t)

	rec := doGet(t, h, "/api/v1/search?q=订单")
	if rec.Code != http.StatusOK {
		t.Fatalf("search status = %d", rec.Code)
	}
	m := decodeMap(t, rec)
	if len(m["objects"].([]any)) == 0 {
		t.Fatalf("「订单」应命中对象: %v", m)
	}
	if len(m["knowledge"].([]any)) == 0 {
		t.Fatalf("「订单」应命中知识条目: %v", m)
	}

	rec = doGet(t, h, "/api/v1/search?q=S-0012")
	if len(decodeMap(t, rec)["instances"].([]any)) == 0 {
		t.Fatalf("「S-0012」应命中实例")
	}

	rec = doGet(t, h, "/api/v1/search?q=供货商")
	if len(decodeMap(t, rec)["synonyms"].([]any)) == 0 {
		t.Fatalf("「供货商」应命中同义词组")
	}

	rec = doGet(t, h, "/api/v1/search?q=")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("空 q 应 400，实际 %d", rec.Code)
	}
}

func TestExecuteQueryAndHistory(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/queries",
		map[string]any{"id": "q-t1", "question": "准时率", "by": "张三"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("执行查询 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	m := decodeMap(t, rec)
	if m["hits"].(float64) < 1 || m["dsl"] == "" || m["latencyMs"].(float64) < 0 {
		t.Fatalf("执行结果异常: %v", m)
	}

	// 幂等重放：历史不重复
	rec = callJSON(t, h, http.MethodPost, "/api/v1/queries",
		map[string]any{"id": "q-t1", "question": "准时率", "by": "张三"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("重放 status = %d", rec.Code)
	}
	var hist []map[string]any
	loadList(t, h, "/api/v1/queries?by=张三", &hist)
	n := 0
	for _, x := range hist {
		if x["id"] == "q-t1" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("历史出现 %d 次，want 1", n)
	}

	// 必填校验
	rec = callJSON(t, h, http.MethodPost, "/api/v1/queries", map[string]any{"id": "q-x"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("缺 question/by 应 400，实际 %d", rec.Code)
	}

	// 历史（含 seed 2 条 + 本条）
	loadList(t, h, "/api/v1/queries", &hist)
	if len(hist) < 3 {
		t.Fatalf("历史 = %d 条，want ≥ 3", len(hist))
	}
}
