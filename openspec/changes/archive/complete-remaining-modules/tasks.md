# Tasks

## 1. 数据层
- [x] 1.1 schema：六张新表 + seed（集市/绑定/候选/对齐 demo 数据）
- [x] 1.2 store/market.go：集市目录 CRUD + 申请审批
- [x] 1.3 store/binding.go：绑定 CRUD + 手动同步（runs 落史）
- [x] 1.4 store/convergence.go：候选生成（kb+同义词确定性召回）/采纳（建对象 DRAFT）/丢弃；跨源对齐生成/裁决
- [x] 1.5 store/versionops.go：成员 CRUD、发布、导出（OWL/RDF）、撤回对账、发布门禁派生
- [x] 1.6 store/reasoning.go：一致性检查派生 + 规则执行（firings+risk 更新）
- [x] 1.7 store/workbench.go：聚合端点

## 2. API
- [x] 2.1 server/modules_api.go：全部新端点挂载

## 3. 测试
- [x] 3.1 集成测试（各组幸福+保护路径）
- [x] 3.2 全量测试绿（unit+integration+gofmt/vet）

## 4. 前端
- [x] 4.1 api.ts 扩展
- [x] 4.2 九个新页面 + 三个页面扩展
- [x] 4.3 路由 + 菜单 seed + tsc/build 绿

## 5. 收尾
- [x] 5.1 浏览器 E2E 抽检（新页可点、写路径生效）
- [x] 5.2 归档 + git commit
