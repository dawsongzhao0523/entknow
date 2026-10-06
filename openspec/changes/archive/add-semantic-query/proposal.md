# Proposal: add-semantic-query（推理演绎 语义查询）

## Background

推理演绎的查阅式入口。原型的语义查询（自然语言 → DSL → 执行）依赖 LLM，本提案先落地其**确定性内核**：统一关键词检索（对象/知识/实例/同义词四类）+ 查询执行历史，LLM 语义映射后续经 Utopia/MCP 接入替换。

## Goal

1. **GET /api/v1/search?q=**：无状态统一检索，分类返回（objects/kb/instances/synonyms，各限 20）。
2. **POST /api/v1/queries**：执行查询——检索 + 命中驱动的确定性 DSL 模板 + 延迟统计 + 幂等历史记录；**GET /api/v1/queries**：历史（by 过滤）。
3. 前端 推理演绎 语义查询页：查询输入、结果分区、DSL 代码块、历史表（一键重问）。

## Scope

- schema：query_history 表 + seed 两条历史（对照原型示例）
- API：search / queries POST+GET
- frontend：reasoning/query 页面

## 非目标（后续提案）

- LLM 自然语言 → DSL 的真实映射（经 Utopia MCP / LLM 网关接入后替换模板）
- 规则推理器与 OWL 推理（原型另两个 Tab，属推理式能力）
- 查询结果聚合计算（指标求值走 本体运行时 函数）

## 原型落地情况（UI 原型先行门槛）

推理演绎 SemanticQuery 页面已落地并确认；复用其查询输入、DSL 展示、命中列表与历史交互形态。

## 输入需求

docs/requirement/20261006语义查询与检索.md
