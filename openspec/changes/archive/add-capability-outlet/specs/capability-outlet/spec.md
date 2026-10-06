# capability-outlet 规格

## Requirements

### Requirement: 调用统计真实化
GET /api/v1/capabilities 的调用量 SHALL 等于 base_calls 与该能力调用日志条数之和；`calls` 字段以千分位字符串返回（兼容原型展示），`callsTotal`/`realCalls` 返回数值。

### Requirement: 调用记录幂等
POST /api/v1/capabilities/{id}/invoke SHALL 以客户端 id 幂等（重复调用不重复计数）；status 仅允许 ok/error（400）；未知能力 404；成功返回更新后的能力。

### Requirement: 能力目录 CRUD
POST SHALL 幂等注册；PUT 编辑 desc/proto/owner（未知 404）；DELETE SHALL 在单事务内删除能力及其全部调用日志。

#### Scenario: 删除级联
- **WHEN** DELETE 一个已有 N 条调用日志的能力
- **THEN** 204，且其调用日志不再可查（GET calls 404）

### Requirement: 最近调用查询
GET /api/v1/capabilities/{id}/calls SHALL 按时间倒序返回最近调用（默认 limit 20）；未知能力 404。
