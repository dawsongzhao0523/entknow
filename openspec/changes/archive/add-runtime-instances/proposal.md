# Proposal: add-runtime-instances（M4 本体运行时：实例 360 与行动网关）

## Background

M2/M8 写路径已上线。M4 本体运行时是"行动才改世界"的落点：对象实例的真实数据、状态与风险分的传播、以及经治理的行动执行。原型 Instance360（属性+关系图+时间线）与 ActionGateway（行动日志：成功/权限拒绝/回滚）已定义交互。

## Goal

1. **实例模型与查询**：`instances`（对象实例：props jsonb、status、riskScore、orderDt/promiseDt）+ `instance_events`（时间线）；GET 列表（object/kw 过滤）与 360 详情（含时间线）。
2. **时间线追加写路径**：POST /api/v1/instances/{id}/events，(instance_id, t, e) 唯一约束幂等。
3. **行动网关**：POST /api/v1/actions——校验函数为「行动」类、用户存在、实例存在；风险分>80 必须 confirm=true（二次确认语义）；事务内写执行记录 + 实例事件 + 通知；客户端 ID 幂等。
4. **规则传播记录**：`rule_firings` 查询（按规则过滤）+ 幂等记录接口。
5. 前端 M4：实例 360 页（查询 + 属性 + 时间线 + 关系示意 + 执行行动弹窗）、规则与行动页（规则表 + 触发记录 + 行动日志）。

## Scope

- schema：instances / instance_events / rule_firings / actions + demo seed（对照原型 INSTANCE_PO、ACT 日志、R1 传播记录）
- API：instances 列表/详情/事件追加；rule-firings 列表/记录；actions 列表/执行
- frontend：m4/instance-360、m4/runtime 两页

## 非目标（后续提案）

- 关系实例（SUPPLY 边实例）与时序聚合
- 状态机引擎（状态流转由事件驱动计算）与传播规则引擎的真实求值（当前为记录与治理）
- 行动 dry-run/回滚链路、M6 沙盘验证联动

## 原型落地情况（UI 原型先行门槛）

M4 三页（Instance360 / ActionGateway / Propagation）已在 prototype 落地并确认；本提案复用其信息结构（风险分、时间线事件文案、行动日志列、触发方式标签）。

## 输入需求

docs/requirement/20261006本体运行时实例与行动.md
