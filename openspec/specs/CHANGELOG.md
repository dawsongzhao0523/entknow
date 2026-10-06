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
- 2026-10-07 · add-org-posts · ops-admin（组织树/岗位字典：树选择与可搜索下拉、维护界面、归集同步、重命名联动与引用保护，已实现并浏览器验证）
- 2026-10-07 · app-shell-polish · 无规格增量（favicon 品牌徽标 + 侧栏 logo 化与折叠，纯视觉变更，已实现并浏览器验证）
- 2026-10-07 · ontology-context · 无规格增量（当前本体会话化：空态占位、选择即持久化、本体管理行高亮与版本历史联动，已实现并浏览器验证）
- 2026-10-07 · split-logs · sysadmin（审计/系统日志分离：system_logs 表与实时发射、双 tab 管理、governance|admin 与 admin 差异授权 403，已实现并浏览器验证权限差异）
- 2026-10-07 · app-shell-polish（续） · 无规格增量（折叠触发器改为标题行内小图标按钮，去默认深色底条，纯视觉微调，已验证）
- 2026-10-07 · home-roles-notify · sysadmin（通知中心：按人定向+广播、每用户已读、评审裁决定向、顶栏铃铛；首页角色化视角（架构治理/评审知识/运营风险），已实现并浏览器验证双视角与定向）
- 2026-10-07 · modeling-parity · ontology-designer（建模模块对齐原型：本体创建三初始化 API、本体管理卡片化+向导、SVG 建模画布（选中面板/流转/拖拽布局）、数据源更新策略 tab，已实现并浏览器验证）
