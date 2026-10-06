# Design: complete-remaining-modules

## 新表（schema.sql 追加，IF NOT EXISTS）

```sql
market_items    (id, name, comment, type, source, domain, sensitive, owner, freq, status, subscribers)
market_requests (id, item_id, applicant, reason, status, at)          -- status: 待审批|已通过|已驳回
bindings        (id, object_id, view_id, pk_field, field_map jsonb, sync_mode, status, last_sync, owner)
binding_runs    (id, binding_id, status, detail, at)
onto_candidates (id, source, suggestion, kind, evidence, status, by, at)  -- status: 待裁决|已采纳|已丢弃
entity_alignments (id, left_term, right_term, source_a, source_b, strategy, score, status, by, at)
```

## 关键端点

- GET/POST/PUT/DELETE /market-items；POST /market-items/{id}/request；PUT /market-requests/{id}（approve/reject）
- GET /workbench?user=（聚合：管道状态/我的资产/待办评审/最近运行/查询历史）
- GET/POST/PUT/DELETE /bindings；POST /bindings/{id}/sync
- GET /convergence/candidates；POST /convergence/generate（kb+同义词确定性召回）；POST /{id}/adopt（建对象 DRAFT）；POST /{id}/drop
- GET /alignments；POST /alignments/generate；POST /{id}/merge|drop
- GET /ontologies/{id}/members；PUT /members（角色变更/移除）；POST /members
- POST /ontologies/{id}/publish（校验门禁→objects 版本发布? 简化：onto status→PUBLISHED + versions 落 CURRENT）
- GET /ontologies/{id}/export?format=owl|rdf（确定性文本）
- GET /release-gate?onto=（checks[]：passed/reason）
- POST /versions/{id}/retract（status→RETRACTED + report{受影响对象/绑定/视图}）
- GET /reasoning/consistency?onto=（issues[]）；POST /reasoning/run {ruleId}（求值→firings+risk 更新）

## 派生引擎（确定性，无表）

- 门禁检查：对象元数据（name/en/props 完整）、评审状态（无待评审变更）、沙盘验证（存在已对比分支覆盖变更对象）、绑定覆盖（画布对象有绑定）。
- 一致性检查：边 from/to 对象存在、对象 mapping 缺失、状态机定义但无实例、props 重复。
- OWL 导出：objects→owl:Class（属性→owl:DatatypeProperty），edges→owl:ObjectProperty，输出 Turtle 文本。
- 规则执行：R1（齐套率<80% → 风险+5）、R2（超期未收货 → 风险+8）等按规则 id 确定性求值 instances，写 rule_firings 并更新 risk_score。
- 撤回对账：该版本后受影响对象/绑定/视图计数 + 通知落库。

## 前端

新页：assets/Market、assets/Workbench、runtime/Binding、knowledge/Convergence、
modeling/Detail（本体详情）、modeling/AiModeling、modeling/VersionOps、
reasoning/Engine、governance/Evolution。
扩展：Datasources（tabs 策略/探查/文档源）、Reviews（+发布门禁 tab）、CapabilityOutlet（+CLI tab）。
菜单 seed 增加：assets/market、assets/workbench、knowledge/convergence、modeling/ai-modeling、
modeling/version-ops、runtime/binding、reasoning/engine、governance/evolution。

## 测试策略

集成：每端点组至少一条幸福路径 + 一条保护路径（申请审批流转、绑定同步落史、候选采纳建对象、
门禁评估、一致性检查、规则执行写 firings、撤回对账、导出文本形状）。
单元：无（逻辑均在 SQL/HTTP 层）。前端 tsc+build；浏览器抽检。
