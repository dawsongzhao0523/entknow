# datasource-ops 规格

## Requirements

### Requirement: 数据源注册与编辑
POST /api/v1/datasources SHALL 幂等（id）；name 唯一（同名异 ID 409）；mode ∈ {NONE,CRON,CDC,EVENT}、status ∈ {正常,异常,停用}（否则 400）。PUT 编辑连接/策略/负责人/状态；未知 404。

### Requirement: 逻辑视图管理
POST /api/v1/views SHALL 幂等；kind ∈ {LOGICAL,MATERIALIZED}；PUT SHALL 支持 status 变更（DRAFT/PUBLISHED/DEPRECATED），下线即 DEPRECATED（记录保留）；非法值 400。

### Requirement: 加工任务与运行
POST /api/v1/pipeline-tasks SHALL 幂等；type ∈ {采集,清洗,探查,转换,UTOPIA_PUSH}。PUT 启停（运行中↔已停用）。POST /{id}/run SHALL：任务存在（404）、未停用（409），执行记录以客户端 id 幂等，成功后任务 last_run 更新。GET /api/v1/pipeline-runs?task= 返回执行记录倒序。

#### Scenario: 停用任务不可运行
- **WHEN** 对「已停用」任务 run
- **THEN** 409，不产生执行记录

#### Scenario: 运行幂等
- **WHEN** 相同 run id 重复运行
- **THEN** 执行记录仅 1 条，last_run 不再变化
