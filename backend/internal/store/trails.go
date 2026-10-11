// 推理治理：推理轨迹（事实→事理→行动链路）+ 约束强度分级 + 规则元数据。
// 依据《本体驱动的AI数据管理》第 7 章：可解释、可追溯的推理过程是治理基石。
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// TrailStep 推理链路单步。
type TrailStep struct {
	Step   string `json:"step"`   // 事实 | 事理 | 行动
	Detail string `json:"detail"`
}

// ReasoningTrail 推理轨迹。
type ReasoningTrail struct {
	ID         int         `json:"id"`
	RuleID     string      `json:"ruleId"`
	InstanceID string      `json:"instanceId"`
	Onto       string      `json:"onto"`
	RulesHit   string      `json:"rulesHit"`
	Steps      []TrailStep `json:"steps"`
	Conclusion string      `json:"conclusion"`
	CreatedAt  string      `json:"createdAt"`
}

// ListTrails 推理轨迹查询（按实例 / 规则过滤，倒序）。
func (s *Store) ListTrails(ctx context.Context, instance, rule string, limit int) ([]ReasoningTrail, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, rule_id, instance_id, onto, rules_hit, steps::text, conclusion, created_at
		FROM reasoning_trails
		WHERE ($1 = '' OR instance_id = $1) AND ($2 = '' OR rule_id = $2)
		ORDER BY id DESC LIMIT $3`, instance, rule, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ReasoningTrail{}
	for rows.Next() {
		var t ReasoningTrail
		var steps string
		if err := rows.Scan(&t.ID, &t.RuleID, &t.InstanceID, &t.Onto, &t.RulesHit, &steps, &t.Conclusion, &t.CreatedAt); err != nil {
			return nil, err
		}
		t.Steps = decodeSteps(steps)
		out = append(out, t)
	}
	return out, rows.Err()
}

// writeTrail 写入推理轨迹（独立小事务；主流程事务已提交后调用）。
func (s *Store) writeTrail(ctx context.Context, ruleID, instanceID, rulesHit string, steps []TrailStep, conclusion string) error {
	b, _ := json.Marshal(steps)
	_, err := s.pool.Exec(ctx, `
		INSERT INTO reasoning_trails (rule_id, instance_id, onto, rules_hit, steps, conclusion, created_at)
		VALUES ($1, $2, '', $3, $4::jsonb, $5, $6)`,
		ruleID, instanceID, rulesHit, string(b), conclusion, time.Now().Format("2006-01-02 15:04"))
	return err
}

func decodeSteps(s string) []TrailStep {
	out := []TrailStep{}
	_ = json.Unmarshal([]byte(s), &out)
	return out
}

// ruleMeta 规则元数据（行动函数 + 约束等级）。
type ruleMeta struct {
	Def             string
	ActionFunc      string
	ConstraintLevel string
}

// getRuleMeta 读规则元数据。
func (s *Store) getRuleMeta(ctx context.Context, ruleID string) (ruleMeta, error) {
	var m ruleMeta
	err := s.pool.QueryRow(ctx,
		`SELECT def, action_func, constraint_level FROM rules WHERE id = $1`, ruleID).
		Scan(&m.Def, &m.ActionFunc, &m.ConstraintLevel)
	if errors.Is(err, pgx.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

// objectConstraintLevel 实例所属对象的约束等级（默认 advisory）。
func (s *Store) objectConstraintLevel(ctx context.Context, objectID string) string {
	var lvl string
	err := s.pool.QueryRow(ctx,
		`SELECT constraint_level FROM objects WHERE id = $1`, objectID).Scan(&lvl)
	if err != nil || lvl == "" {
		return "advisory"
	}
	return lvl
}

// constraintGate 约束分级网关：
// strong（强约束·安全合规）→ 风险分>60 未确认即拦截（ErrForbidden）；
// weak（弱约束·提示确认）→ 风险分>80 未确认需二次确认（ErrInvalid）；
// advisory（建议级）→ 不拦截，仅记录。
func constraintGate(level string, riskScore int, confirmed bool) error {
	switch level {
	case "strong":
		if riskScore > 60 && !confirmed {
			return fmt.Errorf("%w: 强约束对象（风险分 %d > 60）：行动需二次确认后方可执行", ErrForbidden, riskScore)
		}
	case "weak":
		if riskScore > 80 && !confirmed {
			return fmt.Errorf("%w: 实例风险分 %d > 80：行动需二次确认（confirm=true）", ErrInvalid, riskScore)
		}
	}
	return nil
}

// SetConstraintLevel 设置元素约束等级（objects/edges/rules 通用）。
func (s *Store) SetConstraintLevel(ctx context.Context, elemType, id, level string) error {
	switch level {
	case "strong", "weak", "advisory":
	default:
		return fmt.Errorf("%w: 约束等级必须为 strong/weak/advisory", ErrInvalid)
	}
	var table string
	switch elemType {
	case "object":
		table = "objects"
	case "edge":
		table = "edges"
	case "rule":
		table = "rules"
	default:
		return fmt.Errorf("%w: 元素类型必须为 object/edge/rule", ErrInvalid)
	}
	tag, err := s.pool.Exec(ctx,
		`UPDATE `+table+` SET constraint_level = $2 WHERE id = $1`, id, level)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
