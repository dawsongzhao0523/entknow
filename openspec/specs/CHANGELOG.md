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
