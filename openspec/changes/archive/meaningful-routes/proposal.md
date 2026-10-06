# Proposal: meaningful-routes（全站路由语义化）

## Background

生产前端路由形如 `/assets/datasources`，模块编号对使用者无含义；且 `九大模块` 同时充当菜单 id、角色权限键、审计模块标签三重内部标识。用户指令（2026-10-06）：路由全部使用有含义的单词。

## Goal

1. 前端路由两级语义化：`assets/knowledge/modeling/runtime/reasoning/sandbox/apps/governance/admin` 九个模块前缀 + 功能子路由（完整映射见 docs/requirement/20261006路由语义化.md）。
2. 内部标识三处同步：menus 一级 id 与子路由、roles.perms（seed）、audit 模块标签（中间件映射 + 日志过滤 + seed 叙事）。
3. 页内跳转（Home/Overview）、设置落地页选项、通知 to_path（seed + 评审裁决）、AppShell 回退导航全部对齐。
4. 前端 `pages/admin/` 目录更名 `pages/admin/`（代码结构与路由语义一致）。

## Scope

- backend：seed.sql（menus/roles.perms/audit_logs.module/notifications.to_path）、audit.go 模块映射、store.go 与 runtime.go 通知路径、schema 注释、相关测试。
- frontend：App.tsx 路由、AppShell 回退导航、Home/Overview 跳转、Settings 落地页选项、Logs 模块过滤、Permissions/OrgAdmin 回退模块常量、Menus 页示例文案、目录更名。
- specs：sysadmin 规格中权限过滤场景的模块键同步（knowledge/modeling/governance → knowledge/modeling/governance）。

## 非目标

旧地址兼容重定向；后端 /api/v1 路径（本就无 九大模块）；prototype/ 原型路由。

## 原型落地情况（UI 原型先行门槛）

纯路由/标识重命名，无新 UI；页面信息架构不变。

## 确认记录

用户于 2026-10-06 直接下达指令（docs/requirement/20261006路由语义化.md），作为本提案确认输入。

## 输入需求

docs/requirement/20261006路由语义化.md
