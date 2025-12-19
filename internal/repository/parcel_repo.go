// 包声明：repository 包负责数据访问层（Data Access Layer）的具体实现
// 这些函数直接与数据库交互，执行具体的CRUD操作
package repository

// 导入所需的包
import (
    "fmt"                         // 格式化字符串，用于构建错误信息
    "campus-logistics/internal/model" // 项目内部数据模型
)

// CreateParcelInbound 创建包裹入库记录（通过存储过程）
// 功能：通过调用存储过程处理包裹入库的完整业务逻辑
// 使用事务确保数据一致性，如果任何步骤失败，整个操作会回滚
// 参数：
//   - trackingNum: 运单号（快递单号）
//   - phone: 收件人手机号
//   - courierCode: 快递公司代码
//   - userName: 入库操作员名称
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
// 这是一个多表关联查询，包含快递公司名称和货架区域信息
// 参数：
//   - phone: 手机号
// 返回值：
//   - []model.ParcelViewStudent: 包裹视图切片，包含学生需要的信息
//   - error: 查询失败时返回错误，成功返回nil
func GetParcelByPhone(phone string) ([]model.ParcelViewStudent, error) {
    parcels := []model.ParcelViewStudent{}
    query := `
        SELECT 
            p.tracking_number, 
            c.name AS courier_name, 
            p.pickup_code, 
            s.zone AS shelf_zone, 
            p.status, 
            p.updated_at 
        FROM parcels p
        LEFT JOIN couriers c ON p.courier_id = c.id
        LEFT JOIN shelves s ON p.shelf_id = s.id
        LEFT JOIN users u ON p.user_id = u.id  -- 新增：关联用户表
        WHERE u.phone = $1  -- 修改：通过users表的phone字段查询
        ORDER BY p.updated_at DESC
    `
    err := DB.Select(&parcels, query, phone)
    return parcels, err
}

// PickupParcel 包裹取件操作
// 功能：根据运单号和取件码更新包裹状态为"已取件"
// 使用原子更新操作确保并发安全性，避免重复取件
// 参数：
//   - trackingNum: 运单号
//   - pickupCode: 取件码
// 返回值：error - 成功返回nil，失败返回具体错误
func PickupParcel(trackingNum, pickupCode string) error {
    // SQL更新语句：更新包裹状态和更新时间
    // 使用原子操作，通过WHERE条件确保只有符合条件的记录被更新
    // 条件包括：运单号匹配、取件码匹配、当前状态为'stored'（防止重复取件）
    query := `UPDATE parcels
              SET status = 'picked_up', updated_at = NOW()
              WHERE tracking_number = $1
              AND pickup_code = $2
              AND status = 'stored'
              `
    
    // 执行更新操作
    // Exec方法返回Result接口，包含受影响的行数等信息
    result, err := DB.Exec(query, trackingNum, pickupCode)
    if err != nil {
        // 数据库执行失败（如连接问题、语法错误等）
        return fmt.Errorf("db execution failed: %w", err)
    }
    
    // 获取受影响的行数
    // RowsAffected() 返回被更新（或插入、删除）的行数
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        // 获取受影响行数失败
        return err
    }
    
    // 检查是否成功更新了记录
    if rowsAffected == 0 {
        // 没有记录被更新，说明取件失败
        // 可能原因：取件码错误、包裹不存在、包裹已被取走、包裹状态不是'stored'
        return fmt.Errorf("pickup failed: invalid code or parcel status")
    }
    
    // 成功更新1行记录，返回nil
    return nil
}