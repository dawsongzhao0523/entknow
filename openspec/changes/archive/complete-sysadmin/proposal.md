# Proposal: complete-sysadmin（系统管理全功能生产化）

## Background

系统管理 目前仅「组织与权限」（add-ops-admin）进入生产。原型已定义 7 个功能页并经产品确认，其余 6 个（总览/菜单/权限/监控/日志/设置）仍为静态原型。用户指令（2026-10-06）：完成系统管理下所有功能，生产级可用、每个功能可点击、不是 demo。

## Goal

按原型产品形态，把 系统管理 剩余 6 个功能全部落地为真实读/写路径：

1. **系统运营总览**：`GET /admin/stats` 聚合真实计数 + 服务健康 + 最近告警。
2. **菜单管理**：menus 表 CRUD；前端导航由 API 驱动（visible=false 移除）；按用户角色 perms 过滤。
3. **权限管理**：功能矩阵（roles.perms 派生 + 点击切换）；行级规则 data_rules CRUD；敏感级继承（views×datasources 推导，只读）。
4. **依赖服务监控**：dep_services/dep_checks；手动巡检对 PG/Redis/MinIO 真实探活；7 日可用率聚合。
5. **日志查询**：audit_logs + 写操作审计中间件（模块/级别/操作人/TraceID）；过滤 + 分页 + CSV 导出。
6. **个性化设置**：user_settings 按账号持久化；主题/密度/等宽字体全局生效；默认落地页/默认本体/通知类别过滤生效。

## Scope

- backend：6 张新表（menus/data_rules/dep_services/dep_checks/audit_logs/user_settings）+ seed；store 五个新文件；`/api/v1` 新端点；审计中间件挂载进 MountAPI。
- frontend：系统管理 六个新页面 + 路由；导航改为 menus API 驱动（异常回退常量）；顶栏演示用户切换；会话/设置上下文（ConfigProvider 主题与密度、body class、Home 落地跳转与通知过滤）。
- docker-compose：backend 容器补充 REDIS/MINIO 巡检地址环境变量。

## 非目标（后续提案）

登录认证与会话、菜单发布流程、通知渠道投递、监控告警规则与主动告警、本体级角色管理化。

## 原型落地情况（UI 原型先行门槛）

prototype/src/pages/admin/ 全部 7 页（Overview/OrgHub 含 Users+Roles+Menus+Permissions/OpsHub 含 Monitor+Logs/Settings）已落地并通过产品确认；本提案复用其信息架构与列语义，数据全部换成真实 API。

## 确认记录

用户于 2026-10-06 直接下达完成指令并要求生产级可用（docs/requirement/20261006系统管理全功能生产化.md），作为本提案的确认输入。

## 输入需求

docs/requirement/20261006系统管理全功能生产化.md
