# AGENTS.md — entKnow 仓库工作规约

本仓库由 AI 编码代理（vibe coding）为主要开发者。**任何代理（或人）在本仓库工作前必须先读完本文件。**

## 项目定位

entKnow是企业级本体操作系统：把企业隐式知识收敛为显式、可运行、可治理的本体，对标 Palantir Foundry Ontology。整体分两个平面：

- **平台平面**（本仓库 `backend/`，Go）：本体治理、评审发布、数据绑定、运行时、能力出口；
- **引擎平面**（外部服务，不自研）：语料提取与双时态事实账本复用 Utopia（Rust），**只走 REST / MCP / RDF export 三个官方边界，禁止依赖其内部 crate 或私有协议**，见 `docs/utopia-integration.md`。

## 目录结构

```
├── prototype/          # 高保真原型（React + antd + 共享 mock，产品经理用，≈60% 产品形态）
├── backend/            # Go 后端（生产代码，本仓库的主要开发区）
├── frontend/           # 生产前端（规划中，将从 prototype 演进，暂为占位）
├── docs/
│   ├── requirement/    # 草稿需求（openspec 提案的输入，命名：YYYYMMDD需求描述.md）
│   ├── architecture/   # 产品架构思维导图（Mermaid 源文件 + 渲染图）
│   └── utopia-integration.md  # Utopia 集成基线（已评审）
├── openspec/           # SDD 规格（specs/ 现行能力规格；changes/ 变更提案四件套）
├── AGENTS.md           # 本文件
└── README.md           # 仓库总览
```

## 一、编码约束：Ponytail 模式（强制）

