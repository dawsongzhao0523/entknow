# review-workflow 规格

## Requirements

### Requirement: 评审创建幂等
POST /api/v1/reviews SHALL 要求客户端提供 `id` 作为幂等键（缺失返回 400）；相同 id 重复提交 SHALL 返回既有记录且响应头 `X-Idempotent-Replay: true`，不产生重复行。

#### Scenario: 首次创建
- **WHEN** POST {id:"RV-1", title, type, from}
- **THEN** 201，GET /api/v1/reviews 出现该记录

#### Scenario: 幂等重放
- **WHEN** 相同 body 再次 POST
- **THEN** 200 + X-Idempotent-Replay: true，列表数量不变

### Requirement: 裁决状态机
PUT /api/v1/reviews/{id}/decision SHALL 仅接受合法迁移：待评审/评审中 --approve--> 已通过，--reject--> 已驳回（comment 必填），--withdraw--> 已撤回；终态再迁移 SHALL 返回 409。

#### Scenario: 通过评审
- **WHEN** PUT decision {action:"approve", by:"王五"} 作用于「待评审」评审
- **THEN** 200，status=已通过，decidedBy=王五

#### Scenario: 终态再裁决同向（幂等重放）
- **WHEN** 对已通过评审再次 approve
- **THEN** 200 返回当前记录，字段不变，不产生第二条通知

#### Scenario: 终态反向裁决
- **WHEN** 对已通过评审 reject
- **THEN** 409

### Requirement: 乐观并发
请求携带 expectedStatus 且与当前状态不一致时 SHALL 返回 409 且不产生任何写入。

### Requirement: 裁决通知事务性
裁决成功 SHALL 在同一事务内生成确定性 ID 的站内通知（`n-rv-{id}-{action}`，cat=治理任务）；事务失败时通知不得存在。

### Requirement: 未知评审
对不存在的评审裁决 SHALL 返回 404。
