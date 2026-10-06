# sysadmin 规格

## ADDED Requirements

### Requirement: 系统运营总览聚合
`GET /api/v1/admin/stats` SHALL 返回由真实库表聚合的运营快照：用户/角色/本体（含状态分布）/对象/关系/实例/数据源（含状态分布）/知识条目/能力出口与真实调用数/语义查询数/评审（含状态分布）/管道任务（含状态分布）/今日审计事件数/依赖服务最近巡检状态/最近 5 条 WARN 或 ERROR 审计事件。所有计数 SHALL 与库内数据一致，不得使用硬编码展示值。

#### Scenario: 总览计数与 demo 库一致
- **WHEN** demo 库装载后 GET /api/v1/admin/stats
- **THEN** 200，users=4、roles=6、objects=11、datasources.total=6 且 normal=5

### Requirement: 菜单树管理与导航驱动
`GET /api/v1/menus` SHALL 返回两级菜单树（父节点携带 children，同级按 sort 升序）；带 `user` 参数时 SHALL 仅返回该用户角色 perms 并集内且 visible 的一级模块及其子菜单。`POST /api/v1/menus` SHALL 以客户端 id 幂等；`PUT /api/v1/menus/{id}` SHALL 可更新 name/route/icon/sort/visible（未知 404）；`DELETE /api/v1/menus/{id}` SHALL 拒绝仍有子菜单的节点（409）。生产前端导航 SHALL 由该端点驱动，visible=false 的菜单从导航移除。菜单一级 id SHALL 使用语义化模块键（assets/knowledge/modeling/runtime/reasoning/sandbox/apps/governance/admin），同时充当 URL 前缀与角色权限键。

#### Scenario: 按角色权限过滤导航
- **WHEN** GET /api/v1/menus?user=wangwu（角色=评审员，perms=knowledge,modeling,governance）
- **THEN** 仅返回 知识运营/本体建模/治理演化 三个一级模块

#### Scenario: 删除有子菜单的一级菜单
- **WHEN** DELETE /api/v1/menus/assets（存在 assets/* 子菜单）
- **THEN** 409，菜单树不变

### Requirement: 行级数据权限规则
`POST /api/v1/data-rules` SHALL 以客户端 id 幂等，且校验绑定角色存在（否则 400）；`PUT /api/v1/data-rules/{id}` SHALL 更新（未知 404，角色校验同上）；`DELETE` SHALL 删除（未知 404）。

#### Scenario: 绑定不存在的角色
- **WHEN** POST data-rules 且 role=不存在的角色
- **THEN** 400，规则不落库

### Requirement: 敏感级继承推导
`GET /api/v1/sensitivity` SHALL 对每个逻辑视图解析其 upstream（形如 `表(数据源)`），取上游数据源 sensitive 的最高级作为继承级，并与视图存量标注对比输出；结果 SHALL 由库内 views/datasources 实时推导。

#### Scenario: 上游最高级继承
- **WHEN** 视图 upstream 含 srm(L3) 与 scm_prod(L2)
- **THEN** 该视图继承敏感级为 L3

### Requirement: 依赖服务巡检
`POST /api/v1/dep-services/inspect` SHALL 对每个已登记服务执行真实健康检查（postgres 自库探活 / redis PING / http GET，超时 2s），按结果（失败=异常、延迟>800ms=延迟、否则正常）更新服务状态与延迟、记录 checked_at，并追加 dep_checks 历史；`GET /api/v1/dep-services/uptime` SHALL 返回近 7 日按日可用率聚合。

#### Scenario: 手动巡检刷新状态
- **WHEN** POST /api/v1/dep-services/inspect（依赖服务可达）
- **THEN** 200，各服务 checked_at 非空且新增 dep_checks 记录

### Requirement: 写操作审计
所有 `/api/v1` 的 POST/PUT/DELETE 请求 SHALL 自动写入 audit_logs（时间、模块、级别、操作人、内容、TraceID）；级别映射：2xx=INFO、4xx=WARN、5xx=ERROR；操作人取请求体 user/by/from 首个非空值，缺省「系统」。审计模块标签 SHALL 使用语义化模块键（未登记资源归 admin）。审计写入失败 SHALL NOT 阻断业务请求。

#### Scenario: 冲突请求记录 WARN
- **WHEN** POST /api/v1/roles 触发账号/幂等外冲突返回 409
- **THEN** audit_logs 新增一条 module=admin、level=WARN 的记录

### Requirement: 审计日志检索与导出
`GET /api/v1/audit-logs` SHALL 支持 module/level/kw（内容或 TraceID包含）/since（起始时间）过滤与 limit/offset 分页，按时间倒序返回 `{total,items}`；`GET /api/v1/audit-logs/export` SHALL 以相同过滤条件返回 CSV 附件（UTF-8 BOM）。

#### Scenario: 级别过滤
- **WHEN** GET /api/v1/audit-logs?level=ERROR
- **THEN** 返回条目 level 均为 ERROR 且 total 为全库 ERROR 数

### Requirement: 个性化设置持久化与生效
`GET /api/v1/settings?user=` SHALL 返回该账号设置（无记录返回空对象）；`PUT /api/v1/settings` SHALL 按账号 upsert（account 必填）。生产前端 SHALL 使主题（浅/深/跟随系统）、密度、等宽字体开关全局生效，默认落地页、默认本体、通知类别过滤按设置真实生效。

#### Scenario: 设置保存后读取一致
- **WHEN** PUT /api/v1/settings {account:"zhangsan", settings:{theme:"dark"}} 后 GET 同账号
- **THEN** settings.theme=dark

## ADDED Requirements（split-logs）

### Requirement: 系统日志（可观测性）
system_logs SHALL 记录运行时事件（时间/级别/组件/内容/TraceID）；依赖巡检、绑定同步、规则执行 SHALL 自动静默写系统日志（失败不阻塞业务）；SHALL 支持 level/component/kw/since 过滤与分页、CSV 导出。总览页「最近告警」SHALL 由系统日志 WARN/ERROR 派生。

### Requirement: 日志权限分离
审计日志（含导出）SHALL 仅对角色权限含 governance 或 admin 的用户开放（403 拒绝其余）；系统日志（含导出）SHALL 仅对角色权限含 admin 的用户开放；前端 SHALL 隐藏无权限的日志 tab。审计日志 SHALL 仅含用户写操作留痕，不混入运行时事件。
