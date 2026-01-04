# Campus Logistics

Campus Logistics 是一个基于 Go + Gin 的校园快递管理后端，配合 React + Fluent UI 前端，并提供 Docker Compose 一键启动（Postgres + 后端 + Nginx 前端）。

## 功能特性
- 三角色认证与授权：学生、快递员、管理员（JWT + 角色校验）。
- 学生：查看我的包裹、取件、取件码校验。
- 快递员：包裹入库、查看个人任务记录。
- 管理员：仪表盘统计、滞留件查询、包裹状态更新。
- 完整 Docker 化：Postgres、后端、前端（Nginx 反代）一键编排。

## 技术栈
- 后端：Go (Gin)、JWT、Viper、Postgres
- 前端：React + Vite、Fluent UI v9、React Router
- 基础设施：Docker Compose、Nginx、Postgres

## 目录结构
- [cmd/server/main.go](cmd/server/main.go) — 后端入口
- [internal/](internal) — handler、service、repository、middleware
- [configs/config.yaml](configs/config.yaml) — 本地默认配置
- [configs/config.docker.yaml](configs/config.docker.yaml) — Docker 配置
- [frontend/](frontend) — React 前端源码
- [deployment/backend.Dockerfile](deployment/backend.Dockerfile) — 后端镜像
- [deployment/frontend.Dockerfile](deployment/frontend.Dockerfile) — 前端镜像
- [deployment/nginx.docker.conf](deployment/nginx.docker.conf) — Nginx 反代配置
- [docker-compose.yml](docker-compose.yml) — 编排文件
- [init_full_schema.sql](init_full_schema.sql) — 数据库初始化脚本

## 环境变量
- 在根目录创建 `.env`（已在 .gitignore 中忽略），可参考 [.env.example](.env.example)。
- 关键变量：
  - `JWT_SECRET`：JWT 签名密钥（必填）。
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD`：管理员登录凭据（可选，设置后优先于数据库，密码支持 bcrypt）。
- Docker Compose 会把 `.env` 注入后端容器。

## 快速开始
### 情况 A：从未compose过，第一次使用
```bash
# 1) 准备 .env
cp .env.example .env

# 2) 准备 HTTPS 证书
mkdir -p deployment/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deployment/certs/server.key \
  -out deployment/certs/server.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=CampusLogistics/OU=IT/CN=localhost"

# 3) 构建并后台启动
sudo docker-compose up -d --build

# 4) 查看状态或日志
sudo docker-compose ps
sudo docker-compose logs -f backend
```

### 情况 B：之前 compose 过，关闭后想重启
根据你“关闭”的方式不同，使用不同命令：

```bash
#如果之前执行的是 docker-compose stop
sudo docker-compose start

#如果之前执行的是 docker-compose down
sudo docker-compose up -d

#修改代码后
sudo docker-compose up -d --build

#查看状态或日志
sudo docker-compose ps
sudo docker-compose logs -f
```

### 停止与清理
```bash
# 停止但不删除容器
sudo docker-compose stop

# 停止并删除容器
sudo docker-compose down

# 彻底清空
sudo docker-compose down -v
```
启动成功后，通过 `https://localhost` 访问前端（自签证书会有浏览器提醒，选择继续访问）。

## 本地开发（不使用 Docker）
### 后端
```bash
cp configs/config.yaml configs/config.local.yaml   

go mod tidy
go run cmd/server/main.go
```
默认监听 `:8080`。

### 前端
```bash
cd frontend
npm install
npm run dev
```
默认 Vite 开发服务器 `:5173`，已在 [vite.config.js](frontend/vite.config.js) 里设置 `/api` 代理到 `http://localhost:8080`。

## 数据库
- 初始化：Compose 会自动执行 [init_full_schema.sql](init_full_schema.sql)。
- 手动测试脚本：
  - [insert_test_data.sh](insert_test_data.sh)
  - [query_test_data.sh](query_test_data.sh)

