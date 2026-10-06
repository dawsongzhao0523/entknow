# entKnow 根 Makefile —— Docker 一键开发环境（详见 AGENTS.md 第七节）
COMPOSE := docker compose

.PHONY: help infra app demo itest down logs ps clean

help: ## 列出所有目标
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-8s\033[0m %s\n", $$1, $$2}'

infra: ## 一键启动开发依赖（postgres/redis/minio + 默认 bucket）
	$(COMPOSE) up -d postgres redis minio minio-init
	@echo "→ postgres :25432 (entknow/entknow) · redis :26379 · minio :29000 控制台 :29001 (entknow/entknow123)"

app: ## 一键启动全栈容器（依赖 + backend :28080 + frontend :25190 + prototype :25188）
	$(COMPOSE) --profile app up -d --build

demo: ## 强制重置 demo 数据（TRUNCATE+INSERT，在运行中的 backend 容器执行）
	$(COMPOSE) exec -T backend entknow -seed

itest: ## 后端集成测试（需 make infra 在跑）
	cd backend && go test ./... -tags integration -count=1

down: ## 停止全部容器
	$(COMPOSE) --profile app down

logs: ## 跟随全部日志
	$(COMPOSE) --profile app logs -f

ps: ## 查看容器状态
	$(COMPOSE) --profile app ps

clean: ## 停止并删除数据卷（清空本地 postgres/redis/minio 数据，慎用）
	$(COMPOSE) --profile app down -v
