# entKnow 后端：多阶段构建，产物为静态二进制（CGO 关闭）
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/entknow ./cmd/entknow

FROM alpine:3.21
COPY --from=build /out/entknow /usr/local/bin/entknow
EXPOSE 8080
ENTRYPOINT ["entknow"]
