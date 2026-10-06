package store

import "fmt"

// 评审状态机：待评审/评审中 →（approve→已通过 | reject→已驳回 | withdraw→已撤回）；终态不可迁移。
var reviewOutcome = map[string]string{
	"approve":  "已通过",
	"reject":   "已驳回",
	"withdraw": "已撤回",
}

// IsReplay：当前状态已是该动作的结果（同向终态重放，调用方应幂等返回现状）。
func IsReplay(action, cur string) bool {
	return reviewOutcome[action] == cur
}

// NextStatus 返回合法迁移结果；终态迁移或未知动作返回错误（调用方转 409/400）。
func NextStatus(action, cur string) (string, error) {
	outcome, ok := reviewOutcome[action]
	if !ok {
		return "", fmt.Errorf("未知裁决动作 %q（允许 approve/reject/withdraw）", action)
	}
	if cur == "待评审" || cur == "评审中" {
		return outcome, nil
	}
	return "", fmt.Errorf("状态 %q 已是终态，不可执行 %q", cur, action)
}
