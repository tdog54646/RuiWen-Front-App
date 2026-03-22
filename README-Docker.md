# Ruiwen Front Docker 部署说明（Nginx + Next.js）

本文档用于将 `ruiwen-front-app` 通过 Docker 部署到服务器，架构为：

- `app`：Next.js 生产服务（`next start`，容器内端口 `3000`）
- `nginx`：反向代理（对外端口 `80`）

## 1. 前置要求

- 已安装 Docker
- 已安装 Docker Compose（Docker Desktop 一般自带）

可通过以下命令检查：

```bash
docker -v
docker compose version
```

## 2. 项目内相关文件

以下文件已用于 Docker 部署：

- `Dockerfile`：构建 Next.js 生产镜像（多阶段构建）
- `docker-compose.yml`：编排 `app` 与 `nginx` 两个服务
- `nginx/default.conf`：Nginx 反向代理配置
- `.env.example`：环境变量示例
- `.dockerignore`：减少构建上下文体积

## 3. 配置环境变量

在项目根目录（即 `ruiwen-front-app`）创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
NEXT_PUBLIC_API_BASE_URL=http://your-api-host:8080
```

### 如何填写 `NEXT_PUBLIC_API_BASE_URL`

- 后端在宿主机：`http://host.docker.internal:8080`
- 后端是同一个 `docker-compose` 中的服务：`http://backend:8080`
- 后端是远程服务器：`http://<远程IP或域名>:8080`

> 注意：`NEXT_PUBLIC_*` 通常会参与前端构建，请在 `docker compose up --build` 前配置好。

## 4. 构建并启动

在 `ruiwen-front-app` 目录执行：

```bash
docker compose up -d --build
```

启动后访问：

- `http://localhost`

## 5. 常用运维命令

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

停止并删除容器（保留镜像）：

```bash
docker compose down
```

停止并删除容器 + 数据卷：

```bash
docker compose down -v
```

## 6. 更新版本流程

代码更新后，重新构建并启动：

```bash
docker compose up -d --build
```

如需清理无用镜像：

```bash
docker image prune -f
```

## 7. 端口与网络说明

- 外部访问端口：`80`（Nginx）
- 内部服务端口：`3000`（Next.js，仅容器网络内可见）

`docker-compose.yml` 中 `app` 仅 `expose: 3000`，不会直接暴露到宿主机；对外统一由 Nginx 转发。

## 8. 常见问题

### 8.1 页面能打开，但接口请求失败

优先检查：

- `.env` 中 `NEXT_PUBLIC_API_BASE_URL` 是否正确
- 后端服务是否可达（防火墙/端口/跨机器网络）
- 重建是否执行：`docker compose up -d --build`

### 8.2 修改了 Nginx 配置但未生效

执行：

```bash
docker compose restart nginx
```

若仍未生效，可重建：

```bash
docker compose up -d --build nginx
```

### 8.3 80 端口被占用

将 `docker-compose.yml` 中：

```yaml
ports:
  - "80:80"
```

改为例如：

```yaml
ports:
  - "8080:80"
```

然后访问 `http://localhost:8080`。

## 9. 生产环境建议

- 使用域名 + HTTPS（可接入 Certbot 或网关层证书）
- 配置日志采集与监控告警
- 对 `.env` 中敏感变量使用安全的密钥管理方案
- 发布前先在预发环境进行回归测试
