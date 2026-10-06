//go:build integration

// 评审流转写路径集成测试：幂等创建、状态机裁决、同向重放、乐观并发 409、
// 驳回必填原因 400、404、裁决通知事务副作用。
package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// decodeMap 把响应体解析为单个 JSON 对象。
func decodeMap(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("响应不是 JSON 对象: %v\n%s", err, rec.Body.String())
	}
	return m
}

// loadList 把响应体解析为 JSON 数组。
func loadList(t *testing.T, h http.Handler, path string, into *[]map[string]any) {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET %s = %d", path, rec.Code)
	}
	if err := json.Unmarshal(rec.Body.Bytes(), into); err != nil {
		t.Fatalf("GET %s 响应不是数组: %v", path, err)
	}
}

// mustJSON 序列化请求体。
func mustJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func callJSON(t *testing.T, h http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		buf.WriteString(mustJSON(t, body))
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func newReviewBody(id string) map[string]any {
	return map[string]any{"id": id, "title": "集成测试评审：" + id, "type": "本体发布", "from": "张三", "sla": "剩 3 天"}
}

func decisionBody(action, by, comment, expected string) map[string]any {
	d := map[string]any{"action": action, "by": by}
	if comment != "" {
		d["comment"] = comment
	}
	if expected != "" {
		d["expectedStatus"] = expected
	}
	return d
}

func TestCreateReviewIdempotent(t *testing.T) {
	h := demoServer(t)

	rec := callJSON(t, h, http.MethodPost, "/api/v1/reviews", newReviewBody("RV-T1"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("首次创建 status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("X-Idempotent-Replay") != "" {
		t.Fatal("首次创建不应有 replay 头")
	}

	rec = callJSON(t, h, http.MethodPost, "/api/v1/reviews", newReviewBody("RV-T1"))
	if rec.Code != http.StatusCreated || rec.Header().Get("X-Idempotent-Replay") != "true" {
		t.Fatalf("重复创建应 201+replay 头，实际 %d replay=%q", rec.Code, rec.Header().Get("X-Idempotent-Replay"))
	}

	var list []map[string]any
	loadList(t, h, "/api/v1/reviews", &list)
	n := 0
	for _, r := range list {
		if r["id"] == "RV-T1" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("RV-T1 出现 %d 次，want 1", n)
	}

	rec = callJSON(t, h, http.MethodPost, "/api/v1/reviews", map[string]any{"title": "缺 id"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("缺 id 应 400，实际 %d", rec.Code)
	}
}

func TestDecisionApproveAndReplay(t *testing.T) {
	h := demoServer(t)
	callJSON(t, h, http.MethodPost, "/api/v1/reviews", newReviewBody("RV-T2"))

	rec := callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T2/decision", decisionBody("approve", "王五", "", ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("approve status = %d, body = %s", rec.Code, rec.Body.String())
	}
	approved := decodeMap(t, rec)
	if approved["status"] != "已通过" || approved["decidedBy"] != "王五" {
		t.Fatalf("裁决结果异常: %v", approved)
	}

	// 同向重放：幂等返回现状，通知不重复
	rec = callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T2/decision", decisionBody("approve", "王五", "", ""))
	if rec.Code != http.StatusOK || decodeMap(t, rec)["decidedBy"] != "王五" {
		t.Fatalf("重放应 200 且字段不变，实际 %d", rec.Code)
	}
	var notifs []map[string]any
	loadList(t, h, "/api/v1/notifications", &notifs)
	n := 0
	for _, x := range notifs {
		if x["id"] == "n-rv-RV-T2-approve" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("裁决通知出现 %d 次，want 1（事务+确定性 ID 幂等）", n)
	}

	// 终态反向 → 409
	rec = callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T2/decision", decisionBody("reject", "王五", "理由", ""))
	if rec.Code != http.StatusConflict {
		t.Fatalf("终态反向裁决应 409，实际 %d", rec.Code)
	}
}

func TestDecisionConflict404AndValidation(t *testing.T) {
	h := demoServer(t)
	callJSON(t, h, http.MethodPost, "/api/v1/reviews", newReviewBody("RV-T3"))

	// 乐观并发：expectedStatus 与实际不符 → 409，且状态未变
	rec := callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T3/decision",
		decisionBody("approve", "王五", "", "评审中"))
	if rec.Code != http.StatusConflict {
		t.Fatalf("expectedStatus 冲突应 409，实际 %d", rec.Code)
	}
	var list []map[string]any
	loadList(t, h, "/api/v1/reviews", &list)
	for _, r := range list {
		if r["id"] == "RV-T3" && r["status"] != "待评审" {
			t.Fatalf("冲突后状态被改变: %v", r["status"])
		}
	}

	// 404
	rec = callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-NOPE/decision", decisionBody("approve", "王五", "", ""))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("未知评审应 404，实际 %d", rec.Code)
	}

	// 驳回必填原因 → 400
	rec = callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T3/decision", decisionBody("reject", "王五", "", ""))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("驳回缺原因应 400，实际 %d", rec.Code)
	}
}

func TestDecisionRejectAndWithdraw(t *testing.T) {
	h := demoServer(t)
	callJSON(t, h, http.MethodPost, "/api/v1/reviews", newReviewBody("RV-T4"))

	rec := callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T4/decision",
		decisionBody("reject", "李四", "术语归并与既有锚点冲突，请先解除引用", ""))
	m := decodeMap(t, rec)
	if rec.Code != http.StatusOK || m["status"] != "已驳回" || m["comment"] == "" {
		t.Fatalf("驳回结果异常: %d %v", rec.Code, m)
	}

	callJSON(t, h, http.MethodPost, "/api/v1/reviews", newReviewBody("RV-T5"))
	rec = callJSON(t, h, http.MethodPut, "/api/v1/reviews/RV-T5/decision", decisionBody("withdraw", "张三", "", ""))
	if rec.Code != http.StatusOK || decodeMap(t, rec)["status"] != "已撤回" {
		t.Fatalf("撤回结果异常: %d %s", rec.Code, rec.Body.String())
	}
}
