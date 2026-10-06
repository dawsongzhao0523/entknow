# entKnow 后端：多阶段构建，产物为静态二进制（CGO 关闭）。
# 依赖已 vendor 进仓库（go mod vendor），构建无需外网。
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY vendor ./vendor
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOFLAGS=-mod=vendor go build -trimpath -ldflags="-s -w" -o /out/entknow ./cmd/entknow

FROM alpine:3.21
COPY --from=build /out/entknow /usr/local/bin/entknow
EXPOSE 8080
ENTRYPOINT ["entknow"]
