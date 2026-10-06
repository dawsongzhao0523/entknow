# runtime-instances 规格

## Requirements

### Requirement: 实例 360 查询
GET /api/v1/instances SHALL 支持 object（对象 ID）与 kw（实例号/属性包含）过滤；GET /api/v1/instances/{id} SHALL 返回实例全部属性（props 原样）与按时间正序的时间线；未知实例 SHALL 404。

### Requirement: 时间线追加幂等
POST /api/v1/instances/{id}/events {t, e} SHALL 以 (instance_id, t, e) 唯一约束保证幂等：重复追加不产生重复事件；t/e 必填（400）。

### Requirement: 行动执行治理
POST /api/v1/actions SHALL 依次校验：参数完整（400）→ 函数存在且为「行动」类（400）→ 实例存在（404）→ user 为系统真实账号（403）→ 实例风险分 > 80 时必须携带 confirm=true（400）。通过校验后 SHALL 在单事务内写入执行记录（状态「执行成功」）、实例时间线事件与确定性 ID 通知。客户端 id 为幂等键，重复执行返回既有记录。

#### Scenario: 高风险实例未确认
- **WHEN** 对 riskScore=92 的实例执行「冻结订单」且 confirm 缺省
- **THEN** 400，无任何写入（actions/事件/通知均不产生）

#### Scenario: 确认后执行成功
- **WHEN** 同请求携带 confirm=true
- **THEN** 200 执行成功，实例时间线出现行动事件，通知恰好 1 条

### Requirement: 规则传播记录
GET /api/v1/rule-firings SHALL 支持按 rule 过滤；POST /api/v1/rule-firings 以客户端 id 幂等；ruleId 必须对应已存在规则（400）。
