# sysadmin 规格（meaningful-routes 增量）

## MODIFIED Requirements

### Requirement: 菜单树管理与导航驱动
`GET /api/v1/menus` SHALL 返回两级菜单树（父节点携带 children，同级按 sort 升序）；带 `user` 参数时 SHALL 仅返回该用户角色 perms 并集内且 visible 的一级模块及其子菜单。`POST /api/v1/menus` SHALL 以客户端 id 幂等；`PUT /api/v1/menus/{id}` SHALL 可更新 name/route/icon/sort/visible（未知 404）；`DELETE /api/v1/menus/{id}` SHALL 拒绝仍有子菜单的节点（409）。生产前端导航 SHALL 由该端点驱动，visible=false 的菜单从导航移除。

菜单一级 id SHALL 使用语义化模块键（assets/knowledge/modeling/runtime/reasoning/sandbox/apps/governance/admin），同时充当 URL 前缀与角色权限键；子菜单路由 SHALL 形如 `<模块键>/<功能>`。

#### Scenario: 按角色权限过滤导航
- **WHEN** GET /api/v1/menus?user=wangwu（角色=评审员，perms=knowledge,modeling,governance）
- **THEN** 仅返回 知识运营/本体建模/治理演化 三个一级模块

#### Scenario: 删除有子菜单的一级菜单
- **WHEN** DELETE /api/v1/menus/assets（存在 assets/* 子菜单）
- **THEN** 409，菜单树不变

### Requirement: 写操作审计
所有 `/api/v1` 的 POST/PUT/DELETE 请求 SHALL 自动写入 audit_logs（时间、模块、级别、操作人、内容、TraceID）；级别映射：2xx=INFO、4xx=WARN、5xx=ERROR；操作人取请求体 user/by/from 首个非空值，缺省「系统」。审计写入失败 SHALL NOT 阻断业务请求。

审计模块标签 SHALL 使用语义化模块键（assets/knowledge/modeling/runtime/reasoning/sandbox/apps/governance/admin，未登记资源归 admin）。

#### Scenario: 冲突请求记录 WARN
- **WHEN** POST /api/v1/roles 触发冲突返回 409
- **THEN** audit_logs 新增一条 module=admin、level=WARN 的记录
