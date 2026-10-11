//go:build integration

// AI 建模集成测试：规则引擎回退生成 / 应用入库 / 29 句话模板 / 知识萃取。
package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// 验收标准 5.1：自然语言 → ≥3 对象 + ≥1 关系。
func TestAIGeneratePreview(t *testing.T) {
	h := demoServer(t)

	input := "采购订单有订单号/供应商/金额/交期四个属性，供应商供应物料，工厂生产工单"
	m := postJSON(t, h, "/api/v1/modeling/ai-generate", map[string]any{"input": input})

	objs := m["objects"].([]any)
	edges := m["edges"].([]any)
	if len(objs) < 3 {
		t.Fatalf("应生成 ≥3 个对象，实际 %d: %v", len(objs), m)
	}
	if len(edges) < 1 {
		t.Fatalf("应生成 ≥1 条关系，实际 %d: %v", len(edges), m)
	}
	if m["source"] != "rules" {
		t.Fatalf("未配置 LLM 时 source 应为 rules: %v", m["source"])
	}

	// 对象名应包含采购订单、供应商、物料
	names := map[string]bool{}
	for _, o := range objs {
		names[o.(map[string]any)["name"].(string)] = true
	}
	for _, want := range []string{"采购订单", "供应商", "物料"} {
		if !names[want] {
			t.Fatalf("缺少对象 %q: %v", want, names)
		}
	}
	// 采购订单应有 4 个属性
	for _, o := range objs {
		om := o.(map[string]any)
		if om["name"] == "采购订单" {
			if len(om["props"].([]any)) != 4 {
				t.Fatalf("采购订单应有 4 个属性，实际 %v", om["props"])
			}
		}
	}
}

func TestAIGenerateApply(t *testing.T) {
	h := demoServer(t)

	input := "设备台帐有设备编号/功率/投运日期三个属性，传感器监测设备"
	m := postJSON(t, h, "/api/v1/modeling/ai-generate", map[string]any{
		"input": input, "apply": true, "ontology": "设备运维本体", "by": "王五",
	})
	created := m["createdObjects"].([]any)
	if len(created) != 3 {
		t.Fatalf("应新建 3 个对象（设备台帐/传感器/设备），实际 %d: %v", len(created), m)
	}
	if len(m["createdEdges"].([]any)) != 1 || m["skippedEdges"].(float64) != 0 {
		t.Fatalf("应创建 1 条「监测」关系: %v", m)
	}
}

func TestTemplates(t *testing.T) {
	h := demoServer(t)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/templates", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("templates status = %d", rec.Code)
	}
	var ts []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &ts); err != nil {
		t.Fatal(err)
	}
	if len(ts) != 29 {
		t.Fatalf("29 句话模板应有 29 个，实际 %d", len(ts))
	}

	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/templates/categories", nil))
	var cats []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &cats); err != nil {
		t.Fatal(err)
	}
	if len(cats) != 7 {
		t.Fatalf("7 类分类，实际 %d", len(cats))
	}
}

func TestKbExtract(t *testing.T) {
	h := demoServer(t)

	// 先取一个知识条目 id
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/kb/entries", nil))
	var entries []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &entries); err != nil || len(entries) == 0 {
		t.Fatalf("知识条目为空或解析失败: %v", err)
	}
	id := entries[0]["id"].(string)

	m := postJSON(t, h, "/api/v1/kb/entries/"+id+"/extract", map[string]any{})
	if arr, ok := m["__array"].([]any); !ok || len(arr) < 0 {
		t.Fatalf("萃取结果应为候选数组: %v", m)
	}
}

func postJSON(t *testing.T, h http.Handler, path string, body map[string]any) map[string]any {
	t.Helper()
	rec := httptest.NewRecorder()
	payload, _ := json.Marshal(body)
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, path, strings.NewReader(string(payload))))
	if rec.Code >= 300 {
		t.Fatalf("POST %s status = %d, body = %s", path, rec.Code, rec.Body.String())
	}
	var m map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		// 可能是数组（如 extract 返回候选列表）
		var arr []any
		if err2 := json.Unmarshal(rec.Body.Bytes(), &arr); err2 == nil {
			return map[string]any{"__array": arr}
		}
		t.Fatalf("响应不是 JSON 对象: %v", err)
	}
	return m
}
