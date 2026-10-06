# sandbox 规格

## Requirements

### Requirement: 分支创建幂等
POST /api/v1/sandbox-branches SHALL 以客户端 id 幂等；name/hypothesis 必填（400）；riskBefore 缺省时若 baseInstance 存在 SHALL 自动取其实例风险分。

### Requirement: 模拟
POST /{id}/simulate SHALL 校验 riskAfter ∈ [0,100]（否则 400）；更新 risk_after/cost/note 并置状态「已对比」；可重跑（last-wins）；对「已回滚」分支模拟 SHALL 409（世界已销毁）；未知分支 404。

### Requirement: 回滚与生产隔离
POST /{id}/rollback SHALL 将状态置「已回滚」，不产生任何对生产数据（instances/actions 等）的写入；重复回滚幂等返回现状。

### Requirement: 分支列表
GET /api/v1/sandbox-branches SHALL 返回全部分支（含推演中/已对比/已回滚）。
