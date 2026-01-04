// 包声明：repository 包负责数据访问层（Data Access Layer）的具体实现
// 这些函数直接与数据库交互，执行具体的CRUD操作
package repository

// 导入所需的包
import (
	"campus-logistics/internal/model" // 项目内部数据模型
	"database/sql"                    // 标准库SQL错误类型
	"fmt"                             // 格式化字符串，用于构建错误信息
)

// CreateParcelInbound 创建包裹入库记录（通过存储过程）
// 功能：通过调用存储过程处理包裹入库的完整业务逻辑
// 使用事务确保数据一致性，如果任何步骤失败，整个操作会回滚
// 参数：
//   - trackingNum: 运单号（快递单号）
//   - phone: 收件人手机号
//   - courierCode: 快递公司代码
//   - userName: 入库操作员名称
//
// 返回值：error - 成功返回nil，失败返回具体错误
func CreateParcelInbound(trackingNum, phone, courierCode, userName string) error {
	// 1. 开始数据库事务
	// Beginx() 返回一个 sqlx.Tx 事务对象，支持命名参数等高级特性
	tx, err := DB.Beginx()
	if err != nil {
		// 事务开始失败，返回错误（如连接池耗尽、数据库不可用等）
		return fmt.Errorf("transaction begin failed: %w", err)
	}

	// 2. 使用defer确保在函数退出前回滚事务（如果未提交）
	// 这是一种安全防护措施，如果后续代码中有panic或提前返回，事务会被回滚
	defer tx.Rollback()

	// 3. 调用存储过程执行入库操作
	// 使用PostgreSQL存储过程（或函数）sp_parcel_inbound
	// $1, $2, $3, $4 是位置参数占位符
	query := `CALL sp_parcel_inbound($1, $2, $3, $4)`

	// 执行存储过程调用
	// Exec 方法用于执行不返回结果集的SQL语句
	_, err = tx.Exec(query, trackingNum, phone, courierCode, userName)
	if err != nil {
		// 存储过程执行失败，返回具体错误
		// 可能的原因：参数错误、业务规则违反（如重复运单号）、数据库约束违反等
		return fmt.Errorf("stored procedure error: %w", err)
	}

	// 4. 提交事务，使所有更改永久生效
	if err := tx.Commit(); err != nil {
		// 提交失败，返回错误
		return fmt.Errorf("transaction commit failed: %w", err)
	}

	// 5. 返回nil表示成功
	// 注意：defer tx.Rollback()在Commit()成功后不会执行
	return nil
}

// GetParcelByTracking 根据运单号查询包裹详细信息
// 功能：通过运单号查询单个包裹的完整信息，包括所有字段
// 参数：
//   - trackingNum: 运单号
//
// 返回值：
//   - *model.Parcel: 包裹结构体指针，包含所有字段
//   - error: 查询失败时返回错误，成功返回nil
func GetParcelByTracking(trackingNum string) (*model.Parcel, error) {
	// 声明一个Parcel结构体变量，用于存储查询结果
	var p model.Parcel

	// SQL查询语句：根据运单号查询parcels表中的所有字段
	// $1 是参数占位符，对应trackingNum参数
	// 注意：这里使用的是tracking_number字段名，与结构体标签一致
	query := `SELECT * FROM parcels WHERE tracking_number = $1`

	// 使用sqlx的Get方法查询单条记录
	// Get方法将查询结果映射到结构体p中，使用db标签进行字段映射
	// 如果查询不到记录，会返回sql.ErrNoRows错误
	err := DB.Get(&p, query, trackingNum)
	if err != nil {
		// 查询失败，返回nil和错误
		return nil, err
	}

	// 查询成功，返回包裹结构体的指针
	return &p, nil
}

// GetParcelByPhone 根据手机号查询用户的包裹列表（学生视图）
// 功能：通过手机号查询该用户的所有包裹，返回学生视角的包裹信息
// 使用视图 v_student_parcels，并通过手机号定位 user_id，支持分页
// 参数：
//   - phone: 手机号
//   - limit, offset: 分页参数
//
// 返回值：
//   - []model.ParcelViewStudent: 包裹视图切片，包含学生需要的信息
//   - error: 查询失败时返回错误，成功返回nil
func GetParcelByPhone(phone string, limit, offset int) ([]model.ParcelViewStudent, error) {
	parcels := []model.ParcelViewStudent{}

	query := `
		SELECT 
			p.tracking_number,
			c.name AS courier_name,
			CASE 
				WHEN p.status IN ('stored', 'pending') THEN p.pickup_code
				ELSE '待上架'
			END AS pickup_code,
			s.zone AS shelf_zone,
			p.status,
			p.created_at,
			p.updated_at
		FROM parcels p
		JOIN couriers c ON p.courier_id = c.id
		LEFT JOIN shelves s ON p.shelf_id = s.id
		WHERE p.user_id = (
			SELECT id FROM users WHERE phone = $1
		)
		ORDER BY p.updated_at DESC
		LIMIT $2 OFFSET $3
	`

	if err := DB.Select(&parcels, query, phone, limit, offset); err != nil {
		return nil, err
	}
	return parcels, nil
}