本仓库强制采用 [ponytail](https://github.com/DietrichGebert/ponytail)（"lazy senior dev"）编码风格。写每一行代码前自问：**一位资深老工程师会怎么写？**

1. **最简可行**：选择能工作的最简单、最短方案。浏览器/标准库已有的，绝不自己写或引第三方（例：`<input type="date">` 好过一个日期选择器库）。
2. **YAGNI**：只实现提案里明确要求的行为。没被要求的抽象、配置项、参数、边界分支，一律不写。
3. **标准库优先**（Go 尤其如此）：HTTP 用 `net/http`，测试用 `testing`，日志用 `log/slog`。**引入任何第三方依赖必须在 openspec 提案中说明理由并经确认**；web 框架、ORM、依赖注入框架默认禁止。
4. **无第二个实现不建接口**：不要为"将来可能的可替换性"提前抽接口；等到第二个实现出现时再抽。
5. **删代码优先于加代码**：修问题时先看能否删掉出问题的部分，而不是再包一层。
6. **不过度防御**：不写永远不会触发的校验、不捕获无法处理的错误、不吞错。错误要么处理、要么向上抛并带上下文（`fmt.Errorf("...: %w", err)`）。
7. **文件要小**：单文件不超过 500 行，超过就按职责拆分。

## 二、SDD 强制流程（禁止跳过）

**任何代码变更（backend / prototype / frontend）必须走完以下流程：**

1. **草稿需求** → 写入 `docs/requirement/YYYYMMDD需求描述.md`（已存在则覆盖更新）
2. **需求分析** → 与用户对齐后覆盖更新草稿文档
3. **提交提案** → 在 `openspec/changes/<change-id>/` 创建四件套：`proposal.md`（背景/目标/范围）、`design.md`（技术方案）、`specs/<capability>/spec.md`（规格增量）、`tasks.md`（任务清单，checkbox）
4. **确认 OK** → 用户 review 提案并明确确认
5. **开始开发** → 按 `tasks.md` 逐项实现，遵循 TDD（见第三节）
6. **通过测试** → 全量测试绿
7. **归档提案** → 将变更目录中的 specs 合入 `openspec/specs/<capability>/spec.md`，变更目录移入归档
8. **提交代码** → Git commit，消息关联 change-id

流程红线（违反任何一条即返工）：

- **禁止跳过提案写代码**：没有已确认的提案，不得创建/修改任何生产代码
- **禁止跳过提案写代码**：没有已确认的提案，不得创建/修改任何生产代码
- **UI 原型先行**：任何带 UI 界面的能力，必须先在 `prototype/` 中实现并通过产品确认，才能进入 `backend/` / `frontend/` 的真实开发；提案涉及 UI 的必须注明原型落地情况
- **提案必须完整**：proposal、design、specs、tasks 四个文件齐备才能进入开发
- **代码与规格一致**：实现必须与 specs 中的 Requirements 一致；规格变了代码要跟，代码变了规格要跟
- **完成才能归档**：所有 tasks 勾完且测试全绿才能 archive
- **归档后才能提交**：未归档的变更不得 git commit

例外：纯文档、注释、格式化改动可不走 openspec，但提交说明须注明「无行为变更」。

## 三、TDD 纪律（分级规则）

- **修 bug**：先写复现测试 → 确认失败（红）→ 修复 → 确认通过（绿）。修复提交必须包含回归测试。
- **新功能**：实现前或同步写验收测试；新行为必须有测试覆盖。
- **重构**：动手前现有测试全绿，完成后依然全绿。
- **豁免**：纯文档/配置文案不写测试，提交说明声明「无行为变更」。

### Definition of Done

1. 变更相关测试全部通过，且全量套件通过：
   - 后端：`cd backend && go test ./...`（提交前另跑 `go vet ./...`）
   - 原型：`cd prototype && npm run lint`
2. 任务总结中报告测试证据（跑了什么命令、什么结果）；修 bug 展示红→绿过程。
3. Go 代码过 `gofmt`（CI 以 `gofmt -l .` 输出为空为准）。

### 测试写法

- Go 测试与被测代码同包（`xxx_test.go`），用标准库 `testing` + `httptest`；禁止依赖真实数据库或外部服务，边界用接口注入 fake。
- 断言用户可见行为（HTTP 状态码、响应体、副作用），不断言实现细节。
- 每个测试必须能独立运行（`go test ./... -count=1` 串行也全绿）。

## 四、任务拆分约束

- 大需求必须拆成小任务，每个 task：**涉及文件 ≤ 10 个**、**单文件 ≤ 500 行**、**自带完整单元测试**。
- 一个 task 只做一件事；tasks.md 中每个 task 注明要改的文件。
- 涉及数据库 schema 的 task 必须注明是否需要 migration，且 migration 幂等。

## 五、约定

### 命名与注释

- Go：包名小写单词；导出符号写 doc comment；业务逻辑注释用中文。
- 原型（TS/React）：沿用现有代码风格。

### Git 提交

Conventional Commits + 中文描述，scope 用目录名：

```
feat(server): 新增本体注册中心查询接口
fix(sync): 修复 CDC 任务断点续传丢事件问题
docs(specs): 归档 asset-binding 提案规格
chore(repo): 无行为变更，调整构建脚本
```

### 关键工程约束

- **所有写操作幂等**：数据同步、绑定、发布均需幂等键或 upsert 语义，重复执行不产生重复数据。
- **Utopia 对接只经 `utopia-adapter`**：上层代码不得直接感知 Utopia API 形状。
- **失败不阻塞批次**：批处理中单条失败记录日志继续，整体可重跑。
- **隐私红线**：任何真实人名、公司内网地址、内部邮箱不得进入代码与 mock 数据；示例用张三/李四与 `192.0.2.x` 文档地址段。

## 七、开发环境（Docker 统一）

本地依赖（PostgreSQL / Redis / MinIO）与前后端容器**统一用根目录 `docker-compose.yml` 管理**，禁止在本机散装安装：

```bash
make infra    # 一键启动开发依赖（postgres/redis/minio + 默认 bucket）
make app      # 一键启动全栈（依赖 + backend + prototype 容器）
make down     # 停止全部
make clean    # 停止并删除数据卷（慎用，清空本地数据）
```

日常开发：`make infra` 起依赖，后端用 `cd backend && go run ./cmd/entknow`、原型用 `cd prototype && npm run dev` 本地热更调试；容器化的 backend/prototype（`make app`）用于整体联调与验收演示。

连接默认值（host 端口统一用 2+标准端口 段，避免与本机其他栈冲突；可用环境变量覆盖，见 `docker-compose.yml`）：

| 组件 | 地址 | 凭据 |
|---|---|---|
| PostgreSQL | `localhost:25432`，库 `entknow` | `entknow / entknow` |
| Redis | `localhost:26379` | 无 |
| MinIO | `localhost:29000`（控制台 `:29001`） | `entknow / entknow123`，默认 bucket `entknow` |
| backend（容器） | `localhost:28080` | — |
| prototype（容器） | `localhost:25188` | — |

## 八、给代理的检查清单（每次会话开始）

1. 读本文件 + `openspec/specs/` 了解现行能力规格。
2. 有新需求？→ 走 SDD 流程，从 `docs/requirement/` 草稿开始。
3. 要改代码？→ 找到对应已确认的 change，按 tasks.md 执行；没有就先提案。
4. 声称完成前？→ DoD 三条全部满足并在总结中给出证据。
