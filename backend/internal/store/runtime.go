// M4 本体运行时：对象实例 360、时间线、规则传播记录、行动网关（治理化执行）。
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type InstanceEvent struct {
	T string `json:"t"`
	E string `json:"e"`
}

type Instance struct {
	ID        string                 `json:"id"`
	ObjectID  string                 `json:"objectId"`
	Status    string                 `json:"status"`
	Props     map[string]interface{} `json:"props"`
	RiskScore int                    `json:"riskScore"`
	OrderDt   string                 `json:"orderDt,omitempty"`
	PromiseDt string                 `json:"promiseDt,omitempty"`
	Timeline  []InstanceEvent        `json:"timeline,omitempty"` // 仅详情返回
}

type RuleFiring struct {
	ID         string `json:"id"`
	RuleID     string `json:"ruleId"`
	InstanceID string `json:"instanceId,omitempty"`
	Detail     string `json:"detail"`
	FiredAt    string `json:"firedAt,omitempty"`
}

type Action struct {
	ID         string `json:"id"`
	FuncID     string `json:"funcId"`
	InstanceID string `json:"instanceId"`
	User       string `json:"user"`
	Trigger    string `json:"trigger"`
	Status     string `json:"status"`
	Detail     string `json:"detail,omitempty"`
	Time       string `json:"time"`
}

// ErrForbidden 鉴权失败（用户不是系统账号），API 层转 403。
var ErrForbidden = errors.New("forbidden")

// ActionRequest 行动执行请求；Confirm 为风险分>80 时的二次确认。
type ActionRequest struct {
	ID         string
	FuncID     string
	InstanceID string
	User       string
	Trigger    string
	Confirm    bool
}

// ListInstances 过滤：object（对象 ID 精确）与 kw（实例号/属性值包含）。
func (s *Store) ListInstances(ctx context.Context, object, kw string) ([]Instance, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, object_id, status, props::text, risk_score, order_dt, promise_dt
		FROM instances
		WHERE ($1 = '' OR object_id = $1)
		  AND ($2 = '' OR id ILIKE '%' || $2 || '%' OR props::text ILIKE '%' || $2 || '%')
		ORDER BY id`, object, kw)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Instance
	for rows.Next() {
		i, err := scanInstance(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, i)
	}
	return out, rows.Err()
}

func scanInstance(row pgx.Row) (Instance, error) {
	var i Instance
	var props string
	err := row.Scan(&i.ID, &i.ObjectID, &i.Status, &props, &i.RiskScore, &i.OrderDt, &i.PromiseDt)
	if err != nil {
		return i, err
	}
	if err := json.Unmarshal([]byte(props), &i.Props); err != nil {
		return i, fmt.Errorf("instances %s props: %w", i.ID, err)
	}
	return i, nil
}

// GetInstance 实例 360：属性 + 时间线（时间正序）。
func (s *Store) GetInstance(ctx context.Context, id string) (Instance, error) {
	i, err := scanInstance(s.pool.QueryRow(ctx, `
		SELECT id, object_id, status, props::text, risk_score, order_dt, promise_dt
		FROM instances WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return i, ErrNotFound
	}
	if err != nil {
		return i, err
	}
	rows, err := s.pool.Query(ctx, `SELECT t, e FROM instance_events WHERE instance_id = $1 ORDER BY t, id`, id)
	if err != nil {
		return i, err
	}
	defer rows.Close()
	for rows.Next() {
		var ev InstanceEvent
		if err := rows.Scan(&ev.T, &ev.E); err != nil {
			return i, err
		}
		i.Timeline = append(i.Timeline, ev)
	}
	return i, rows.Err()
}

