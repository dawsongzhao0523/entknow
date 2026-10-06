# 能力规格归档日志

归档记录按时间倒序追加：日期、change-id、能力目录。

格式：

```
- 2026-10-06 · add-ontology-registry · ontology-registry
```
- 2026-10-06 · bootstrap-backend-core-api · backend-core-api（核心读 API + demo 数据 + 生产前端骨架，已实现并验证）
- 2026-10-06 · add-review-workflow · review-workflow（评审流转写路径：幂等创建/状态机裁决/乐观并发/事务通知 + M8 前端页面，已实现并 E2E 验证）
- 2026-10-06 · add-knowledge-base · knowledge-base（M2 知识库条目 CRUD + 领域树 + 同义词归并 + 前端两页面，已实现并 E2E 验证）
