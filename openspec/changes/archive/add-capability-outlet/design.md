# Design: add-capability-outlet

## 调用统计真实化

- `capabilities.base_calls int`（幂等 ALTER）：承接 seed 假基数（8412/12401/231/1204）。
- `capability_calls(id, capability_id, caller, status, latency_ms, called_at)`：真实调用日志，客户端 id 幂等。
- ListCapabilities 计算 `calls_total = base_calls + count(log)`；JSON 兼容原型字段 `calls`（千分位字符串），另给 `callsTotal` 数值与 `realCalls`（日志数）。

## API

- GET /api/v1/capabilities（计算后列表）
- POST /api/v1/capabilities（幂等）/ PUT /api/v1/capabilities/{id} / DELETE /api/v1/capabilities/{id}（事务级联删日志）
- POST /api/v1/capabilities/{id}/invoke {id, caller, status?, latencyMs?} → 幂等记录，返回更新后的能力
- GET /api/v1/capabilities/{id}/calls?limit=（倒序最近调用）

## 前端

- 目录表：名称/协议 Tag/描述/callsTotal（真实计数徽标）/负责方；行内「调用」按钮（弹窗：caller、latency、status）→ invoke → 刷新计数。
- 注册/编辑弹窗；详情抽屉显示最近调用（caller/status/耗时/时间）。

## 演进说明

已有库经 ALTER 得 base_calls=0（旧 calls 文本弃用）；`make demo` 重置后基数恢复。接受该一次性偏差（demo 场景）。
