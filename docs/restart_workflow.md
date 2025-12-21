# 修改后重启流程（Docker Compose）

本文档用于指导：当你修改**前端 / 后端 / 数据库**后，如何用 Docker Compose 完整重启并验证服务。

> 约定：以下命令都在项目根目录（与 `docker-compose.yml` 同级）执行。

## 0. 常用检查命令

- 查看容器状态

```bash
sudo docker-compose ps
```

- 查看日志（排错首选）

```bash
sudo docker-compose logs -f
```

- 查看单个服务日志

```bash
sudo docker-compose logs -f backend
sudo docker-compose logs -f postgres
sudo docker-compose logs -f frontend
```

- 快速验证（自签名证书用 `-k`）

```bash
curl -k https://localhost/
curl -k https://localhost/ping
```

## 1. 完整重启（最稳妥，适合不想区分改动类型）

适用于：你不确定改动影响范围，或者想“清干净再起来”。

```bash
# 1) 停止并移除容器（不删除数据库数据）
sudo docker-compose down

# 2) 重新构建并后台启动全部服务
sudo docker-compose up -d --build

# 3) 查看状态
sudo docker-compose ps
```

> 注意：`down` 会释放 443 端口；数据库数据默认保留（因为使用了 volume）。

## 2. 只修改前端（React/Fluent UI）

适用于：你改了 `frontend/src/**`、前端依赖、或页面逻辑。

因为我们使用的是“前端多阶段构建 -> Nginx 静态托管”，所以要重新构建 `frontend` 镜像。

```bash
# 重新构建并启动前端容器
sudo docker-compose up -d --build frontend

# 查看前端日志（如白屏/资源 404）
sudo docker-compose logs -f frontend
```

可选：如果你只是想在本机快速开发（无需 Docker），也可以在 `frontend/` 下运行：

```bash
cd frontend
npm install
npm run dev
```

## 3. 只修改后端（Go/Gin）

适用于：你改了 `internal/**`、`cmd/server/**`、或 Go 依赖。

```bash
# 重新构建并启动后端容器
sudo docker-compose up -d --build backend

# 查看后端日志
sudo docker-compose logs -f backend
```

如果你改动了 Go 依赖（如新增包），建议顺手执行：

```bash
go mod tidy
```

## 4. 修改数据库：数据变化 / 表结构变化 / 初始化脚本变化

### 4.1 只改了业务数据（不改表结构）

如果你只是“插入/更新/删除数据”，通常**不需要重建 volume**。你可以进入数据库容器手工执行 SQL。

```bash
sudo docker-compose exec postgres psql -U campus_user -d campus_logistics
```

### 4.2 改了表结构或 `init_full_schema.sql`

重点：`postgres` 的初始化脚本只会在**数据目录为空**时执行。

- 如果你修改了 `init_full_schema.sql`，但数据库 volume 里已经有数据，那么**不会自动重新初始化**。

你有两种选择：

**方案 A（推荐用于开发/测试）：直接清库重建（会丢数据）**

```bash
# 停止并删除容器 + 删除数据库卷（会清空所有数据库数据）
sudo docker-compose down -v

# 重新构建并启动（会重新执行 init_full_schema.sql）
sudo docker-compose up -d --build
```

**方案 B（保留数据）：手动执行迁移 SQL**

```bash
# 进入数据库执行 ALTER / CREATE / UPDATE 等迁移语句
sudo docker-compose exec postgres psql -U campus_user -d campus_logistics

# 也可以执行一个本地 SQL 文件（示例：migrations/xxx.sql）
# cat migrations/xxx.sql | sudo docker-compose exec -T postgres psql -U campus_user -d campus_logistics
```

### 4.3 修改数据库连接配置 / 环境变量

- 修改 `.env`（如 JWT_SECRET、ADMIN_USERNAME/ADMIN_PASSWORD）后：

```bash
sudo docker-compose up -d --build backend
```

- 修改 Docker 专用配置 `configs/config.docker.yaml` 后：

```bash
sudo docker-compose up -d --build backend
```

## 5. 常见故障排查

### 5.1 443 端口被占用

```bash
sudo lsof -i :443
```

如果是 Docker 的 `frontend` 容器占用，执行：

```bash
sudo docker-compose down
```

### 5.2 访问 https://localhost 502/504

通常是后端没起来或健康检查未通过：

```bash
sudo docker-compose ps
sudo docker-compose logs -f backend
```

### 5.3 数据库连不上

```bash
sudo docker-compose logs -f postgres
sudo docker-compose exec postgres pg_isready -U campus_user -d campus_logistics
```

## 6. 推荐的日常习惯（减少踩坑）

- 改前端：`sudo docker-compose up -d --build frontend`
- 改后端：`sudo docker-compose up -d --build backend`
- 改 DB 初始化脚本：`sudo docker-compose down -v && sudo docker-compose up -d --build`
