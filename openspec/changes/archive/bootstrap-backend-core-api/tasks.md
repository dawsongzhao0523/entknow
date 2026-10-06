# Tasks

## 1. 数据层

- [x] 1.1 引入 pgx/v5 依赖（提案已说明理由），`internal/store`：连接池 + `Migrate()`（内嵌 schema.sql 幂等执行）+ `Seed()`（内嵌 seed.sql，TRUNCATE+INSERT）+ 空库自动装载
- [x] 1.2 schema.sql：users / ontologies / memberships / objects / edges / functions / views / datasources / rules / reviews / notifications / capabilities / versions / table_profiles（全部 IF NOT EXISTS）
- [x] 1.3 seed.sql：原型 mock 全量对应（已脱敏），TRUNCATE+INSERT 可重复执行

## 2. 读 API

- [x] 2.1 `server.MountAPI`：/api/v1 下 ontologies（含 myRole）、objects（scope=canvas|registry）、edges、functions、datasources、views、rules、reviews、notifications、users、capabilities、versions、table-profiles/{name}、role-matrix（常量）
- [x] 2.2 main.go：DSN 环境变量 ENTKNOW_PG_DSN（默认本地 25432）、启动迁移+自动 seed、`-seed` 强制重置、连接重试（等 compose 健康检查）
- [x] 2.3 单测：静态端点既有测试保持；json 输出字段名与原型 TS 接口一致

## 3. 集成测试与 demo 验证

- [x] 3.1 `integration` tag 测试：对 demo 库跑全部端点，断言实体数量与关键字段（3 本体/11 注册对象/6 数据源/5 函数/4 规则/6 通知/4 用户…）；DSN 不可达 skip
- [x] 3.2 根 Makefile：`make demo`（容器内强制重置 demo）、`make itest`（跑集成测试）；curl 冒烟通过

## 4. 生产前端骨架

- [x] 4.1 frontend/ Vite+React+antd 应用：theme/AppShell（导航 九大模块 + 本体切换器接 API）
- [x] 4.2 页面：Home 统计、Ontologies 列表（角色/状态）、Registry（对象/关系/函数）、Datasources；其余模块 Placeholder（提示先在原型落地）
- [x] 4.3 vite proxy /api→:28080；`tsc -b` 通过；frontend/Dockerfile + compose 服务（25190）

## 5. 收尾

- [x] 5.1 README/AGENTS 连接信息核对；归档提案；提交
