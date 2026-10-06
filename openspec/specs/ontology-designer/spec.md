# ontology-designer 规格

## Requirements

### Requirement: 元素创建幂等与校验
POST objects/edges/functions SHALL 以客户端 id 幂等；kind ∈ {静态事实,单体动态,立方动态}、cat ∈ {指标,派生,行动,权限}（否则 400）；新建元素 status 强制 DRAFT。

### Requirement: 关系引用联动
POST edges SHALL 校验两端对象存在且 PUBLISHED（否则 400）；成功时 SHALL 在同一事务内创建关系并使两端对象 ref_count 各 +1。

#### Scenario: 引用草稿对象
- **WHEN** 创建 from 指向 DRAFT 对象的关系
- **THEN** 400，两端 ref_count 不变

### Requirement: 生命周期流转
POST /{type}/{id}/transition SHALL 按 submit（DRAFT→IN_REVIEW）/ publish（DRAFT|IN_REVIEW→PUBLISHED）/ deprecate（PUBLISHED→DEPRECATED）迁移；同向终态重放幂等返回现状；非法迁移 409；未知元素 404。

### Requirement: 元素编辑
PUT SHALL 全量编辑元素业务字段（不改变 status/version 语义由流转负责）；未知 404。
