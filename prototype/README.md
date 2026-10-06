# entKnow 高保真原型（prototype）

> 给产品经理与评审用的高保真交互原型：React + Ant Design + 共享 Mock 数据，无后端依赖。产品形态验证完成后，生产前端将在仓库根的 [../frontend/](../frontend/) 落地并从这里演进。

## 快速开始

要求 Node.js ≥ 20.19（推荐 22 LTS）。

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器 → http://localhost:5188
npm run build   # 类型检查 + 生产构建
npm run preview # 预览构建产物
npm run lint    # Oxlint 检查
```

## 功能模块

| 模块 | 内容 |
|---|---|
|数据资产 | 数据源中心（结构化 / 文档库）、元数据探查、数据集市、数据加工流水线、联邦逻辑视图 |
|知识运营 | 知识库（按业务领域的领域树）、知识治理（隐式本体收敛 / 同义词 / 交叉引用） |
|本体建模 | 本体管理（注册中心与生命周期）、本体设计器（对象 / 关系 / 函数）、智能建模（七步法向导 / AI 会话 / 语料提取） |
|本体运行时 | 数据绑定与实例化、实例 360°、状态机传播与行动网关 |
|推理演绎 | 语义查询、规则推理、OWL 推理器 |
|推演沙盘 | 世界克隆、假设施加、Tick 时间推进、多分支对比、生产隔离 |
|智能应用 | MCP / REST / CLI 统一能力出口 |
|治理演化 | 评审与发布门禁（K 等级）、版本 / 分支 / 撤回对账 |
|系统管理 | 组织与权限、监控与日志、个性化设置 |

示例场景为**供应链「订单交付风险」**：多源数据（MySQL / PostgreSQL / SQLServer / Oracle / ClickHouse / 飞书知识库）→ 本体（供应商、工厂、物料、采购订单…）→ 指标与行动（供应商准时率、交付风险处置）。

## 演示要点

原型内置三种演示角色（顶栏头像处切换），首页形态随之变化：

| 角色 | 人物 | 视角 |
|---|---|---|
| 构建者 | 张三 · 数据架构师 | 分阶段引导（环境准备 → 数据准备 → 本体建模 → 验证交付）+ AI Skill 入口 |
| 管理层 | 李四 · 供应链总监 | 管辖范围运营看板 + 待办审批 |
| 业务专家 | 王五 · 业务专家 | 业务语言的知识与问答入口 |

其他可体验点：

- 顶栏**切换当前本体**（供应链 / 质量追溯 / 设备运维），角色（所有者 / 建模者 / 评审者 / 查看者）随本体变化并影响页面可操作性；
- 所有页面数据来自共享 Mock（`src/mock/data.ts`），跨屏实体、数字、状态一致；
- 占位按钮通过 `src/components/proto.tsx` 提供最小真实反馈（toast / 表单 / 确认 / 详情）。

## 目录结构

```
├── public/
└── src/
    ├── components/            # TabHub（Tab 收纳容器）、proto（原型交互助手）
    ├── layouts/AppShell.tsx   # 全局框架：导航、本体切换、角色、消息通知
    ├── mock/data.ts           # 全局共享 Mock（供应链订单交付风险场景）
    ├── pages/                 # Home 与九大模块页面（assets/knowledge/modeling/…/admin）
    ├── theme.ts               # antd 设计令牌（祖母绿 + 暖灰）
    ├── App.tsx                # 路由定义（含旧路径重定向）
    └── main.tsx
```

## 相关文档（仓库根 docs/）

- 产品架构思维导图：[../docs/architecture/architecture-mindmap.png](../docs/architecture/architecture-mindmap.png)
- Utopia 集成架构设计（已评审基线）：[../docs/utopia-integration.md](../docs/utopia-integration.md)
