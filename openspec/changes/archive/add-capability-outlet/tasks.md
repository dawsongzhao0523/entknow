# Tasks

## 1. 数据层

- [x] 1.1 schema：capability_calls 表 + capabilities.base_calls 幂等 ALTER；seed 写入基数
- [x] 1.2 store：列表（base+log 合并计算，千分位格式化）/幂等注册/编辑/删除（事务级联）/invoke（幂等+校验）/最近调用

## 2. API

- [x] 2.1 capabilities CRUD + invoke + calls 六个端点（404/400 语义）

## 3. 测试

- [x] 3.1 集成：计数 = 基数+日志 / invoke 幂等不重复计数 / 未知能力 404 / 删除级联清理 / 注册幂等
- [x] 3.2 go test 与 -tags integration 全绿

## 4. 前端 智能应用

- [x] 4.1 能力出口页（目录+真实计数+调用弹窗+最近调用抽屉+注册编辑）
- [x] 4.2 路由 apps/capabilities + 导航；tsc/build 全绿

## 5. 收尾

- [x] 5.1 容器 E2E；归档；提交
