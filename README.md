# entKnow · OntoOS

> 企业级本体操作系统 —— 本体定义世界，规则约束世界，大模型理解世界。
>
> An enterprise-grade Ontology OS for AI applications: turn implicit enterprise knowledge into an explicit, runnable, governed ontology.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-prototype-orange)
![Go](https://img.shields.io/badge/backend-Go_1.26-00ADD8)
![React](https://img.shields.io/badge/prototype-React_19-61dafb)

## 这是什么

entKnow（OntoOS）是一个对标 [Palantir Foundry Ontology](https://www.palantir.com/docs/foundry/ontology/overview/) 的开源实现探索：把散落在库表结构、指标口径、SOP 文档中的企业"隐式本体"，收敛为**显式、可运行、可治理**的本体，并在其上提供语义查询、推理、沙盘推演与行动能力，作为 AI Agent 的 **Context 边界与行动边界**。

整体分两个平面：**平台平面**（本仓库，Go 后端 + 前端）承担本体治理、评审发布、数据绑定、运行时与能力出口；**引擎平面**复用外部服务（语料提取与双时态事实账本 = Utopia，Rust，服务级对接，见 [docs/utopia-integration.md](docs/utopia-integration.md)）。

## 仓库结构

| 目录 | 说明 | 状态 |
|---|---|---|
| [prototype/](prototype/) | 高保真原型（React + antd + 共享 mock，给产品经理验证产品形态） | ≈60% 产品形态 |
| [backend/](backend/) | Go 生产后端（平台平面，主要开发区） | 骨架已立 |
| [frontend/](frontend/) | 生产前端（将从 prototype 演进） | 占位 |
| [docs/](docs/) | 文档：草稿需求（requirement/）、架构思维导图（architecture/）、Utopia 集成基线 | 持续维护 |
| [openspec/](openspec/) | SDD 需求管理：现行能力规格（specs/）+ 变更提案（changes/） | 流程已立 |

## 开发流程（SDD + TDD，强制）

本仓库主要由 AI 编码代理开发，**全部规约见 [AGENTS.md](AGENTS.md)**，核心流程：

```
草稿需求(docs/requirement/) → openspec 提案(proposal/design/specs/tasks)
→ 用户确认 → 按 tasks 开发(TDD 红→绿) → 测试全绿 → 归档规格 → git commit
```

编码约束采用 [ponytail](https://github.com/DietrichGebert/ponytail) 模式：最简可行、YAGNI、标准库优先、无第二实现不建接口。

## 快速开始

**后端**（Go 1.26+）：

```bash
cd backend
go run ./cmd/entknow        # → http://localhost:8080/healthz
make test                   # 全量测试
```

**原型**（Node ≥ 20.19）：

```bash
cd prototype
npm install && npm run dev  # → http://localhost:5188
```

原型内置三种演示角色（张三·数据架构师 / 李四·供应链总监 / 王五·业务专家，顶栏可切换），九大模块 M1 数据资产 → M9 系统管理，示例场景为供应链「订单交付风险」。

## 架构

![entKnow 架构思维导图](docs/architecture/architecture-mindmap.png)

（Mermaid 源文件：[architecture-mindmap.mmd](docs/architecture/architecture-mindmap.mmd)）

## 核心理念

- **语义元素 + 动力元素**：对象 / 关系 / 属性描述"世界是什么"；Action / 规则 / 状态机描述"世界如何变化"
- **关系是一等公民**：Edge 自带属性、时序与聚合——业务问题发生在关系上，不在实体上
- **推演不落地，行动才改世界**：沙盘推演生产隔离，经过治理的行动才回写
- **最小可行本体**：从真实问题生长（4 对象 + 3 关系 + 2 Action 跑通闭环）
- **手工建模是核心价值，AI 是设计伙伴**：LLM 生成 + 符号校验 + 专家确认入库

## 参与贡献

欢迎通过 Issue 与 PR 参与。提交前请读 [AGENTS.md](AGENTS.md) 并遵守 SDD 流程与测试门槛。

## 许可证

[Apache-2.0](LICENSE)
