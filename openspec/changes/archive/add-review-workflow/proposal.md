# Proposal: add-review-workflow（评审流转写路径）

## Background

核心读 API（bootstrap-backend-core-api）已上线，原型 M8「评审与发布」的裁决交互仍是 proto.tsx 假弹窗。评审流转是治理闭环的第一个真实写路径：所有本体变更（发布、术语归并、规则补丁）都经它放行。

## Goal

1. **POST /api/v1/reviews**：新建评审，客户端提供 ID 作为幂等键，重复提交返回既有记录（200 + replay 标记），新建返回 201。
2. **PUT /api/v1/reviews/{id}/decision**：裁决（approve/reject/withdraw），状态机校验 + 乐观并发（expectedStatus）+ 幂等重放（终态同向重放返回当前值）；裁决与通知生成在同一事务。
3. 前端 M8「评审与发布」页面对接真实 API：列表、通过/驳回（驳回必填原因）/撤回、新建评审。

## Scope

- schema：reviews 增加 decided_by / decided_at / comment 列（ALTER IF NOT EXISTS 幂等演进），状态新增 已驳回 / 已撤回
- store：纯函数状态机（可单测）+ CreateReview / DecideReview（事务 + FOR UPDATE 行锁）
- api：POST/PUT handler（400/404/409 语义）
- frontend：Reviews 页面 + 路由 + 导航

## 非目标（后续提案）

- 评审与本体版本发布门禁（K 等级）联动
- 多人评审会签、评论流
- 认证授权（by 字段暂由请求体传入）

## 原型落地情况（UI 原型先行门槛）

M8 评审列表、裁决弹窗、SLA 展示已在 prototype/m8 页面（ReleaseHub/Review/ReleaseGate）落地并确认；本提案前端页面复用其信息结构与文案。

## 输入需求

docs/requirement/20261006评审流转写路径.md
