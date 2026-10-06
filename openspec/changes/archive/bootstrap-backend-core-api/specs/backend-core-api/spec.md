# backend-core-api 规格

## Requirements

### Requirement: 幂等启动迁移与 Demo 自动装载
后端启动 SHALL 在连接数据库后执行内嵌 `schema.sql`（全部 `CREATE TABLE IF NOT EXISTS`，可重复执行）；当 `ontologies` 表为空时 SHALL 自动执行 `seed.sql` 装载 demo 数据。带 `-seed` 参数启动 SHALL 强制重置为 demo 数据（TRUNCATE + INSERT）。

#### Scenario: 空库首次启动
- **WHEN** 后端在空库上启动
- **THEN** schema 创建成功且 demo 数据可经 API 查询（如 GET /api/v1/ontologies 返回 3 条）

#### Scenario: 重复启动不重复装载
- **WHEN** 后端在已有数据的库上再次启动（不带 -seed）
- **THEN** 不产生重复行，GET /api/v1/notifications 数量不变

### Requirement: 核心实体读 API
系统 SHALL 提供 `/api/v1` 下的 GET 读接口：`ontologies`、`role-matrix`、`objects`、`edges`、`functions`、`datasources`、`views`、`rules`、`reviews`、`notifications`、`users`、`capabilities`、`versions`、`table-profiles/{name}`。响应字段名 SHALL 与原型 mock 的 TS 接口一致（camelCase）。

#### Scenario: 本体列表含我的角色
- **WHEN** GET /api/v1/ontologies?user=zhangsan
- **THEN** 返回 3 条本体，scm 的 myRole 为「建模者」，quality 为「查看者」

#### Scenario: 注册中心对象
- **WHEN** GET /api/v1/objects（默认 scope=registry）
- **THEN** 返回 11 条对象，含 props/mapping/shared/perm 字段；`?scope=canvas` 返回 7 条

#### Scenario: 未知表画像返回 404
- **WHEN** GET /api/v1/table-profiles/not-exist
- **THEN** 响应 404

### Requirement: 健康与版本端点零依赖
`GET /healthz` 与 `GET /api/v1/version` SHALL 不依赖数据库可用性，数据库故障时仍返回 200。

### Requirement: Demo 数据即集成测试数据
集成测试（build tag `integration`）SHALL 使用与 demo 相同的种子数据断言各端点实体数量与关键字段；数据库不可达时 SHALL skip 而非失败，保证 `go test ./...` 在无外部依赖环境全绿。
