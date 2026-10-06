# Design: bootstrap-backend-core-api

## 技术选型（ponytail 约束下的最小方案）

- **驱动**：`github.com/jackc/pgx/v5`（含 pgxpool）。标准库无 PG 驱动，pgx 是事实标准且零传递框架依赖。**这是本仓库第一个也是本提案唯一的第三方依赖。**
- **迁移**：不引 goose/atlas。`schema.sql` 全部 `CREATE TABLE IF NOT EXISTS`，启动时整文件执行（幂等）；seed 同理。与 dataset_tag「启动跑幂等 migration」同模式。
- **查询**：不用 ORM/sqlc。手写 SQL + 手动 Scan（本切片全是简单 SELECT），结构体 json tag 与原型 TS 接口字段一一对应（camelCase），未来前端可直接换数据源。
- **HTTP**：继续 `net/http` + `ServeMux` 方法路由，新增 `MountAPI(mux, *store.Store)`；静态端点（healthz/version）保持零依赖可测。

## 数据建模要点

- 单一 `objects` 表承载画布对象（o1-o7）与注册中心（o1-o11）：`canvas bool` 区分，`ontology` 存名称字符串（财务本体不在 ontologies 主列表，避免为树节点加隐藏行）。
- props/upstream/fks 等：`jsonb`/`text[]` 列，API 原样吐出。
- 角色矩阵（ROLE_MATRIX）是规约常量，硬编码在 Go 中，不进库。
- `myRole`：`memberships(onto_id, user_id, role)` 查询参数 `user`（默认 zhangsan），无行则「查看者」。

## Demo 数据与集成测试

- `seed.sql`：TRUNCATE + INSERT，内容 = 原型 mock（已脱敏）逐条对应；启动时若 `ontologies` 为空自动执行；`-seed` 强制重置。**demo 即集成测试数据**：同一 DSN、同一份种子。
- 集成测试加 `integration` build tag，DSN 不可达时 t.Skip——`go test ./...` 保持无外部依赖全绿（DoD），`make itest` 跑真库断言。

## 前端

- frontend/ 独立 Vite 应用（不与 prototype 共享构建），主题/导航结构从原型复制精简；`src/api.ts` 集中 fetch（vite proxy /api → 28080）。
- 页面：Home（统计+入口）、Ontologies（本体列表+角色）、Registry（对象/关系/函数三表）、Datasources（数据源表）。其余路由 → Placeholder（按流程提示先在原型落地）。

## 风险

- pgx 拉取需网络（必要时 GOPROXY=goproxy.cn）。
- mock 与 SQL 的一致性靠集成测试断言数量与关键字段（3 本体 / 11 注册对象 / 6 数据源 / 6 通知…）。
