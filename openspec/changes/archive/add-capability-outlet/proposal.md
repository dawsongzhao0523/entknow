# Proposal: add-capability-outlet（智能应用 能力出口）

## Background

本体运行时 行动网关已能治理化执行行动；智能应用 是对外出口：把本体能力（对象切片、语义查询、行动执行、智能体）以 MCP/REST/CLI 统一封装给消费方。原型的调用量是静态假数字，需要真实化。

## Goal

1. **目录 CRUD**：POST 幂等注册、PUT 编辑、DELETE（级联清理调用日志，单事务）。
2. **调用统计真实化**：`capability_calls` 日志表 + `base_calls` 基数（承接 seed），总量 = 基数 + 日志数；`POST /invoke` 记录调用（幂等，校验 status ∈ ok/error）；`GET /calls` 最近调用。
3. 前端 智能应用 能力出口页：目录（真实计数）+ 注册/编辑 + 调用记录弹窗 + 最近调用列表。

## Scope

- schema：capability_calls 表；capabilities 幂等演进 base_calls 列；seed 承接基数
- API：capabilities GET/POST/PUT/DELETE + {id}/invoke + {id}/calls
- frontend：apps/capabilities 页面

## 非目标（后续提案）

- 真实执行接线（MCP server / REST 网关代理到 本体运行时 行动与 推理演绎 查询）——本提案只落调用记录与统计
- 计费、限流、鉴权令牌（消费方凭据管理）

## 原型落地情况（UI 原型先行门槛）

智能应用 CapabilityHub/CapabilityCatalog 页面已落地并确认；复用其能力列表（get_object/semantic_query/run_action/supplier_risk_agent）与协议标签。

## 输入需求

docs/requirement/20261006能力出口与调用统计.md
