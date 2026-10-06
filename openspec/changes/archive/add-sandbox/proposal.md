# Proposal: add-sandbox（M6 推演沙盘）

## Background

收官提案。M6 沙盘是「推演不落地，行动才改世界」的验证场：在克隆世界中对高风险实例施加假设、比较多分支方案的风险与代价，生产隔离（回滚即放弃，永不回写）。

## Goal

1. **分支模型**：`sandbox_branches`（假设/基准实例/推演前风险/推演后风险/代价/结论/状态）+ seed 三分支对照原型（A 基准 / B 切换供应商 / C 提前下单）。
2. **API**：GET 列表；POST 幂等建分支；POST {id}/simulate 记录推演结果（risk/cost/note，状态→已对比，可重跑取最新）；POST {id}/rollback（→已回滚，幂等，生产隔离语义）。
3. **前端 M6 沙盘页**：分支卡片对比（风险条形对比 before→after）、新建分支、模拟（录入推演值）、回滚。

## Scope

- schema + seed + store/sandbox.go + API 三组 + frontend m6/sandbox 页

## 非目标（后续提案）

- Tick 时间推进与因果传播的真实仿真引擎（推演值由人/后续引擎录入）
- 多分支并行世界数据快照与延迟事件队列

## 原型落地情况（UI 原型先行门槛）

M6 Sandbox 页面（分支 A/B/C 对比、假设、风险与代价）已落地并确认；复用其分支文案与对比形态。

## 输入需求

docs/requirement/20261006本体设计器写路径与沙盘.md