// GetParcelByUserID 根据 user_id 查询用户的包裹列表（学生视图）
// 这是鉴权后的推荐路径，避免使用 phone 造成越权查询
func GetParcelByUserID(userID int64, limit, offset int) ([]model.ParcelViewStudent, error) {
	parcels := []model.ParcelViewStudent{}

	query := `
		SELECT 
			p.tracking_number,
			c.name AS courier_name,
			CASE 
				WHEN p.status IN ('stored', 'pending') THEN p.pickup_code
				ELSE '待上架'
			END AS pickup_code,
			s.zone AS shelf_zone,
			p.status,
			p.created_at,
			p.updated_at
		FROM parcels p
		JOIN couriers c ON p.courier_id = c.id
		LEFT JOIN shelves s ON p.shelf_id = s.id
		WHERE p.user_id = $1
		ORDER BY p.updated_at DESC
		LIMIT $2 OFFSET $3
	`

	if err := DB.Select(&parcels, query, userID, limit, offset); err != nil {
		return nil, err
	}
	return parcels, nil
}

// PickupParcel 包裹取件操作
// 功能：根据运单号和取件码更新包裹状态为"已取件"
// 使用原子更新操作确保并发安全性，避免重复取件
// 参数：
//   - trackingNum: 运单号
//   - pickupCode: 取件码
// 返回值：error - 成功返回nil，失败返回具体错误

func PickupParcel(trackingNum, pickupCode string, userID int64) error {
	// 使用事务保证包裹状态更新与货架负载更新的一致性
	tx, err := DB.Beginx()
	if err != nil {
		return fmt.Errorf("transaction begin failed: %w", err)
	}
	defer tx.Rollback()

	type pickedParcel struct {
		ShelfID int64 `db:"shelf_id"`
	}

	var p pickedParcel

	// 更新包裹状态并记录取件时间，同时拿到所在货架ID
	updateQuery := `
				UPDATE parcels
				SET status = 'picked_up', updated_at = NOW(), picked_up_at = NOW()
				WHERE tracking_number = $1
					AND pickup_code = $2
					AND user_id = $3
					AND status = 'stored'
				RETURNING shelf_id
		`

	if err := tx.Get(&p, updateQuery, trackingNum, pickupCode, userID); err != nil {
		// 可能是未找到符合条件的记录，或其他数据库错误
		if err == sql.ErrNoRows {
			return fmt.Errorf("pickup failed: invalid code or parcel status")
		}
		return fmt.Errorf("db execution failed: %w", err)
	}

	// 如果有货架ID，减少对应货架的current_load
	if p.ShelfID != 0 {
		_, err = tx.Exec(`
            UPDATE shelves
            SET current_load = current_load - 1, updated_at = NOW()
            WHERE id = $1 AND current_load > 0
        `, p.ShelfID)
		if err != nil {
			return fmt.Errorf("update shelf load failed: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("transaction commit failed: %w", err)
	}

	return nil
}

// GetAdminDashboard 查询管理员仪表盘统计数据
// 数据来源：数据库视图 v_admin_dashboard
func GetAdminDashboard() (*model.AdminDashboard, error) {
	dashboard := &model.AdminDashboard{}
	query := `
        SELECT waiting_pickup, full_shelves, today_ops
        FROM v_admin_dashboard
        LIMIT 1
    `
	if err := DB.Get(dashboard, query); err != nil {
		return nil, err
	}
	return dashboard, nil
}

// GetRetentionParcels 查询滞留包裹列表
// days 参数表示滞留天数阈值，例如 7 表示滞留超过 7 天
// 结果按创建时间升序排列，并支持 limit/offset 分页
func GetRetentionParcels(days, limit, offset int) ([]model.ParcelViewStudent, error) {
	parcels := []model.ParcelViewStudent{}
	query := `
        SELECT 
            p.tracking_number,
            c.name AS courier_name,
            p.pickup_code,
            s.zone AS shelf_zone,
            p.status,
			p.created_at,
            p.updated_at
        FROM parcels p
        LEFT JOIN couriers c ON p.courier_id = c.id
        LEFT JOIN shelves s ON p.shelf_id = s.id
        WHERE p.status IN ('stored', 'pending')
          AND p.created_at < NOW() - ($1 * INTERVAL '1 day')
        ORDER BY p.created_at ASC
        LIMIT $2 OFFSET $3
    `
	if err := DB.Select(&parcels, query, days, limit, offset); err != nil {
		return nil, err
	}
	return parcels, nil
}

// UpdateParcelStatus 管理员更新包裹状态（不含 picked_up 流转）
// 用于处理待取、异常、退回等状态
func UpdateParcelStatus(trackingNum, newStatus string) error {
	query := `
        UPDATE parcels
        SET status = $1
        WHERE tracking_number = $2
    `
	result, err := DB.Exec(query, newStatus, trackingNum)
	if err != nil {
		return fmt.Errorf("update parcel status failed: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("parcel not found")
	}
	return nil
}
