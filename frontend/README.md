# entKnow Frontend（生产前端）

生产前端：与 [../prototype/](../prototype/) 同栈（React 19 + TypeScript + Vite + Ant Design 6），设计令牌与信息架构沿用原型，数据来自真实后端 API（不再使用 mock）。

**当前已实现**（按 openspec 提案 `bootstrap-backend-core-api` 逐步推进）：

- AppShell：M1-M9 导航 + 顶栏「当前本体」切换器（GET /api/v1/ontologies）
- 首页：本体/评审/通知数据总览
- M3 本体管理：本体列表（版本/状态/我的角色）+ 版本历史
- M3 注册中心：对象 / 关系（一等公民边属性）/ 函数 三张表
- M8 评审与发布：真实裁决闭环（通过/驳回必填原因/撤回/幂等新建，替代原型弹窗）
- M2 知识库：领域树 + 条目 CRUD（乐观并发/软删除/发布）+ 同义词归并治理
- M4 实例 360°：实例属性/状态机/时间线 + 治理化行动执行（鉴权 403/风险分>80 二次确认）
- M4 规则与行动：传播规则 + 触发记录 + 行动网关日志
- M9 组织与权限：用户/角色管理（账号唯一、角色引用完整、内置/被引用保护）
- M7 能力出口：能力目录（真实计数 base+日志）+ 幂等注册/下线级联 + 调用记录
- M5 语义查询：四类实体统一检索 + DSL + 查询历史（幂等）
- M1 数据源中心：数据源列表
- 其余模块：Placeholder（按「UI 原型先行」流程，先在原型落地再实现）

## 快速开始

```bash
# 1. 启动依赖与后端（根目录）
make infra
cd ../backend && go run ./cmd/entknow    # :28080，空库自动装载 demo

# 2. 前端（本目录）
npm install
npm run dev        # → http://localhost:5190（/api 代理到 :28080）
npm run build      # tsc + vite 构建
```

Docker 全栈（根目录 `make app`）：frontend 容器（nginx，:25190）已配置 `/api` 反代到 backend 容器。

## 结构

```
├── nginx.conf            # 容器部署用：前端路由 + /api 反代（动态解析 backend）
└── src/
    ├── api.ts            # 类型化 API 客户端（类型与后端 JSON 一一对应）
    ├── layouts/AppShell.tsx
    ├── pages/            # Home / Ontologies / Registry / Datasources / Placeholder
    └── theme.ts          # 与 prototype 一致的设计令牌
```
