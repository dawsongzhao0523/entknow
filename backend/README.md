# entKnow Backend（Go）

entKnow OntoOS 的平台平面后端：本体治理、评审发布、数据绑定、运行时与能力出口。**本目录是仓库的主要开发区。**

## 原则（强约束，详见根 [AGENTS.md](../AGENTS.md)）

- **ponytail 模式**：最简可行、YAGNI、标准库优先；第三方依赖默认禁止，引入须在 openspec 提案中说明理由
- **SDD**：任何生产代码变更前必须有已确认的 openspec 提案（见 [../openspec/](../openspec/)）
- **TDD**：行为变更必须有测试；DoD = `go test ./... -count=1` 全绿 + `go vet ./...` 通过 + `gofmt -l .` 无输出

## 快速开始

```bash
go run ./cmd/entknow          # 启动，默认 :8080
curl localhost:8080/healthz   # {"status":"ok"}

make test                     # 全量测试
make vet                      # 静态检查
```

## 目录结构

```
├── cmd/entknow/main.go     # 入口：仅装配与启动
├── internal/server/        # 根路由与 endpoint（能力随提案挂载）
└── Makefile                # run / build / test / vet / fmt
```

## 与引擎平面的边界

语料提取、双时态事实账本等引擎能力复用外部 Utopia 服务（Rust），只经 REST / MCP / RDF 三边界对接，适配层统一收敛在 `internal/utopiaadapter`（按提案落地），上层代码不感知 Utopia API 形状。基线设计：[../docs/utopia-integration.md](../docs/utopia-integration.md)。
