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
