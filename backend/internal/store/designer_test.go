package store

import "testing"

// 元素生命周期状态机纯函数单测：合法迁移 / 非法迁移 / 重放识别 / 未知动作。
func TestElementNextStatus(t *testing.T) {
	tests := []struct {
		action, cur string
		want        string
		wantErr     bool
	}{
		{"submit", "DRAFT", "IN_REVIEW", false},
		{"publish", "DRAFT", "PUBLISHED", false},     // 所有者快捷发布
		{"publish", "IN_REVIEW", "PUBLISHED", false}, // 评审后发布
		{"deprecate", "PUBLISHED", "DEPRECATED", false},
		{"submit", "IN_REVIEW", "", true},
		{"submit", "PUBLISHED", "", true},
		{"deprecate", "DRAFT", "", true},
		{"publish", "DEPRECATED", "", true},
		{"reject", "IN_REVIEW", "", true},
	}
	for _, tt := range tests {
		got, err := ElementNextStatus(tt.action, tt.cur)
		if tt.wantErr {
			if err == nil {
				t.Fatalf("ElementNextStatus(%s,%s) = %q, want error", tt.action, tt.cur, got)
			}
			continue
		}
		if err != nil || got != tt.want {
			t.Fatalf("ElementNextStatus(%s,%s) = %q,%v want %q", tt.action, tt.cur, got, err, tt.want)
		}
	}
}

func TestIsElementReplay(t *testing.T) {
	if !IsElementReplay("publish", "PUBLISHED") {
		t.Fatal("publish on PUBLISHED 应为重放")
	}
	if IsElementReplay("deprecate", "PUBLISHED") {
		t.Fatal("deprecate on PUBLISHED 是首次执行")
	}
	if IsElementReplay("submit", "DRAFT") {
		t.Fatal("submit on DRAFT 是首次执行")
	}
}
