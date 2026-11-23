# syntax=docker/dockerfile:1

# ---------- 构建 ----------
# 产物是纯静态文件，在构建机原生架构上编译即可，配合双架构 nginx 镜像实现 amd64 + arm64
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS build
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- 运行 ----------
FROM nginx:1.27-alpine
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/build /usr/share/nginx/html
EXPOSE 80
