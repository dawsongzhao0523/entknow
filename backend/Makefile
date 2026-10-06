.PHONY: run build test vet fmt fmt-check

run: ## 本地启动（默认 :8080）
	go run ./cmd/entknow

build: ## 编译到 bin/entknow
	go build -o bin/entknow ./cmd/entknow

test: ## 全量测试（DoD 门槛）
	go test ./... -count=1

vet: ## 静态检查
	go vet ./...

fmt: ## 格式化
	gofmt -w .

fmt-check: ## CI 格式检查（无输出即通过）
	@gofmt -l . && [ -z "$$(gofmt -l .)" ]
