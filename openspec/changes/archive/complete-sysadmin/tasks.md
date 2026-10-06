# Tasks

## 1. 数据层（backend/internal/store）

- [x] 1.1 schema.sql：menus/data_rules/dep_services/dep_checks/audit_logs/user_settings 六表（IF NOT EXISTS）
- [x] 1.2 seed.sql：TRUNCATE 增补六表；播种菜单树（真实路由）、行级规则、依赖服务 + 7 日巡检历史、审计叙事、张三默认设置
- [x] 1.3 store/menus.go：菜单树构建 + user perms 过滤 + 幂等创建/更新/删除（子菜单 409）
- [x] 1.4 store/datarules.go：行级规则 CRUD（角色存在 400）+ 敏感级继承推导
- [x] 1.5 store/monitor.go：服务列表 + 真实巡检（postgres/redis/http）+ 状态更新 + 7 日可用率聚合
- [x] 1.6 store/audit.go：审计插入 + 过滤分页查询
- [x] 1.7 store/settings.go：按账号 upsert/读取
- [x] 1.8 store/stats.go：总览聚合查询

## 2. API 层（backend/internal/server）

- [x] 2.1 server/audit.go：写操作审计中间件（模块映射/操作人提取/级别/TraceID）+ 挂载进 MountAPI（子 mux 包装）
- [x] 2.2 server/sysadmin_api.go：admin/stats、menus、data-rules、sensitivity、dep-services（含 inspect/uptime）、audit-logs（含 export CSV）、settings 全部端点
- [x] 2.3 docker-compose.yml：backend 注入 ENTKNOW_REDIS_ADDR / ENTKNOW_MINIO_ADDR

## 3. 测试（backend）

- [x] 3.1 单元：audit moduleOf/pickOperator 表驱动
- [x] 3.2 集成：菜单树/幂等/子菜单 409/权限过滤；行级规则 CRUD + 角色 400；巡检落历史；审计 INFO/WARN + 过滤分页 + CSV；设置 upsert；stats 计数；敏感级推导
- [x] 3.3 `go test ./...` 与 `-tags integration`（make itest）全绿 + gofmt/go vet

## 4. 前端（frontend/src）

- [x] 4.1 api.ts：新类型与新端点方法
- [x] 4.2 session.tsx：会话（用户切换）+ 设置加载保存 + 副作用（主题/密度/mono/落地页/默认本体/通知过滤）
- [x] 4.3 main.tsx：SessionProvider + 动态 ConfigProvider；AppShell：menus 驱动导航（回退常量）+ 用户切换器
- [x] 4.4 pages/admin/Overview.tsx（stats 聚合）
- [x] 4.5 pages/admin/Permissions.tsx（矩阵切换/行级规则/敏感级）
- [x] 4.6 pages/admin/Menus.tsx（树表 CRUD）
- [x] 4.7 pages/admin/Monitor.tsx（卡片 + 手动巡检 + 7 日可用率）
- [x] 4.8 pages/admin/Logs.tsx（过滤分页 + 详情 + CSV 导出）
- [x] 4.9 pages/admin/Settings.tsx（三组设置保存即生效）
- [x] 4.10 App.tsx 路由 + Home 落地跳转/通知过滤 + index.css .mono
- [x] 4.11 `npm run build`（tsc -b）全绿

## 5. 收尾

- [x] 5.1 make infra + 本地后端/前端容器 E2E 抽查（七页可点、写路径生效）
- [x] 5.2 归档提案至 openspec/specs/sysadmin + CHANGELOG；git commit
