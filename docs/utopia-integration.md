# entKnow × Utopia 集成架构设计

> 状态：已评审（原型阶段）· 2026-10-04
> 范围：后端服务实现时的集成方案基线。前端原型已按本文档落地（M3 智能建模 →「语料提取」/「Utopia 集成」）。

## 1. 定位与分工

| | Utopia | entKnow |
|---|---|---|
| 角色 | 语料提取引擎 + 双时态事实账本 | 本体治理 + 运行时 + 行动平台 |
| 核心能力 | 文档解析/分块/向量化、LLM 抽取、实体消歧、类型解析、本体生长提案、公理一致性检查、双时态（世界时间/记录时间） | 本体建模与评审发布、注册中心、行动类、沙盘推演、指标、能力出口 |
| 不做 | 本体生命周期治理、行动与回写、评审门禁 | 自建语料提取引擎（**明确不重复造**） |

集成原则：**服务级对接，不碰 Utopia 的 Rust 内部**。只使用其官方三个接口边界（REST / MCP / RDF export），版本升级风险隔离在适配层内。

## 2. 接口边界（Utopia 官方提供）

| 边界 | 端点 | 认证 | 用途 |
|---|---|---|---|
| REST API | `/api/v1/kbs/{kb_id}/**`(documents / sources / graph / ontology / review / rules / search / jobs / export) | PAT `utp_pat_…`(read/write scope) | 管理面与读写主通道 |
| Ingest 契约 | API source 推送（文档，稳定 ID 幂等）· Statements source 推送（结构化事实，不过 LLM) | per-source Bearer token | 写入 |
| MCP | `POST /api/v1/kbs/{kb_id}/mcp`(JSON-RPC 2.0,2025-06-18) | PAT | Agent 工具调用 |
| RDF export | `GET /api/v1/kbs/{kb_id}/export?format=turtle\|jsonld` | PAT | 机器可读读契约（官方兼容边界） |

无官方 SDK；Rust crate 为 workspace 内部组件，不作为 lib 依赖。

## 3. 集成链路（四条流）

### ① 文档推送:entKnow → Utopia（写）

- **来源**:M2 知识库条目（SOP/术语/规则文档）、M1 文档类数据资产。
- **机制**:Utopia 侧创建 **API source**;entKnow 增量推送，item 携带稳定 ID(`entknow:{kb_entry_id}`)。同一 ID 重复推送 = 原地更新：旧内容保留为版本，自动重索引 + 触发图重提取。
- **删除**:push 体带 `deleted: true`。
- **entKnow 侧落库**:`utopia_push_state(entry_id, utopia_document_id, last_version, last_push_at, status)`,M1 加工流水线增加一个 `UTOPIA_PUSH` 类型节点（复用现有任务调度）。

### ② 观测推送:entKnow → Utopia（写，结构化）

- **来源**:M4 运行时事件（行动执行结果、规则触发）、M1 系统观测。
- **机制**:**Statements source**，直接推送抽取契约结构 `{thing, relation, value, when}`,**不经过 LLM**；函数型属性在新观测到达时自动关闭旧值。
- **用途**:Utopia 侧形成系统观测账本，供时序问答（"08:05 它在哪"）。

### ③ 提案与成果回流:Utopia → entKnow（读）

- **消费方**:M3「语料提取」页（本体提案 / 实体消歧 / 签名检查 / 丢弃记录 / 一致性检查五个队列）、M3 注册中心（采纳后生成 DRAFT 元素）。
- **机制**:REST 定时拉取（默认 15 min，可手动触发）:
  - `GET …/review/**` → 提案/消歧/违反队列；
  - `GET …/export?format=jsonld`（全量快照，初次回填或校对用）;
  - 采纳/拒绝/合并等裁决动作**回写** Utopia(review 端点），保持单一事实源——entKnow 不缓存裁决状态，只缓存展示快照。
- **映射**:Utopia 提案(新类/新关系/新属性) → entKnow 注册中心草稿（DRAFT，走既有 IN_REVIEW → PUBLISHED 生命周期）;Utopia 实体/事实 → 不进注册中心，仅作为语料提取页的展示与取证。

### ④ Agent 工具源:entKnow ↔ Utopia MCP（调用）

- **M5 智能问答 / M7 能力出口** 将 Utopia KB 挂载为 MCP 工具源：`search_chunks / find_entities / entity_facts / neighbors / paths_between / timeline / changes`。
- **双时间轴增强**:`at`(世界时间)+ `as_of`(记录时间）透传到 entKnow 问答层，支撑"2024 年 3 月适用的条款"与"当时库里记录的内容"两类问题。
- **反向写入**:Agent 经 `remember` 工具的写入**待人审**(Utopia 侧队列）,entKnow 在 M8 评审台露出入口，治理闭环一致。

## 4. 数据模型映射

| Utopia | entKnow | 说明 |
|---|---|---|
| knowledge base | 集成连接实例（1:1 绑定） | 连接配置：endpoint / PAT / kb_id |
| document(API source item) | M2 知识条目（稳定 ID 映射） | 推送侧幂等键 |
| statement | M4 运行时事件 | 观测账本 |
| ontology proposal | 注册中心草稿（DRAFT) | 采纳后进入既有评审发布流 |
| review pair（消歧） | 语料提取页裁决队列（不持久化状态，回写 Utopia) | |
| axiom_violation / ontology_defect | 一致性检查队列（处置回写） | 三选一：撤回事实/放宽公理/接受 |
| extraction_drops | 丢弃记录表（只读展示） | |
| MCP tools | M7 能力出口的工具源注册 | |

## 5. 治理一致性

- Utopia `remember` 待人审 ↔ entKnow M8 评审门禁：写路径一律人审，无绕过。
- Utopia `as_of` 记录时间 ↔ entKnow M8 版本演化/撤回对账：决策复盘可取"当时库里知道什么"。
- 双端裁决集中：凡涉及图内容变更的裁决，以 Utopia review 为准（账本侧）；凡涉及本体发布的评审，以 entKnow M8 为准（治理侧）。

## 6. 部署与配置

- Utopia 独立部署（官方 docker-compose）,entKnow 通过配置项接入：
  `utopia.endpoint` / `utopia.pat` / `utopia.kb_id` / `utopia.pull_interval`(默认 15m)。
- 适配层（entKnow 新增 `utopia-adapter` 模块）封装全部 Utopia HTTP/MCP 调用，对内暴露领域接口（push_document / push_statement / fetch_review_queues / adjudicate / register_mcp_source),**上层不直接感知 Utopia API 形状**，版本升级只改适配层。
- 故障策略：推送失败入重试队列（指数退避，上限 24h)；拉取失败保留上次快照并告警（M9 监控）。

## 7. 实施阶段

| 阶段 | 内容 | 出口标准 |
|---|---|---|
| P1 | 连接配置 + ① 文档推送 + ③ 提案回流（只读拉取） | 语料提取页展示真实队列 |
| P2 | 裁决回写 + 提案→注册中心草稿落库 | 采纳的提案出现在本体管理 |
| P3 | ④ MCP 工具源挂载 M5/M7 | 智能问答可调 entity_facts(at/as_of) |
| P4 | ② Statements 观测推送 + 治理联动（remember → M8) | 运行时事件可在 Utopia 时序问答 |
