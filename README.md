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

## 目录结构（节选）
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

## 快速开始（推荐：Docker Compose）
```bash
# 构建并后台启动（首次或代码更新后建议 --build）
sudo docker-compose up -d --build

# 查看状态
sudo docker-compose ps

# 查看日志（全部 / 指定服务）
sudo docker-compose logs -f
sudo docker-compose logs -f backend

# 停止并清理容器
sudo docker-compose down
# 如需连同数据库数据一起清理（慎用）
sudo docker-compose down -v
```
启动成功后，通过 `https://localhost` 访问前端（自签证书会有浏览器提醒，选择继续访问）。

## 本地开发（不使用 Docker）
### 后端
```bash
# 依赖：Go 1.25
cp configs/config.yaml configs/config.local.yaml   # 如需自定义
# 可在 .env 设置 JWT_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD

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

## 认证与角色
- 管理员登录：
  - 若设置了 `ADMIN_USERNAME`/`ADMIN_PASSWORD`：使用该凭据（密码可为明文或 bcrypt）。
  - 否则使用数据库 `admins` 表中的账号。
- 快递员：使用快递公司代码登录（例 `SF` / `JD` / `EMS`）。
- 学生：使用手机号登录，未注册会自动创建用户。

## 生产建议
- 将 `GIN_MODE` 设为 `release`。
- 提供正式证书（替换 [deployment/certs/](deployment/certs) 中的自签证书）。
- 使用强随机的 `JWT_SECRET`，并通过环境变量注入。
- 配置防火墙或云安全组，仅暴露 443。

## 常用命令速查
- 重建并启动：`sudo docker-compose up -d --build`
- 查看日志：`sudo docker-compose logs -f backend`
- 停止服务：`sudo docker-compose down`
- 清理数据：`sudo docker-compose down -v` (慎用)

如有疑问或需要更多使用说明，可以在 `docs/` 目录内继续补充。