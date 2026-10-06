# Tasks

## 1. 数据与状态机

- [x] 1.1 schema.sql：reviews 表增 decided_by/decided_at/comment（CREATE 含新列 + ALTER IF NOT EXISTS 幂等演进）；seed 为已通过评审补裁决信息
- [x] 1.2 store 状态机纯函数 NextStatus + 终态判定（无 DB 单测：合法迁移、非法迁移、重放识别）

## 2. 写路径

- [x] 2.1 CreateReview：幂等创建（ON CONFLICT DO NOTHING + 既有记录回读），缺 id 返回 400
- [x] 2.2 DecideReview：单事务（FOR UPDATE → 校验/重放 → UPDATE → 确定性通知 INSERT）→ ErrNotFound/ErrConflict
- [x] 2.3 API handler：POST /api/v1/reviews（201/200+replay 头）、PUT /api/v1/reviews/{id}/decision（200/400/404/409）

## 3. 测试

- [x] 3.1 集成：创建幂等（同 ID 二次 → replay）、裁决迁移、非法迁移 409、expectedStatus 冲突 409、重放幂等（状态/通知不变）、404
- [x] 3.2 `go test ./...` 无库全绿；`-tags integration` 对 demo 库全绿

## 4. 前端 M8

- [x] 4.1 api.ts：createReview/decideReview + Review 扩展字段
- [x] 4.2 Reviews 页面：列表（含裁决人/原因）、通过（确认）、驳回（必填原因弹窗）、撤回、新建评审（表单）
- [x] 4.3 路由 /m8/reviews + 导航挂到「治理演化」；tsc/build 全绿

## 5. 收尾

- [x] 5.1 容器重建后写路径端到端 curl 验证；归档提案；提交
