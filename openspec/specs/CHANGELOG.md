# 能力规格归档日志

归档记录按时间倒序追加：日期、change-id、能力目录。

格式：

```
- 2026-10-06 · add-ontology-registry · ontology-registry
```
- 2026-10-06 · bootstrap-backend-core-api · backend-core-api（核心读 API + demo 数据 + 生产前端骨架，已实现并验证）
- 2026-10-06 · add-review-workflow · review-workflow（评审流转写路径：幂等创建/状态机裁决/乐观并发/事务通知 + M8 前端页面，已实现并 E2E 验证）
- 2026-10-06 · add-knowledge-base · knowledge-base（M2 知识库条目 CRUD + 领域树 + 同义词归并 + 前端两页面，已实现并 E2E 验证）
- 2026-10-06 · add-runtime-instances · runtime-instances（M4 实例数据模型 + 实例 360 + 时间线幂等追加 + 行动网关治理执行 + 规则传播记录 + 前端两页面，已实现并 E2E 验证）
- 2026-10-06 · add-ops-admin · ops-admin（M9 用户/角色 CRUD：账号唯一 409、角色引用完整 400、内置/被引用角色保护 + 组织与权限页面，已实现并 E2E 验证）
- 2026-10-06 · add-capability-outlet · capability-outlet（M7 能力目录 CRUD + 调用统计真实化 base+log + invoke 幂等 + 级联下线 + 前端页面，已实现并 E2E 验证）
- 2026-10-06 · add-semantic-query · semantic-query（M5 统一检索四类实体 + 查询执行 DSL/延迟/幂等历史 + 前端语义查询页，已实现并 E2E 验证）
- 2026-10-06 · add-datasource-ops · datasource-ops（M1 数据源注册/编辑、逻辑视图管理、加工流水线任务+运行，已实现并 E2E 验证）
- 2026-10-06 · add-ontology-designer · ontology-designer（M3 元素创建/编辑/生命周期流转 + 关系引用计数联动 + 注册中心设计器交互，已实现并 E2E 验证）
- 2026-10-06 · add-sandbox · sandbox（M6 沙盘分支/模拟 last-wins/回滚生产隔离 + 前端沙盘页，已实现并 E2E 验证）
- 2026-10-06 · complete-sysadmin · sysadmin（M9 系统管理全功能生产化：运营总览聚合/菜单树管理与导航驱动/权限矩阵·行级规则·敏感级继承/依赖服务真实巡检/写操作审计中间件+检索导出/个性化设置全局生效 + 演示用户切换，已实现并浏览器 E2E 验证）
