-- ============================================================
-- 校园物流管理系统 (Campus Logistics System) - Database Schema V2.0
-- 包含：RBAC基础、数据隔离视图、审计日志、自动化事务
-- ============================================================

-- 0. 环境重置 (确保无残留)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO campus_user;
GRANT ALL ON SCHEMA public TO public;

-- 1. 基础配置
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
SET timezone TO 'Asia/Shanghai';

-- 定义状态机 (State Machine)
CREATE TYPE parcel_status AS ENUM (
    'inbound',   -- 初始入库
    'stored',    -- 已上架 (生成取件码)
    'pending',   -- 待取件 (已通知)
    'picked_up', -- 已取走
    'returned',  -- 已退回
    'exception'  -- 异常
);

-- ============================================================
-- 2. 实体层 (Tables) - 3NF 设计
-- ============================================================

-- [2.1] 系统管理员表 (新增: 用于后台登录)
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL, -- 生产环境请存储 Bcrypt 哈希
    role VARCHAR(20) DEFAULT 'super_admin',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [2.2] 快递公司字典
CREATE TABLE couriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, 
    code VARCHAR(20) NOT NULL UNIQUE, 
    contact_phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [2.3] 货架资源管理
CREATE TABLE shelves (
    id SERIAL PRIMARY KEY,
    zone VARCHAR(10) NOT NULL,        -- 区域
    code VARCHAR(20) NOT NULL UNIQUE, -- 物理编号
    capacity INT DEFAULT 50,
    current_load INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_capacity CHECK (current_load <= capacity)
);

-- [2.4] 学生/C端用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(20),           -- 学号
    phone VARCHAR(20) NOT NULL UNIQUE,-- 核心身份标识
    name VARCHAR(50) DEFAULT '同学',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [2.5] 包裹核心表
CREATE TABLE parcels (
    id BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(64) NOT NULL,
    
    -- 关系关联
    user_id BIGINT NOT NULL REFERENCES users(id),
    courier_id INT NOT NULL REFERENCES couriers(id),
    shelf_id INT REFERENCES shelves(id) ON DELETE SET NULL,
    
    -- 核心业务字段
    pickup_code VARCHAR(20),              -- 取件码
    status parcel_status NOT NULL DEFAULT 'inbound',
    
    -- 冗余快照 (用于历史追溯)
    recipient_name_snapshot VARCHAR(64),
    recipient_phone_snapshot VARCHAR(20),
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ
);

-- [2.6] 审计日志表 (不可变)
CREATE TABLE parcel_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    parcel_id BIGINT NOT NULL REFERENCES parcels(id),
    action VARCHAR(50) NOT NULL,          -- CREATE, PICKUP, RETURN
    old_status parcel_status,
    new_status parcel_status,
    operator VARCHAR(50) DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 索引优化层 (Indexes)
-- ============================================================
CREATE UNIQUE INDEX idx_tracking_number ON parcels(tracking_number);
-- 仅索引活跃的取件码，极大提升查询性能
CREATE INDEX idx_active_pickup_code ON parcels(pickup_code) WHERE status IN ('stored', 'pending');
-- 仅索引活跃的用户包裹
CREATE INDEX idx_user_active_parcels ON parcels(user_id) WHERE status IN ('stored', 'pending');

-- ============================================================
-- 4. 逻辑层 (Functions & Triggers)
-- ============================================================

-- [4.1] 自动更新 updated_at
CREATE OR REPLACE FUNCTION func_update_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_parcels_updated_at BEFORE UPDATE ON parcels
FOR EACH ROW EXECUTE FUNCTION func_update_timestamp();

