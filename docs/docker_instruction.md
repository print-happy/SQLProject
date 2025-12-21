### **配置清单**

1.  **docker-compose.yml**：位于项目根目录，定义了三个服务：
    *   `postgres`：数据库服务，数据持久化到 `pgdata` 卷，启动时自动执行 init_full_schema.sql。
    *   `backend`：Go 后端服务，自动连接到 `postgres` 容器。
    *   frontend：Nginx + React 前端服务，对外暴露 443 端口，反向代理到 `backend`。

2.  **deployment 目录**：
    *   `backend.Dockerfile`：后端的构建脚本。
    *   `frontend.Dockerfile`：前端的多阶段构建脚本（Node 构建 -> Nginx 运行）。
    *   `nginx.docker.conf`：专为 Docker 环境定制的 Nginx 配置。

3.  **config.docker.yaml**：专为 Docker 环境定制的后端配置（数据库 Host 指向 `postgres`）。

---

### **如何使用（操作指南）**

#### **1. 启动所有服务**
在项目根目录下运行：
```bash
# 构建并启动（后台运行）
sudo docker-compose up -d --build
```
*   `--build`：确保每次都重新构建镜像（如果修改了代码）。
*   `-d`：后台运行。
启动完成后，稍等几秒（等待数据库初始化），然后访问 `https://localhost` 即可。

#### **2. 查看运行状态**
```bash
sudo docker-compose ps
```
应该能看到三个服务 (`campus_db`, `campus_backend`, `campus_frontend`) 状态都是 `Up`。

#### **3. 查看日志**
如果遇到问题，可以查看日志：
```bash
# 查看所有日志
sudo docker-compose logs -f

# 查看特定服务日志（例如后端）
sudo docker-compose logs -f backend
```

#### **4. 停止服务**
```bash
# 停止并移除容器
sudo docker-compose down
```
*   这会释放 443 端口。
*   数据库的数据**不会丢失**（保存在 Docker Volume 中）。

#### **5. 清理数据（慎用）**
如果想重置数据库（清空所有数据）：
```bash
sudo docker-compose down -v
```
