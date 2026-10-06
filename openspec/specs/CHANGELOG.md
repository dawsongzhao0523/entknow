# 能力规格归档日志

归档记录按时间倒序追加：日期、change-id、能力目录。

格式：

```
- 2026-10-06 · add-ontology-registry · ontology-registry
```
- 2026-10-06 · bootstrap-backend-core-api · backend-core-api（核心读 API + demo 数据 + 生产前端骨架，已实现并验证）
- 2026-10-06 · add-review-workflow · review-workflow（评审流转写路径：幂等创建/状态机裁决/乐观并发/事务通知 + 治理演化 前端页面，已实现并 E2E 验证）
- 2026-10-06 · add-knowledge-base · knowledge-base（知识运营 知识库条目 CRUD + 领域树 + 同义词归并 + 前端两页面，已实现并 E2E 验证）
- 2026-10-06 · add-runtime-instances · runtime-instances（本体运行时 实例数据模型 + 实例 360 + 时间线幂等追加 + 行动网关治理执行 + 规则传播记录 + 前端两页面，已实现并 E2E 验证）
- 2026-10-06 · add-ops-admin · ops-admin（系统管理 用户/角色 CRUD：账号唯一 409、角色引用完整 400、内置/被引用角色保护 + 组织与权限页面，已实现并 E2E 验证）
- 2026-10-06 · add-capability-outlet · capability-outlet（智能应用 能力目录 CRUD + 调用统计真实化 base+log + invoke 幂等 + 级联下线 + 前端页面，已实现并 E2E 验证）
- 2026-10-06 · add-semantic-query · semantic-query（推理演绎 统一检索四类实体 + 查询执行 DSL/延迟/幂等历史 + 前端语义查询页，已实现并 E2E 验证）
- 2026-10-06 · add-datasource-ops · datasource-ops（数据资产 数据源注册/编辑、逻辑视图管理、加工流水线任务+运行，已实现并 E2E 验证）
- 2026-10-06 · add-ontology-designer · ontology-designer（本体建模 元素创建/编辑/生命周期流转 + 关系引用计数联动 + 注册中心设计器交互，已实现并 E2E 验证）
- 2026-10-06 · add-sandbox · sandbox（推演沙盘 沙盘分支/模拟 last-wins/回滚生产隔离 + 前端沙盘页，已实现并 E2E 验证）
- 2026-10-06 · complete-sysadmin · sysadmin（系统管理全功能生产化：运营总览聚合/菜单树管理与导航驱动/权限矩阵·行级规则·敏感级继承/依赖服务真实巡检/写操作审计中间件+检索导出/个性化设置全局生效 + 演示用户切换，已实现并浏览器 E2E 验证）
- 2026-10-06 · meaningful-routes · sysadmin（全站路由语义化：九大模块 → assets/knowledge/modeling/runtime/reasoning/sandbox/apps/governance/admin，菜单 id/权限键/审计模块三处标识同步，已实现并浏览器验证）
- 2026-10-06 · purge-module-codes · 全仓（生产代码注释/seed 叙事/原型路由体系与文案/全部文档与历史提案清除模块编号，一律使用语义模块名或英文模块键，已实现并全量回归验证）
- 2026-10-07 · complete-remaining-modules · module-completion（其余模块 12 项功能补齐：数据集市/工作台/绑定同步/隐式收敛/本体详情·成员·发布·门禁/版本导出/演化撤回/推理引擎/CLI 出口/数据源深化，已实现并浏览器 E2E 验证）
