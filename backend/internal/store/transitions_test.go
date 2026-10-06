package store

import "testing"

// 状态机纯函数单测（无 DB）：合法迁移 / 非法迁移 / 重放识别 / 未知动作。
func TestNextStatus(t *testing.T) {
	tests := []struct {
		action, cur string
		want        string
		wantErr     bool
	}{
		{"approve", "待评审", "已通过", false},
		{"approve", "评审中", "已通过", false},
		{"reject", "待评审", "已驳回", false},
		{"reject", "评审中", "已驳回", false},
		{"withdraw", "评审中", "已撤回", false},
		{"approve", "已通过", "", true},  // 终态
		{"reject", "已通过", "", true},   // 终态反向
		{"withdraw", "已驳回", "", true}, // 终态
		{"approve", "已撤回", "", true},  // 终态
		{"sign", "待评审", "", true},     // 未知动作
	}
	for _, tt := range tests {
		got, err := NextStatus(tt.action, tt.cur)
		if tt.wantErr {
			if err == nil {
				t.Fatalf("NextStatus(%s,%s) = %q, want error", tt.action, tt.cur, got)
			}
			continue
		}
		if err != nil || got != tt.want {
			t.Fatalf("NextStatus(%s,%s) = %q,%v want %q", tt.action, tt.cur, got, err, tt.want)
		}
	}
}

func TestIsReplay(t *testing.T) {
	if !IsReplay("approve", "已通过") {
		t.Fatal("approve on 已通过 应识别为重放")
	}
	if IsReplay("reject", "已通过") {
		t.Fatal("reject on 已通过 不是重放（是冲突）")
	}
	if IsReplay("approve", "待评审") {
		t.Fatal("待评审 上的 approve 是首次执行，不是重放")
	}
}