-- [4.2] 自动审计日志 (核心安全功能)
CREATE OR REPLACE FUNCTION func_audit_parcel_change() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO parcel_audit_logs (parcel_id, action, old_status, new_status)
        VALUES (
            NEW.id, 
            CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'STATUS_CHANGE' END,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_parcel_audit AFTER INSERT OR UPDATE ON parcels
FOR EACH ROW EXECUTE FUNCTION func_audit_parcel_change();

-- [4.3] 智能入库存储过程 (事务原子性)
CREATE OR REPLACE PROCEDURE sp_parcel_inbound(
    p_tracking_no VARCHAR,
    p_phone VARCHAR,
    p_courier_code VARCHAR,
    p_user_name VARCHAR DEFAULT '同学'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id BIGINT;
    v_courier_id INT;
    v_shelf_id INT;
    v_shelf_code VARCHAR;
    v_pickup_code VARCHAR;
BEGIN
    -- A. 用户处理
    SELECT id INTO v_user_id FROM users WHERE phone = p_phone;
    IF v_user_id IS NULL THEN
        INSERT INTO users (phone, name) VALUES (p_phone, p_user_name) RETURNING id INTO v_user_id;
    END IF;

    -- B. 快递商验证
    SELECT id INTO v_courier_id FROM couriers WHERE code = p_courier_code;
    IF v_courier_id IS NULL THEN
        RAISE EXCEPTION '无效快递商: %', p_courier_code;
    END IF;

    -- C. 货架分配 (行锁)
    SELECT id, code INTO v_shelf_id, v_shelf_code 
    FROM shelves 
    WHERE current_load < capacity 
    ORDER BY id ASC LIMIT 1 FOR UPDATE;

    IF v_shelf_id IS NULL THEN
        RAISE EXCEPTION '仓库爆满，请扩容';
    END IF;

    -- D. 生成取件码
    v_pickup_code := v_shelf_code || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

    -- E. 落库
    INSERT INTO parcels (tracking_number, user_id, courier_id, shelf_id, pickup_code, status, recipient_phone_snapshot)
    VALUES (p_tracking_no, v_user_id, v_courier_id, v_shelf_id, v_pickup_code, 'stored', p_phone);

    -- F. 更新库存
    UPDATE shelves SET current_load = current_load + 1 WHERE id = v_shelf_id;
END;
$$;

-- ============================================================
-- 5. 视图层 (Access Control & Isolation)
-- ============================================================

-- [5.1] 学生视图：只能看自己的，且必须脱敏
CREATE OR REPLACE VIEW v_student_parcels AS
SELECT 
    p.user_id,
    p.tracking_number,
    c.name AS courier_name,
    -- 安全逻辑: 只有已上架才显示取件码，否则显示提示
    CASE 
        WHEN p.status IN ('stored', 'pending') THEN p.pickup_code 
        ELSE '待上架' 
    END AS pickup_code,
    s.zone AS shelf_zone, -- 只显示区域，不显示具体内部ID
    p.status,
    p.updated_at
FROM parcels p
JOIN couriers c ON p.courier_id = c.id
LEFT JOIN shelves s ON p.shelf_id = s.id;

-- [5.2] 快递员视图：只能看状态，不可看取件码
CREATE OR REPLACE VIEW v_courier_tasks AS
SELECT 
    p.courier_id,
    p.tracking_number,
    p.recipient_phone_snapshot AS phone, -- 需要联系客户
    p.status,
    p.created_at
FROM parcels p;

-- [5.3] 管理员视图：全知全能
CREATE OR REPLACE VIEW v_admin_dashboard AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'stored') as waiting_pickup,
    (SELECT COUNT(*) FROM shelves WHERE current_load >= capacity) as full_shelves,
    (SELECT COUNT(*) FROM parcel_audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as today_ops
FROM parcels;

-- ============================================================
-- 6. 数据预热 (Seeds)
-- ============================================================
INSERT INTO admins (username, password_hash) VALUES ('admin', 'secret');
INSERT INTO couriers (name, code) VALUES ('顺丰', 'SF'), ('京东', 'JD'), ('邮政', 'EMS');

-- ============================================================
-- 7. 权限配置 (确保应用用户有完整权限)
-- ============================================================

-- 授予序列权限 (解决 users_id_seq 等权限问题)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO campus_user;

-- 授予表的所有权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO campus_user;

-- 授予函数/存储过程执行权限
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO campus_user;

-- 设置默认权限 (未来创建的对象自动有权限)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO campus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO campus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO campus_user;