# Design: split-logs

## system_logs
```sql
system_logs (id serial PK, at text, level text, component text, content text, trace_id text)
```
component 取值：数据同步 / 数据绑定 / 推理引擎 / 依赖巡检 / 治理引擎 等。

## 权限门
复用 userModulePerms（menus 过滤所用）：
- audit-logs/export：perms ∩ {governance, admin} ≠ ∅
- system-logs/export：perms ∩ {admin} ≠ ∅
user 参数缺省 zhangsan；无权返回 403（中文文案指明所需域）。

## 发射点（best-effort，失败不阻塞业务）
- InspectAll：每次巡检写一条汇总（含异常数），异常服务各写 WARN。
- SyncBinding：成功/失败各写一条（含运行摘要）。
- RunRule：执行完成写一条（含触发数）。

## stats.RecentAlerts
改查 system_logs WHERE level IN ('WARN','ERROR') ORDER BY at DESC LIMIT 5，字段含 component；auditToday 保留审计计数。

## 前端
Logs.tsx：Tabs（审计日志 | 系统日志）；挂载时并行探测两端点（带 user），403 的 tab 不渲染。
系统日志列：时间/组件/级别/内容/TraceID + 详情；过滤：组件、级别、关键字、快捷时间；导出 CSV。
菜单 seed：admin/logs 名称「日志查询」→「日志中心」。

## 测试
- 王五（评审员）GET audit-logs 200、GET system-logs 403；zhangsan 均 200。
- 巡检/绑定同步/规则执行后 system_logs 新增对应记录。
- 系统日志过滤分页与导出；既有审计断言回归。
