# ops-admin 规格

## Requirements

### Requirement: 角色 CRUD
POST /api/v1/roles SHALL 以客户端 id 幂等（重放返回既有 + replay 头）；PUT /api/v1/roles/{id} 更新 name/desc/perms（未知 404）；DELETE SHALL 拒绝内置角色（400）与被用户引用的角色（409），正常删除成功。

#### Scenario: 删除被引用角色
- **WHEN** DELETE 被 u1（本体管理员）引用的角色
- **THEN** 409，角色仍存在

#### Scenario: 删除未被引用角色
- **WHEN** DELETE 新建且无人引用的角色
- **THEN** 200，列表不再包含

### Requirement: 用户创建与更新
POST /api/v1/users SHALL 以 id 幂等；相同 account 不同 id SHALL 409。PUT /api/v1/users/{id} SHALL 校验 roles 均已存在（否则 400）且 status ∈ {正常, 停用}（否则 400）；未知用户 404。

### Requirement: 用户角色引用完整性
用户更新引用不存在的角色名 SHALL 被拒绝且不落库；角色删除后其名不可再被用户引用。

## ADDED Requirements（add-org-posts）

### Requirement: 组织架构字典
org_units SHALL 以树形返回（节点含全路径）；新增幂等且父组织必须存在（400）；重命名 SHALL 联动更新引用用户的部门全路径；删除 SHALL 拒绝有子组织或被用户引用的节点（409）；「同步组织架构」SHALL 从现有用户部门字符串确定性归集合并（幂等）。

### Requirement: 岗位字典
posts SHALL 支持 CRUD（同名不同 id 409）；重命名 SHALL 联动用户岗位；被用户引用的岗位不可删除（409）；「同步岗位」SHALL 从现有用户岗位确定性归集合并（幂等）。用户表单中组织 SHALL 为可搜索树选择（写入全路径）、岗位 SHALL 为可搜索下拉。
