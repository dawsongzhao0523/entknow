# Design: add-runtime-instances

## 数据建模

- `instances(id, object_id, status, props jsonb, risk_score int, order_dt, promise_dt)`——props 存业务属性（supplier/plant/material/amount）。
- `instance_events(id serial, instance_id, t, e)`，`UNIQUE (instance_id, t, e)` → 追加幂等。
- `rule_firings(id, rule_id, instance_id, detail, fired_at)`——传播触发记录（记录型，不执行求值）。
- `actions(id, func_id, instance_id, user, trigger, status, detail, time)`——行动执行日志，对照原型 LOGS（manual/event/schedule、执行成功/权限拒绝/已回滚）。

## 行动网关业务规则（原型 f3「冻结订单」语义）

执行前校验（有序）：
1. 参数完整（id/funcId/instanceId/user 必填）→ 400
2. 函数存在且 cat=行动 → 400
3. 实例存在 → 404
4. user 必须在 users 表（鉴权语义：真实账号）→ 403
5. 实例 riskScore > 80 且未 confirm=true → 400（二次确认门槛）
6. 幂等：客户端 ID，ON CONFLICT 回读

成功执行单事务：INSERT actions（状态 执行成功）+ INSERT instance_event（「行动执行：冻结订单（f3）by 张三」）+ INSERT 通知（确定性 ID `n-act-{id}`）。

## API

- GET /api/v1/instances?object=&kw= · GET /api/v1/instances/{id}（含 timeline）
- POST /api/v1/instances/{id}/events {t, e}
- GET /api/v1/rule-firings?rule= · POST /api/v1/rule-firings {id, ruleId, instanceId?, detail}
- GET /api/v1/actions?instance= · POST /api/v1/actions {id, funcId, instanceId, user, trigger?, confirm?}

## 前端

- Instance360：顶部实例选择（按关键字搜）+ Descriptions（属性/状态/风险分）+ 关系示意（简化 SVG，同原型）+ Timeline + 「执行行动」按钮（弹窗：函数选择 f3、二次确认 Checkbox 风险分>80 时必须勾选）。
- RuntimeRules：规则表（R1-R4，fired 计数）+ 触发记录表 + 行动日志表（含权限拒绝/回滚状态色）。