// AppendInstanceEvent 时间线追加：(instance_id, t, e) 唯一约束保证幂等；返回刷新后的 360 详情。
func (s *Store) AppendInstanceEvent(ctx context.Context, instanceID, t, e string) (Instance, error) {
	if _, err := s.GetInstance(ctx, instanceID); err != nil {
		return Instance{}, err // 404 透传
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO instance_events (instance_id, t, e) VALUES ($1, $2, $3)
		ON CONFLICT (instance_id, t, e) DO NOTHING`, instanceID, t, e); err != nil {
		return Instance{}, err
	}
	return s.GetInstance(ctx, instanceID)
}

func (s *Store) ListRuleFirings(ctx context.Context, rule string) ([]RuleFiring, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, rule_id, instance_id, detail, fired_at FROM rule_firings
		WHERE ($1 = '' OR rule_id = $1) ORDER BY fired_at DESC, id`, rule)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RuleFiring
	for rows.Next() {
		var f RuleFiring
		if err := rows.Scan(&f.ID, &f.RuleID, &f.InstanceID, &f.Detail, &f.FiredAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

// CreateRuleFiring 记录一次规则触发（幂等：客户端 id；ruleId 须对应已存在规则）。
func (s *Store) CreateRuleFiring(ctx context.Context, f RuleFiring) (RuleFiring, bool, error) {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM rules WHERE id = $1`, f.RuleID).Scan(&n); err != nil {
		return f, false, err
	}
	if n == 0 {
		return f, false, fmt.Errorf("%w: 规则 %s 不存在", ErrInvalid, f.RuleID)
	}
	if f.FiredAt == "" {
		f.FiredAt = time.Now().Format("2006-01-02 15:04")
	}
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO rule_firings (id, rule_id, instance_id, detail, fired_at)
		VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
		f.ID, f.RuleID, f.InstanceID, f.Detail, f.FiredAt)
	if err != nil {
		return f, false, err
	}
	if tag.RowsAffected() == 0 { // 幂等重放回读
		err = s.pool.QueryRow(ctx, `
			SELECT id, rule_id, instance_id, detail, fired_at FROM rule_firings WHERE id = $1`, f.ID).
			Scan(&f.ID, &f.RuleID, &f.InstanceID, &f.Detail, &f.FiredAt)
		return f, false, err
	}
	return f, true, nil
}

func (s *Store) ListActions(ctx context.Context, instance string) ([]Action, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, func_id, instance_id, user_name, trigger, status, detail, time FROM actions
		WHERE ($1 = '' OR instance_id = $1) ORDER BY time DESC, id`, instance)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Action
	for rows.Next() {
		var a Action
		if err := rows.Scan(&a.ID, &a.FuncID, &a.InstanceID, &a.User, &a.Trigger, &a.Status, &a.Detail, &a.Time); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// ExecuteAction 治理化执行：校验链（行动类函数 → 实例存在 → 用户为真实账号 → 高风险二次确认）
// 通过后单事务写入执行记录 + 实例时间线事件 + 确定性 ID 通知；客户端 id 幂等。
func (s *Store) ExecuteAction(ctx context.Context, r ActionRequest) (Action, bool, error) {
	// 函数必须是「行动」类
	var funcName, cat string
	err := s.pool.QueryRow(ctx, `SELECT name, cat FROM functions WHERE id = $1`, r.FuncID).Scan(&funcName, &cat)
	if errors.Is(err, pgx.ErrNoRows) {
		return Action{}, false, fmt.Errorf("%w: 函数 %s 不存在", ErrInvalid, r.FuncID)
	}
	if err != nil {
		return Action{}, false, err
	}
	if cat != "行动" {
		return Action{}, false, fmt.Errorf("%w: 函数 %s（%s）不是行动类，禁止经网关执行", ErrInvalid, funcName, cat)
	}

	inst, err := s.GetInstance(ctx, r.InstanceID)
	if err != nil {
		return Action{}, false, err // 404
	}

	// 鉴权：执行者必须是系统真实账号（403）
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM users WHERE name = $1 OR account = $1`, r.User).Scan(&n); err != nil {
		return Action{}, false, err
	}
	if n == 0 {
		return Action{}, false, fmt.Errorf("%w: 用户「%s」不是系统账号，无行动执行权限", ErrForbidden, r.User)
	}

	// 业务前置：风险分 > 80 必须二次确认
	if inst.RiskScore > 80 && !r.Confirm {
		return Action{}, false, fmt.Errorf("%w: 实例 %s 风险分 %d > 80，行动「%s」需要二次确认（confirm=true）",
			ErrInvalid, inst.ID, inst.RiskScore, funcName)
	}

	now := time.Now().Format("2006-01-02 15:04")
	a := Action{ID: r.ID, FuncID: r.FuncID, InstanceID: r.InstanceID, User: r.User,
		Trigger: r.Trigger, Status: "执行成功", Time: now}
	if a.Trigger == "" {
		a.Trigger = "manual"
	}
	a.Detail = fmt.Sprintf("%s（风险分 %d%s）", funcName, inst.RiskScore,
		map[bool]string{true: "，已二次确认", false: ""}[inst.RiskScore > 80])

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Action{}, false, err
	}
	defer tx.Rollback(ctx) // 提交成功后为 no-op

	tag, err := tx.Exec(ctx, `
		INSERT INTO actions (id, func_id, instance_id, user_name, trigger, status, detail, time)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
		a.ID, a.FuncID, a.InstanceID, a.User, a.Trigger, a.Status, a.Detail, a.Time)
	if err != nil {
		return Action{}, false, err
	}
	if tag.RowsAffected() == 0 { // 幂等重放：回读既有执行记录
		if err := tx.Rollback(ctx); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			return Action{}, false, err
		}
		existing, gerr := s.getAction(ctx, r.ID)
		return existing, false, gerr
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO instance_events (instance_id, t, e) VALUES ($1, $2, $3)
		ON CONFLICT (instance_id, t, e) DO NOTHING`,
		r.InstanceID, now, "行动执行："+a.Detail+" by "+r.User); err != nil {
		return Action{}, false, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO notifications (id, cat, title, time, to_path, unread)
		VALUES ($1, '待办处理', $2, '刚刚', '/runtime/instances', true)
		ON CONFLICT (id) DO NOTHING`,
		"n-act-"+r.ID, "行动已执行："+a.Detail+"（"+r.User+"）· 实例 "+r.InstanceID); err != nil {
		return Action{}, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Action{}, false, err
	}
	return a, true, nil
}

func (s *Store) getAction(ctx context.Context, id string) (Action, error) {
	var a Action
	err := s.pool.QueryRow(ctx, `
		SELECT id, func_id, instance_id, user_name, trigger, status, detail, time
		FROM actions WHERE id = $1`, id).
		Scan(&a.ID, &a.FuncID, &a.InstanceID, &a.User, &a.Trigger, &a.Status, &a.Detail, &a.Time)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, ErrNotFound
	}
	return a, err
}
