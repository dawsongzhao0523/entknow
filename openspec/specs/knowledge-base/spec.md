# knowledge-base 规格

## Requirements

### Requirement: 知识条目创建幂等
POST /api/v1/kb/entries SHALL 以客户端 id 为幂等键；重复提交返回既有记录（X-Idempotent-Replay: true），不产生重复行；id/title/domain 必填（缺失 400）。

### Requirement: 条目编辑乐观并发
PUT /api/v1/kb/entries/{id} SHALL 要求 expectedVersion；与当前 version 不一致返回 409 且不落库；成功时 version 自增并更新 updated_by/updated_at。status 变更（待评审→已评审=发布）同样受版本保护。

#### Scenario: 版本冲突
- **WHEN** 两个并发编辑基于同一 version 提交
- **THEN** 后提交者 409，先提交者成功且 version+1

### Requirement: 条目软删除
DELETE /api/v1/kb/entries/{id} SHALL 将状态置为「已失效」（记录保留可追溯）；对已失效条目重复删除 SHALL 幂等返回现状。

### Requirement: 领域树与过滤
GET /api/v1/kb/domains SHALL 返回领域层级及各自条目计数（不含已失效）；GET /api/v1/kb/entries SHALL 支持 domain 与 kw（标题/术语包含）过滤。

### Requirement: 同义词归并
POST /api/v1/synonyms/{id}/merge SHALL 校验 standard 属于该组词条（否则 400）；归并后 status=已归并并记录 by/at；同 standard 重复归并幂等返回现状；已归并组以不同 standard 再次归并 SHALL 409。

### Requirement: 未知条目
对不存在条目的 GET/PUT/DELETE 与不存在同义词组的归并 SHALL 返回 404。
