# Campus Logistics 后端接口文档

本文档基于当前 Go + Gin 后端代码整理（不包含数据库 SQL 细节）。

## 1. 基本信息

- **Base URL**：`http://localhost:<port>`（端口来自 `configs/config.yaml` 的 `server.port`，常见为 `8080`）
- **API 前缀**：`/api/v1`
- **数据格式**：请求/响应均为 JSON（除 GET 的 query 参数外）
- **认证**：JWT（`Authorization: Bearer <token>`），按角色隔离数据访问（student / courier / admin）

## 2. 通用响应约定

### 成功（典型）

```json
{
  "message": "success",
  "data": {}
}
```

### 失败（典型）

```json
{
  "error": "..."
}
```

> 注意：部分接口在失败时会返回固定文案（例如取件失败不返回底层错误细节）。

---

## 3. 健康检查

### 3.1 GET `/ping`

用于快速判断服务可达。

- **请求**：无
- **成功响应**：`200`

```json
{
  "message": "pong",
  "db_status": "connected"
}
```

---

## 4. 认证（JWT）

### 4.1 Authorization Header

除 `/ping` 与 `/api/v1/auth/*` 外，其余接口均需要携带：

```
Authorization: Bearer <access_token>
```

JWT 密钥来源（任选其一）：

- 环境变量：`JWT_SECRET`
- 配置文件：`configs/config.yaml` 的 `jwt.secret`

### 4.2 管理员登录

#### POST `/api/v1/auth/admin/login`

- **Content-Type**：`application/json`

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `username` | string | 是 | 管理员用户名 |
| `password` | string | 是 | 密码（当前 seed 可能为明文 `secret`，也支持 bcrypt hash） |

成功响应：`200`

```json
{
  "message": "success",
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "role": "admin"
  }
}
```

失败响应：`401`

```json
{ "error": "invalid credentials" }
```

示例：

```bash
curl -sS -X POST "http://localhost:8080/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

### 4.3 学生登录

#### POST `/api/v1/auth/student/login`

- **Content-Type**：`application/json`

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `phone` | string | 是 | 学生手机号（身份标识） |
| `name` | string | 否 | 学生姓名（若用户不存在会创建，默认“同学”） |

成功响应：`200`（同管理员登录）

示例：

```bash
curl -sS -X POST "http://localhost:8080/api/v1/auth/student/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","name":"张三"}'
```

### 4.4 快递员登录

#### POST `/api/v1/auth/courier/login`

- **Content-Type**：`application/json`

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `courier_code` | string | 是 | 快递公司代码（如 `SF`/`JD`/`EMS`） |

成功响应：`200`（同管理员登录）

示例：

```bash
curl -sS -X POST "http://localhost:8080/api/v1/auth/courier/login" \
  -H "Content-Type: application/json" \
  -d '{"courier_code":"SF"}'
```

---

## 5. 快递员接口（courier）

### 5.1 包裹入库

#### POST `/api/v1/inbound`

- **权限**：`courier`
- **Header**：`Authorization: Bearer <token>`

- **Content-Type**：`application/json`

**请求体**（`InboundRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `tracking_number` | string | 是 | 运单号（唯一） |
| `phone` | string | 是 | 收件人手机号（用于定位用户） |
| `courier_code` | string | 否 | 已废弃：实际使用 JWT 中的快递公司身份 |
| `user_name` | string | 否 | 入库操作员名称 |

**成功响应**：`200`

```json
{
  "message": "success",
  "data": {
    "tracking_number": "SF10001",
    "status": "stored"
  }
}
```

**失败响应**：

- `400`：JSON 解析/字段类型不匹配/缺少必填字段

```json
{ "error": "入库失败 ..." }
```

- `500`：入库流程执行失败（例如数据库约束冲突、存储过程异常等）

```json
{ "error": "入库失败: ..." }
```

**示例**：

```bash
curl -sS -X POST "http://localhost:8080/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COURIER_TOKEN" \
  -d '{
    "tracking_number":"SF10001",
    "phone":"13800138000",
    "user_name":"operatorA"
  }'
```

---

## 6. 学生接口（student）

### 6.1 包裹取件

#### POST `/api/v1/pickup`

- **权限**：`student`
- **Header**：`Authorization: Bearer <token>`

- **Content-Type**：`application/json`

