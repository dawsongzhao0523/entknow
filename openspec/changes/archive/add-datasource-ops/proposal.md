# Proposal: add-datasource-ops（M1 数据资产运营写路径）

## Background

M1 目前只有只读数据源列表。原型的数据源注册/同步策略、逻辑视图管理、加工流水线均为假交互，需要真实写路径，这是「对象绑定视图而非裸表」联邦层语义的运营底座。

## Goal

1. **数据源**：POST 幂等注册（name 唯一 409）/ PUT 编辑（host/mode/sensitive/owner/status）。
2. **逻辑视图**：POST 幂等 / PUT 编辑与下线（DEPRECATED）。
3. **加工流水线**：pipeline_tasks（注册/启停）+ pipeline_runs（手动运行：幂等执行记录 + last_run 更新）。
4. 前端：数据源中心页升级（注册/编辑/停用）+ 逻辑视图页 + 数据加工页（任务表 + 运行 + 执行记录）。

## Scope

- schema：pipeline_tasks / pipeline_runs + seed（对照原型流水线节点）
- API：datasources POST/PUT；views POST/PUT；pipeline-tasks GET/POST/PUT + run + runs 查询
- frontend：m1/datasources 升级、m1/views、m1/pipelines 三页

## 非目标（后续提案）

- 真实连接连通性测试（driver 探活）、CDC 实际接入
- 视图 SQL 定义与联邦查询执行（联邦引擎另议）
- 加工任务的真实编排调度（Temporal 接入后替换手动运行）

## 原型落地情况（UI 原型先行门槛）

M1 DatasourceList/SyncPolicy/LogicalView/Pipeline 页面已落地并确认；复用其表格列、同步策略文案与流水线节点语义。

## 输入需求

docs/requirement/20261006数据资产运营写路径.md
