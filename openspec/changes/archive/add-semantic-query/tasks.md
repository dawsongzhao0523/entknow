# Tasks

## 1. 数据层

- [x] 1.1 query_history 表 + seed 两条历史
- [x] 1.2 store：Search（四类 ILIKE 聚合）/ ExecuteQuery（计时+DSL 模板+幂等历史）/ ListQueries

## 2. API

- [x] 2.1 GET search（q 400）/ POST queries（幂等）/ GET queries（by 过滤）

## 3. 测试

- [x] 3.1 集成：检索分类命中（订单/S-0012/供货商）/ 执行幂等 / 空 q 400 / 历史过滤
- [x] 3.2 go test 与 -tags integration 全绿

## 4. 前端 M5

- [x] 4.1 语义查询页（查询/结果分区/DSL/延迟/历史重问）
- [x] 4.2 路由 m5/query + 导航；tsc/build 全绿

## 5. 收尾

- [x] 5.1 容器 E2E；归档；提交
