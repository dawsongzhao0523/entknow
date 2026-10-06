# Design: add-ops-admin

## 数据建模

- `roles(id text pk, name, desc, perms text[] 菜单键, built_in bool)`。**users.roles 存角色名**（与现有 seed 一致），删除前按名查引用。
- users 表无需演进（status 已有，正常/停用）。

## 写路径语义

- 角色创建：客户端 id 幂等（ON CONFLICT 回读）。
- 角色删除：built_in → 400（内置角色不可删）；`EXISTS (SELECT 1 FROM users WHERE $name = ANY(roles))` → 409。
- 用户创建：id 幂等；同 account 不同 id → 409（先查后插，事务内唯一依赖 users.account 无唯一索引—— ponytail：直接 SELECT 检查即可，管理操作并发极低）。
- 用户更新：roles 逐个须存在于 roles.name → 400；status 只允许 正常/停用。
- **不引入乐观版本**（有意识决策）：管理端编辑并发极低，last-write-wins；与 reviews/kb 的版本并发（业务高频编辑）区分。

## API

- GET /api/v1/roles · POST /api/v1/roles · PUT /api/v1/roles/{id} · DELETE /api/v1/roles/{id}
- POST /api/v1/users · PUT /api/v1/users/{id}（GET /api/v1/users 已有）

## 前端

- m9/org 页面两个 Tab：用户（表 + 新建/编辑弹窗：账号/姓名/部门/岗位/角色多选/状态）+ 角色（表：权限标签 + 新建/编辑：模块权限 Checkbox.Group + 删除 Popconfirm）。409/400 文案直达。
