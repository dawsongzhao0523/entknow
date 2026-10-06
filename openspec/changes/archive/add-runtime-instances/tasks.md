# Tasks

## 1. 数据层

- [x] 1.1 schema：instances / instance_events（UNIQUE 幂等键）/ rule_firings / actions + seed（PO 实例 + 4 时间线事件 + 2 传播记录 + 5 行动日志对照原型）
- [x] 1.2 store：实例列表/详情（含时间线）、事件追加（ON CONFLICT 幂等）、触发记录查询/记录、行动查询/执行

## 2. API 与业务规则

- [x] 2.1 GET instances（object/kw）· GET instances/{id} · POST instances/{id}/events
- [x] 2.2 GET rule-firings（rule 过滤）· POST rule-firings（幂等）
- [x] 2.3 POST actions：参数校验→函数为行动类→实例存在→user 在 users 表（403）→风险分>80 须 confirm→事务（记录+实例事件+通知）；GET actions

## 3. 测试

- [x] 3.1 集成：实例详情含时间线 / 事件追加幂等 / 行动校验链（未知函数 400、未知实例 404、未知用户 403、高风险未确认 400、确认后成功且事件+通知同事务、重复执行幂等）/ 触发记录幂等
- [x] 3.2 go test 与 -tags integration 全绿

## 4. 前端 M4

- [x] 4.1 Instance360 页：实例搜索+360 详情+时间线+关系示意+执行行动（二次确认）
- [x] 4.2 RuntimeRules 页：规则表+触发记录+行动日志
- [x] 4.3 路由与导航；tsc/build 全绿

## 5. 收尾

- [x] 5.1 容器 E2E 验证；归档；提交
