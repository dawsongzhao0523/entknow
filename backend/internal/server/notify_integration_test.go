//go:build integration

// 通知中心集成测试：定向可见性、已读翻转与幂等、全部已读、评审裁决定向提出人。
package server

import (
	"net/http"
	"strings"
	"testing"
)

func TestNotificationVisibilityAndRead(t *testing.T) {
	h := demoServer(t)

	// 王五：见个人定向（n2/n6），不见张三定向（n1/n3/n4/n5）
	list := []map[string]any{}
	loadList(t, h, "/api/v1/notifications?user=wangwu", &list)
	ids := map[string]bool{}
	for _, n := range list {
		ids[n["id"].(string)] = true
	}
	if !ids["n2"] || !ids["n6"] {
		t.Fatalf("王五应见定向通知 n2/n6，实际 %v", ids)
	}
	if ids["n1"] || ids["n3"] {
		t.Fatalf("王五不应见张三的定向通知，实际 %v", ids)
	}

	// 已读：标记 → 未读翻转；重复标记幂等
	rec := callJSON(t, h, http.MethodPut, "/api/v1/notifications/n2/read", map[string]any{"user": "wangwu"})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("标记已读失败: %d", rec.Code)
	}
	list = nil
	loadList(t, h, "/api/v1/notifications?user=wangwu", &list)
	for _, n := range list {
		if n["id"] == "n2" && n["unread"] != false {
			t.Fatal("n2 标记后应为已读")
		}
	}
	rec = callJSON(t, h, http.MethodPut, "/api/v1/notifications/n2/read", map[string]any{"user": "wangwu"})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("重复标记应幂等 204，实际 %d", rec.Code)
	}
	// 他人不可读不可见的通知 → 404
	rec = callJSON(t, h, http.MethodPut, "/api/v1/notifications/n1/read", map[string]any{"user": "wangwu"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("不可见通知标记应 404，实际 %d", rec.Code)
	}

	// 全部已读：张三剩余未读清零
	rec = callJSON(t, h, http.MethodPut, "/api/v1/notifications/read-all", map[string]any{"user": "zhangsan"})
	if rec.Code != http.StatusOK {
		t.Fatalf("全部已读失败: %d", rec.Code)
	}
	list = nil
	loadList(t, h, "/api/v1/notifications?user=zhangsan", &list)
	for _, n := range list {
		if n["unread"] == true {
			t.Fatalf("全部已读后仍有未读: %v", n["id"])
		}
	}
	// 王五的已读状态不受张三影响（n6 仍可标）
	rec = callJSON(t, h, http.MethodPut, "/api/v1/notifications/n6/read", map[string]any{"user": "wangwu"})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("王五标记 n6 失败: %d", rec.Code)
	}
}

func TestReviewDecisionNotifiesProposer(t *testing.T) {
	h := demoServer(t)

	// seed 评审由王五提出（from=王五）→ 裁决后王五收到定向通知
	list := []map[string]any{}
	loadList(t, h, "/api/v1/reviews", &list)
	var target map[string]any
	for _, r := range list {
		if r["from"] == "王五" && r["status"] == "待评审" {
			target = r
			break
		}
	}
	if target == nil {
		t.Fatal("缺少王五提出的待评审项")
	}
	rec := callJSON(t, h, http.MethodPut, "/api/v1/reviews/"+target["id"].(string)+"/decision",
		map[string]any{"action": "approve", "by": "张三", "comment": "通知定向验证"})
	if rec.Code != http.StatusOK {
		t.Fatalf("裁决失败: %d %s", rec.Code, rec.Body.String())
	}
	notifs := []map[string]any{}
	loadList(t, h, "/api/v1/notifications?user=wangwu", &notifs)
	found := false
	for _, n := range notifs {
		if n["toUser"] == "wangwu" &&
			strings.Contains(n["title"].(string), target["title"].(string)) {
			found = true
		}
	}
	if !found {
		t.Fatalf("王五未收到裁决定向通知: %v", notifs)
	}
}
