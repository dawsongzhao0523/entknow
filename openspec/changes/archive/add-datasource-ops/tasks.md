# Tasks

## 1. 数据层

- [x] 1.1 schema：pipeline_tasks / pipeline_runs + seed（4 任务对照原型 + 2 执行记录）
- [x] 1.2 store/dsops.go：数据源幂等注册（name 唯一 409）/编辑；视图幂等创建/编辑下线；流水线任务注册/启停/运行（幂等 + last_run）/执行记录

## 2. API

- [x] 2.1 datasources POST/PUT；views POST/PUT；pipeline-tasks CRUD + run；pipeline-runs 查询（校验与 404/409/400 语义）

## 3. 测试

- [x] 3.1 集成：数据源幂等/重名 409/非法 mode 400；视图下线流转；流水线注册幂等/停用 409/运行幂等 + last_run/404
- [x] 3.2 go test 与 -tags integration 全绿

## 4. 前端 数据资产

- [x] 4.1 数据源中心升级（注册/编辑/停用）
- [x] 4.2 逻辑视图页、数据加工页（任务 + 运行 + 执行记录）
- [x] 4.3 路由与导航；tsc/build 全绿

## 5. 收尾

- [x] 5.1 容器 E2E；归档；提交