**请求体**（`PickupRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `tracking_number` | string | 是 | 运单号 |
| `pickup_code` | string | 是 | 取件码 |

**业务规则（来自实现）**：

- 仅当包裹当前 `status = 'stored'` 且 `pickup_code` 匹配，且该包裹 `user_id` 属于当前登录学生，才会成功更新为 `picked_up`。

**成功响应**：`200`

```json
{
  "message": "success",
  "data": {
    "tracking_number": "SF10001",
    "status": "picked_up",
    "action": "completed"
  }
}
```

**失败响应**：

- `400`：JSON 解析/缺少字段

```json
{ "error": "参数错误：..." }
```

- `409`：取件码错误、包裹不存在、包裹已取走或状态不允许取件

```json
{ "error": "取件失败，请检查取件码或包裹是否已取出" }
```

**示例**：

```bash
curl -sS -X POST "http://localhost:8080/api/v1/pickup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{"tracking_number":"SF10001","pickup_code":"123456"}'
```

---

### 6.2 查询我的包裹（分页）

#### GET `/api/v1/parcels`

- **权限**：`student`
- **Header**：`Authorization: Bearer <token>`

**Query 参数**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---:|---|
| `page` | int | 否 | 1 | 页码（<1 会被纠正为 1） |
| `page_size` | int | 否 | 20 | 每页数量（<=0 或 >100 会被纠正为 20） |

**成功响应**：`200`

- `data` 为学生视角包裹列表（`ParcelViewStudent`）。

```json
{
  "message": "success",
  "data": [
    {
      "tracking_number": "SF10001",
      "courier_name": "顺丰",
      "pickup_code": "123456",
      "shelf_zone": "A",
      "status": "stored",
      "updated_at": "2025-12-20T12:34:56Z"
    }
  ],
  "count": 1,
  "page": 1,
  "page_size": 20
}
```

**失败响应**：

- `500`：查询失败

```json
{ "error": "查询失败" }
```

**示例**：

```bash
curl -sS "http://localhost:8080/api/v1/parcels?page=1&page_size=20" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

---

## 7. 快递员任务（courier）

### 7.1 查看我的任务列表（分页）

#### GET `/api/v1/courier/tasks`

- **权限**：`courier`
- **Header**：`Authorization: Bearer <token>`

Query 参数：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---:|---|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（<=0 或 >100 会被纠正为 20） |

成功响应：`200`

```json
{
  "message": "success",
  "data": [
    {
      "tracking_number": "SF10001",
      "phone": "13800138000",
      "status": "stored",
      "created_at": "2025-12-20T12:34:56Z"
    }
  ],
  "count": 1,
  "page": 1,
  "page_size": 20
}
```

示例：

```bash
curl -sS "http://localhost:8080/api/v1/courier/tasks?page=1&page_size=20" \
  -H "Authorization: Bearer $COURIER_TOKEN"
```

---

## 8. 管理员接口（admin）

管理员接口统一前缀：`/api/v1/admin`（需要 `admin` token）

### 5.1 仪表盘统计

#### GET `/api/v1/admin/dashboard`

- **权限**：`admin`
- **Header**：`Authorization: Bearer <token>`

**成功响应**：`200`

```json
{
  "message": "success",
  "data": {
    "waiting_pickup": 3,
    "full_shelves": 0,
    "today_ops": 12
  }
}
```

**失败响应**：

- `500`

```json
{ "error": "failed to load dashboard" }
```

**示例**：

```bash
curl -sS "http://localhost:8080/api/v1/admin/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 5.2 查询滞留包裹（分页）

#### GET `/api/v1/admin/parcels/retention`

- **权限**：`admin`
- **Header**：`Authorization: Bearer <token>`

**Query 参数**：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---:|---|
| `days` | int | 否 | 7 | 滞留阈值（<=0 会被纠正为 7） |
| `page` | int | 否 | 1 | 页码（<1 会被纠正为 1） |
| `page_size` | int | 否 | 20 | 每页数量（<=0 或 >100 会被纠正为 20） |

**成功响应**：`200`

```json
{
  "message": "success",
  "data": [],
  "count": 0,
  "page": 1,
  "page_size": 20,
  "days": 7
}
```

**失败响应**：

- `500`

```json
{ "error": "failed to query retention parcels" }
```

**示例**：

```bash
curl -sS "http://localhost:8080/api/v1/admin/parcels/retention?days=7&page=1&page_size=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 5.3 更新包裹状态

#### POST `/api/v1/admin/parcels/:tracking_number/status`

- **权限**：`admin`
- **Header**：`Authorization: Bearer <token>`

- **Content-Type**：`application/json`

**Path 参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `tracking_number` | string | 是 | 运单号 |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `status` | string | 是 | 允许值：`pending` / `returned` / `exception` / `stored` |

**成功响应**：`200`

```json
{
  "message": "success",
  "tracking_number": "JD20002",
  "status": "exception"
}
```

**失败响应**：

- `400`：缺少运单号

```json
{ "error": "tracking_number is required" }
```

- `400`：body 不合法

```json
{ "error": "invalid status payload" }
```

- `400`：状态值不在允许范围

```json
{ "error": "invalid status: xxx" }
```

- `400`：包裹不存在（数据库更新 0 行）

```json
{ "error": "parcel not found" }
```

**示例**：

```bash
curl -sS -X POST "http://localhost:8080/api/v1/admin/parcels/JD20002/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"exception"}'
```
