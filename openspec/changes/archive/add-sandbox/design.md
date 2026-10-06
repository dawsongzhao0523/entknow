# Design: add-sandbox

## 模型

`sandbox_branches(id, name, hypothesis, base_instance, risk_before int, risk_after int nullable, cost, note, status, by_user, at)`；status ∈ 推演中 | 已对比 | 已回滚。

## 语义

- **建分支幂等**：客户端 id；risk_before 默认取基准实例当前风险分（base_instance 传实例号可自动带出，存在性不强制——沙盘允许离线实例）。
- **simulate**：可重跑（last-wins），首次置状态 已对比；校验 riskAfter ∈ [0,100]（400）。
- **rollback**：→ 已回滚；已回滚再回滚幂等返回；已回滚不可再 simulate（409，世界已销毁）。

## API

- GET /api/v1/sandbox-branches
- POST /api/v1/sandbox-branches {id, name, hypothesis, baseInstance?, riskBefore?}
- POST /api/v1/sandbox-branches/{id}/simulate {riskAfter, cost?, note?, by}
- POST /api/v1/sandbox-branches/{id}/rollback {by}

## 前端

- 卡片行（三分支）：假设/基准实例/风险 before→after（条形对比着色）/代价/结论/状态 Tag。
- 操作：模拟（弹窗）、回滚（Popconfirm，提示生产隔离）；新建分支弹窗。
