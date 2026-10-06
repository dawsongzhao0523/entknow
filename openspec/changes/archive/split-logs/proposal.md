# Proposal: split-logs（审计日志与系统日志分离）

## Background
用户指令（2026-10-07，见需求草稿）：单一 audit_logs 混合了用户操作审计与运行时事件；两者用途与受众不同（合规追溯 vs 故障排查），权限也不同。

## Goal
1. system_logs 表（at/level/component/content/trace_id）+ seed 拆分（运行时叙事入系统日志，用户操作留审计）。
2. API：GET /system-logs（level/component/kw/since/分页）+ /export CSV；audit-logs 与 system-logs 均带 user 权限门（审计：governance|admin；系统：admin；无权 403）。
3. 真实发射：InspectAll / SyncBinding / RunRule 写系统日志。
4. stats：RecentAlerts 改由 system_logs 派生（含 component）；Overview 联动。
5. 前端：admin/logs 改双 tab 容器（各自过滤/导出，403 隐藏 tab）；菜单叶子更名「日志中心」。

## Scope
backend：schema/seed、store/syslog.go、权限助手、stats 调整、发射点、集成测试；frontend：api.ts、Logs.tsx 重构、Overview 调整。

## 原型落地情况
原型为单一日志页；本提案按用户指令拆分双 tab（用户直接指定行为）。

## 确认记录
用户于 2026-10-07 直接下达指令（docs/requirement/20261007日志分离.md）。

## 输入需求
docs/requirement/20261007日志分离.md
