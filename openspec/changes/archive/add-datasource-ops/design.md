# Design: add-datasource-ops

## 校验规则

- 数据源：name 唯一（先查后插，同 admin.users 账号唯一模式）；mode ∈ NONE/CRON/CDC/EVENT；status ∈ 正常/异常/停用。
- 视图：kind ∈ LOGICAL/MATERIALIZED；status ∈ DRAFT/PUBLISHED/DEPRECATED（下线即 DEPRECATED，不物理删）。
- 流水线任务：type ∈ 采集/清洗/探查/转换/UTOPIA_PUSH；status ∈ 运行中/失败/已停用（PUT 启停流转）。

## 运行语义

POST /api/v1/pipeline-tasks/{id}/run {id(runID), by}：
1. 任务存在（404）、状态为运行中（已停用 409）
2. INSERT pipeline_runs（客户端 id 幂等）
3. UPDATE pipeline_tasks.last_run = now
4. 返回任务与本次 run

## API

- POST /api/v1/datasources · PUT /api/v1/datasources/{id}
- POST /api/v1/views · PUT /api/v1/views/{id}
- GET /api/v1/pipeline-tasks · POST /api/v1/pipeline-tasks · PUT /api/v1/pipeline-tasks/{id} · POST /api/v1/pipeline-tasks/{id}/run · GET /api/v1/pipeline-runs?task=

## 前端

- Datasources 升级：表 + 注册/编辑弹窗（连接/同步策略/敏感级）+ 停用确认。
- LogicalViews：表（上游/被绑定/刷新）+ 新建/编辑 + 下线（DEPRECATED）。
- Pipelines：任务表（类型 Tag/调度/状态/最近运行）+ 注册 + 启停 + 「运行」按钮 + 执行记录抽屉。
