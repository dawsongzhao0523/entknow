# entKnow 生产前端：构建静态产物后由 nginx 提供服务，/api 反代到 backend 容器
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci 的 lockfile 在 macOS 生成时缺 linux 原生 binding（npm/cli#4828），容器内需重新解析
RUN rm -f package-lock.json && npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
