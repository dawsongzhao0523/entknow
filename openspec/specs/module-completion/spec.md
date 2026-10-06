# module-completion 规格

## Requirements

### Requirement: 数据集市
market_items SHALL 支持幂等登记/编辑/删除（存在待审批申请 409）；上架资产可提交权限申请（market_requests，同人同资产重复待审批 409，非上架 400）；审批通过 SHALL 使 subscribers 自增且重放幂等。

### Requirement: 数据绑定与同步
bindings SHALL 校验对象/视图存在（400）且同对象+视图唯一（409）；手动同步 SHALL 依据对象实例数生成确定性结果并落 binding_runs、更新 last_sync。

### Requirement: 隐式收敛与跨源对齐
候选生成 SHALL 为确定性召回（同义词标准词未建模 → 对象候选，按来源幂等去重）；采纳对象类候选 SHALL 创建 DRAFT 对象且重放幂等（已丢弃 409）；对齐生成与裁决（merge/drop）均幂等。

### Requirement: 本体成员与发布
成员角色 SHALL 限 所有者/建模者/评审者/查看者（用户须存在 400）；唯一所有者不可移除（409）。发布 SHALL 先过发布门禁（元数据完整/无待评审变更/沙盘验证/绑定覆盖），未过 409 并附检查项；通过则本体转 PUBLISHED 并落版本快照。

### Requirement: 版本导出与撤回
OWL（Turtle）/RDF（NTriples）导出 SHALL 由对象/关系/属性实时确定性生成；仅 PUBLISHED 版本可撤回（RETRACTED，重复 409），撤回 SHALL 生成受影响对象/绑定/视图对账并落通知。

### Requirement: 推理引擎
规则执行 SHALL 为确定性求值（R1 齐套率、R2 超期未收货、其余 风险分阈值），触发写 rule_firings 并重算实例风险分（覆盖式重跑）；一致性检查 SHALL 派生边引用/映射缺失/状态机空转/绑定失效问题清单。

### Requirement: 数据工作台
/workbench SHALL 聚合管道状态、我的资产、治理待办（评审+审批+同义词）、最近绑定同步/管道运行/语义查询与数据源告警，全部由真实库表派生。
