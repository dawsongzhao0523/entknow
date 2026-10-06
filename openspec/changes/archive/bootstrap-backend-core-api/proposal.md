# Proposal: bootstrap-backend-core-api（后端核心 API 与 Demo 数据）

## Background

原型（prototype/）已完成 ≈60% 产品形态验证，按「UI 原型先行」门槛，核心列表类界面（本体切换、注册中心、数据源、逻辑视图、评审、通知、用户）已定型，可以进入真实前后端开发。当前 backend/ 仅有 healthz/version 骨架，尚无数据库与业务 API。

## Goal

1. 以 PostgreSQL 为存储，落地**核心读 API**：把原型共享 mock（`prototype/src/mock/data.ts`）中的全部实体持久化并经 `/api/v1/**` 提供——本体（含成员角色）、注册中心对象、关系、函数、数据源、逻辑视图、传播规则、评审、通知、用户、能力出口、版本、表画像（purchase_order）。
2. **Demo 数据库**：demo 种子随二进制内嵌，首次启动自动装载（库空时）；`-seed` 参数可强制重置。用户 `make app` 或 `go run` 后无需任何额外步骤即可体验完整示例场景；同一份种子作为集成测试数据。
3. **生产前端骨架**（frontend/）：Vite + React + antd，AppShell + 核心页面（首页看板、本体管理、注册中心、数据源）直连真实 API；未实现的模块页显式提示「先在原型落地」。

## Scope

- backend：pgx/v5（唯一第三方依赖，标准库无 PG 驱动）、内嵌幂等 schema.sql + seed.sql、启动自动迁移、REST 读接口
- frontend：shell + 4 个真实页面 + 占位页；vite proxy → :28080
- docker-compose：backend 容器接入 postgres（DSN 注入），frontend 容器（25190）

## 非目标（Non-Goals，后续提案）

- 写路径 API（创建/编辑/评审流转）——原型中的 proto.tsx 弹窗对应的后端落库
- 实例 360、沙盘分支、发布门禁等页面局部 mock（INSTANCE_PO/SANDBOX/GATE/TODOS）
- 认证授权（当前 myRole 按演示用户查询参数计算）
- Utopia 对接（另见 docs/utopia-integration.md 分阶段提案）

## 原型落地情况（UI 原型先行门槛）

本提案全部 API 对应的 UI 均已在 prototype/ 实现并确认（顶栏本体切换、M3 本体管理/注册中心、M1 数据源、M1 逻辑视图、M2/M8 评审列表、消息通知抽屉、M9 用户）。

## 输入需求

docs/requirement/20261006后端核心API与demo数据.md
