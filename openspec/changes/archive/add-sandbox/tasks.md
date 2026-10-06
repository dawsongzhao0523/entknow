# Tasks

- [x] 1. schema：sandbox_branches + seed 三分支（对照原型 A/B/C）
- [x] 2. store/sandbox.go：幂等建分支（risk_before 自动取基准实例）/ simulate（last-wins → 已对比；已回滚 409）/ rollback 幂等
- [x] 3. API 三组端点（400/404/409 语义）
- [x] 4. 集成测试：建分支幂等+基准风险带出 / simulate 流转 / 回滚幂等与 409 / 404；全套全绿
- [x] 5. 前端沙盘页（卡片对比+模拟+回滚+新建）；tsc/build 全绿
- [x] 6. 容器 E2E；归档；提交
