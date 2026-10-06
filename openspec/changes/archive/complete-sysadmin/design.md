# Design: complete-sysadmin

## 数据模型（schema.sql 追加，全部 IF NOT EXISTS 幂等）

```sql
menus         (id PK, parent_id, name, route, icon, sort, visible)          -- 两级树，parent_id='' 为一级
data_rules    (id PK, target, rule, role, effect, updated_by, updated_at)   -- role 引用 roles.name（应用层校验）
dep_services  (id PK, name, descr, kind, target, status, latency_ms, checked_at)  -- kind: postgres|redis|http
dep_checks    (id serial PK, service_id, ok, latency_ms, at)                -- 巡检历史（7 日可用率数据源）
audit_logs    (id serial PK, at, module, level, operator, content, trace_id)
user_settings (account PK, settings jsonb)
```

- dep_services.target：postgres 空=自库连接池；redis/minio 地址可被环境变量覆盖（`ENTKNOW_REDIS_ADDR` /
  `ENTKNOW_MINIO_ADDR`），docker-compose 的 backend 容器注入容器网络地址，本地 go run 用默认 localhost——
  两套环境巡检均真实可达。
- seed：menus 按当前生产前端真实路由播种（9 模块 + 22 叶子）；data_rules 4 条（原型同款语义，脱敏）；
  dep_services 3 项 + 近 7 日 dep_checks 历史；audit_logs 10 条（原型叙事，脱敏）；user_settings 张三默认。

## API（挂 /api/v1，写路径全部幂等或 upsert）

| 端点 | 说明 |
|---|---|
| GET /admin/stats | 总览聚合：各实体计数、评审/管道状态分布、服务健康快照、最近 5 条 WARN/ERROR 审计、今日审计事件数 |
| GET /menus?user= | 菜单树（父带 children，按 sort）；user 非空时按其角色 perms 并集过滤一级模块 |
| POST /menus · PUT /menus/{id} · DELETE /menus/{id} | id 幂等 / 编辑 name,route,icon,sort,visible / 有子菜单 409 |
| GET /data-rules · POST · PUT/{id} · DELETE/{id} | 行级规则 CRUD；role 不存在 400；未知 404 |
| GET /sensitivity | 敏感级继承推导：views.upstream `table(ds)` × datasources.sensitive 取最高，对比存量标注 |
| GET /dep-services | 服务列表（含最近巡检状态） |
| GET /dep-services/uptime | 近 7 日按日可用率（dep_checks 聚合） |
| POST /dep-services/inspect | 手动巡检：逐服务真实探活（postgres=pool.Ping / redis=RESP PING / http=GET，2s 超时），>800ms 判「延迟」，失败判「异常」；更新服务行 + 追加 dep_checks |
| GET /audit-logs?module=&level=&kw=&since=&limit=&offset= | 过滤分页（返回 {total,items}，时间倒序） |
| GET /audit-logs/export?同上 | CSV 附件下载（UTF-8 BOM，全量过滤集） |
| GET /settings?user= · PUT /settings | 按账号 upsert（settings 为前端自有形状的 jsonb） |

## 审计中间件（server/audit.go）

MountAPI 内部改为注册到子 mux `api`，再 `mux.Handle("/api/", withAudit(st, api))`：

- 仅 POST/PUT/DELETE 记录；读取 body 缓冲后回填（handler 无感）。
- module：路径→模块映射表（datasources/views/pipeline-*→assets，kb/synonyms→knowledge，objects/edges/functions/elements→modeling，
  instances/rule-firings/actions→runtime，queries→reasoning，sandbox-branches→sandbox，capabilities→apps，reviews→governance，其余→admin）。
- operator：body 中 user/by/from 第一个非空值，缺省「系统」。
- level：2xx=INFO，4xx=WARN，5xx=ERROR；trace_id=`tr-` + 8 位随机十六进制。
- 落库失败仅日志不阻塞请求（失败不阻塞批次）。

## 前端

- `session.tsx`：SessionProvider（当前用户 localStorage + users 列表 / 设置 GET+PUT + 应用副作用）。
  main.tsx 结构：SessionProvider → Root（读 session 合成 antd 主题与 componentSize）→ ConfigProvider → App。
- 副作用真实生效：theme（darkAlgorithm/跟随系统）、density（componentSize small|middle|large）、
  monoFont（body class 切换 .mono 字体）、landingPage（首次进 '/' 跳转，sessionStorage 防循环）、
  defaultOnto（顶栏初始值）、通知类别（Home 消息中心过滤）。
- AppShell：导航改 `GET /menus?user=` 驱动（icon 名→图标注册表；API 异常回退内置常量导航）；
  顶栏用户切换（正常状态用户）。
- 系统管理 页面：Overview（统计卡 + 服务健康 + 告警列表）、Permissions（矩阵可切换/行级规则 CRUD/敏感级只读）、
  Menus（树表 CRUD + 显隐）、Monitor（卡片 + 手动巡检 + 7 日可用率）、Logs（过滤分页 + 详情 + CSV 导出）、
  Settings（三组设置，保存即全局生效）。
- 路由：admin/overview · admin/org（已有）· admin/permissions · admin/menus · admin/ops · admin/logs · admin/settings。

## 测试策略

- 集成（-tags integration，对 demo 库）：菜单树/幂等/子菜单 409/按权限过滤；行级规则 CRUD+角色 400；
  巡检落历史并刷新状态；审计中间件（POST 201→INFO、409→WARN、模块/操作人断言）+ 过滤/分页/CSV；
  设置 upsert 读取；stats 计数与 seed 一致；敏感级推导断言。
- 单元（无库）：audit 的 moduleOf/pickOperator 纯函数表驱动。
- 前端：`npm run build`（tsc -b）全绿为准。

## 任务拆分（每 task ≤10 文件、单文件 ≤500 行）

见 tasks.md。migration：仅新增表（CREATE IF NOT EXISTS），无存量列变更，天然幂等。
