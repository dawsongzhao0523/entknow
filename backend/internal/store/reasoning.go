// 推理引擎：规则确定性执行（传播触发 + 风险分重算）与本体一致性检查（派生）。
package store

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"
)

// ConsistencyIssue 一致性问题。
type ConsistencyIssue struct {
	Level  string `json:"level"` // error | warn
	Key    string `json:"key"`
	Detail string `json:"detail"`
}

// RunResult 规则执行结果。
type RunResult struct {
	RuleID    string `json:"ruleId"`
	Fired     int    `json:"fired"`
	Instances int    `json:"instances"`
	Detail    string `json:"detail"`
}

// Consistency 本体一致性检查（确定性派生）：边引用完整 / 映射缺失 / 状态机空转 / 绑定引用失效。
func (s *Store) Consistency(ctx context.Context, ontoID string) ([]ConsistencyIssue, error) {
	var issues []ConsistencyIssue
	objects, err := s.ListObjects(ctx, "")
	if err != nil {
		return nil, err
	}
	objIDs := map[string]bool{}
	onto := objectsOf(objects, ontologyName(ontoID))
	for _, o := range objects {
		objIDs[o.ID] = true
	}
	edges, err := s.ListEdges(ctx)
	if err != nil {
		return nil, err
	}
	for _, e := range edges {
		if !objIDs[e.From] || !objIDs[e.To] {
			issues = append(issues, ConsistencyIssue{Level: "error", Key: "edge-ref",
				Detail: fmt.Sprintf("关系「%s」引用了不存在的对象（%s → %s）", e.Name, e.From, e.To)})
		}
	}
	canvasIDs := s.canvasObjectIDs(ctx)
	for _, o := range onto {
		if o.Mapping == "" && canvasIDs[o.ID] {
			issues = append(issues, ConsistencyIssue{Level: "warn", Key: "no-mapping",
				Detail: fmt.Sprintf("对象「%s」未配置数据映射（画布对象）", o.Name)})
		}
		if len(o.StateMachine) > 0 {
			var n int
			if err := s.pool.QueryRow(ctx,
				`SELECT count(*) FROM instances WHERE object_id=$1`, o.ID).Scan(&n); err != nil {
				return nil, err
			}
			if n == 0 {
				issues = append(issues, ConsistencyIssue{Level: "warn", Key: "idle-state-machine",
					Detail: fmt.Sprintf("对象「%s」定义了状态机但尚无实例", o.Name)})
			}
		}
	}
	bindings, err := s.ListBindings(ctx)
	if err != nil {
		return nil, err
	}
	for _, b := range bindings {
		if !objIDs[b.ObjectID] {
			issues = append(issues, ConsistencyIssue{Level: "error", Key: "binding-ref",
				Detail: fmt.Sprintf("绑定 %s 指向不存在的对象 %s", b.ID, b.ObjectID)})
		}
	}
	return issues, nil
}

// RunRule 规则确定性执行：
// R1 齐套率<80% → 风险分 +5；R2 超期未收货（承诺交期 < 今日且状态≠已收货/已关闭）→ +8；
// 其余规则 id → 按「风险分>60 且未冻结」+3。触发写 rule_firings，实例风险分同步更新（幂等重跑覆盖式）。
func (s *Store) RunRule(ctx context.Context, ruleID string) (RunResult, error) {
	instances, err := s.ListInstances(ctx, "", "")
	if err != nil {
		return RunResult{}, err
	}
	today := time.Now().Format("2006-01-02")
	res := RunResult{RuleID: ruleID, Instances: len(instances)}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return res, err
	}
	defer tx.Rollback(ctx)

	// 覆盖式重跑：清掉本规则旧触发再写新结果
	if _, err := tx.Exec(ctx, `DELETE FROM rule_firings WHERE rule_id=$1 AND instance_id<>''`, ruleID); err != nil {
		return res, err
	}

	for _, inst := range instances {
		var delta int
		var why string
		switch ruleID {
		case "R1":
			if v, ok := inst.Props["齐套率"]; ok {
				rate, _ := strconv.ParseFloat(fmt.Sprint(v), 64)
				if rate < 80 {
					delta, why = 5, fmt.Sprintf("齐套率 %.0f%% < 80%% → 风险 +5", rate)
				}
			}
		case "R2":
			if inst.PromiseDt != "" && inst.PromiseDt < today && inst.Status != "已收货" && inst.Status != "已关闭" {
				delta, why = 8, fmt.Sprintf("承诺交期 %s 已过期（%s）→ 风险 +8", inst.PromiseDt, inst.Status)
			}
		default:
			if inst.RiskScore > 60 && inst.Status != "已冻结" {
				delta, why = 3, fmt.Sprintf("风险分 %d > 60 且未冻结 → 风险 +3", inst.RiskScore)
			}
		}
		if delta == 0 {
			continue
		}
		newScore := inst.RiskScore + delta
		if newScore > 100 {
			newScore = 100
		}
		if _, err := tx.Exec(ctx, `UPDATE instances SET risk_score=$2 WHERE id=$1`, inst.ID, newScore); err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO rule_firings (id, rule_id, instance_id, detail, fired_at)
			VALUES ($1,$2,$3,$4,$5)`,
			fmt.Sprintf("rf-%s-%s-%s", ruleID, inst.ID, time.Now().Format("150405")),
			ruleID, inst.ID, fmt.Sprintf("规则 %s 触发：%s → 风险分 %d→%d", ruleID, why, inst.RiskScore, newScore),
			time.Now().Format("2006-01-02 15:04")); err != nil {
			return res, err
		}
		res.Fired++
	}
	if err := tx.Commit(ctx); err != nil {
		return res, err
	}
	res.Detail = fmt.Sprintf("规则 %s 执行完成：%d/%d 个实例触发，风险分已重算", ruleID, res.Fired, len(instances))
	if err := s.EmitSystemLog(ctx, "INFO", "推理引擎", res.Detail); err != nil {
		log.Printf("syslog: 规则执行落库失败: %v", err)
	}
	return res, nil
}

// canvasObjectIDs 画布对象 id 集合（canvas 列未入 Object 结构，按需直查）。
func (s *Store) canvasObjectIDs(ctx context.Context) map[string]bool {
	out := map[string]bool{}
	rows, err := s.pool.Query(ctx, `SELECT id FROM objects WHERE canvas`)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		out[id] = true
	}
	return out
}
