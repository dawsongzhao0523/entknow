# Design: add-review-workflow

## 状态机（纯函数，单测覆盖）

```
待评审 ──┬─ approve → 已通过
评审中 ──┼─ reject  → 已驳回（comment 必填原因）
         └─ withdraw→ 已撤回
终态（已通过/已驳回/已撤回）不再迁移
```

- `NextStatus(action, cur) (next, error)`：非法迁移返回错误；同向重放（cur 已是该 action 的终态）由 DecideReview 识别为幂等重放，直接返回当前记录。
- 状态机是纯函数 → 无 DB 单测（红→绿证据）。

## 幂等与并发

- **创建幂等**：客户端必须提供 `id`（缺省 400）。`INSERT ... ON CONFLICT (id) DO NOTHING RETURNING`；无返回行 → 查既有记录返回（响应头 `X-Idempotent-Replay: true`，状态码 200）。
- **裁决幂等**：通知 ID 确定性生成（`n-rv-{reviewID}-{action}`），`ON CONFLICT DO NOTHING`；同向重放不 UPDATE。
- **乐观并发**：请求可带 `expectedStatus`；`SELECT ... FOR UPDATE` 后校验，不匹配 → 409（ErrConflict），事务回滚。

## 事务边界

DecideReview 单事务：锁定评审行 → 校验迁移 → UPDATE 裁决字段 → INSERT 结果通知 → COMMIT。任一步失败整体回滚（通知不会凭空出现）。

## schema 演进

schema.sql 末尾追加幂等 `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ...`；CREATE TABLE 同步含新列（新库 ALTER 变 no-op）。不引版本表（ponytail：当前仅一条演进，出现第二条再考虑）。

## API

- `POST /api/v1/reviews` body `{id,title,type,from,sla?}` → 201 新建 / 200 重放
- `PUT /api/v1/reviews/{id}/decision` body `{action,by,comment?,expectedStatus?}` → 200 评审 / 404 / 409 / 400
- Review JSON 增加 `decidedBy`/`decidedAt`/`comment` 字段（原型接口扩展）
