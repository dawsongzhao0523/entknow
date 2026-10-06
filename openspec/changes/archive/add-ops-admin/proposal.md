# Proposal: add-ops-admin（系统管理 组织与权限）

## Background

知识运营/本体运行时/治理演化 写路径已上线。系统管理是运营底座：用户与角色的管理直接决定前述写路径的鉴权语义（如 本体运行时 行动网关的「系统真实账号」校验）。

## Goal

1. **角色 CRUD**：`roles` 表（id/name/desc/perms text[]/built_in）；POST 幂等、PUT 编辑、DELETE（内置 400、被用户引用 409）。
2. **用户 CRUD**：POST 幂等 + 账号唯一（409）；PUT 编辑（角色必须存在 → 400；状态切换 正常/停用）。
3. 前端 系统管理「组织与权限」页：用户表（新建/编辑/停用）+ 角色表（新建/编辑/删除，模块权限勾选）。

## Scope

- schema：roles 表 + seed 六角色（含模块权限集）
- API：GET/POST/PUT/DELETE roles；POST/PUT users（GET 已有）
- frontend：admin/org 页面（用户/角色两 Tab）

## 非目标（后续提案）

- 本体级角色（所有者/建模者/评审者/查看者）与 ROLE_MATRIX 的管理化（现为规约常量）
- 行级权限（RLS 规则）管理、菜单管理、审计日志查询页
- 登录认证与会话（users 仍按演示用户传参）

## 原型落地情况（UI 原型先行门槛）

系统管理 Users/Roles/Permissions 页面已在 prototype 落地并确认；本提案复用其表格列与角色语义（本体管理员/数据开发/评审员/系统集成/智能体开发）。

## 输入需求

docs/requirement/20261006组织与权限管理.md
