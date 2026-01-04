// 包声明：model 包包含应用程序的数据模型定义
// 这些结构体通常对应数据库表或视图，并用于JSON序列化
package model

// 导入所需的包
import (
	"database/sql" // Go标准数据库包，提供NullString等可空类型
	"time"         // Go标准时间包，用于时间相关字段
)

// Parcel 结构体表示包裹实体，对应数据库中的parcels表
// 用于存储和管理包裹的完整信息
type Parcel struct {
	// 主键ID，自增长，唯一标识一个包裹记录
	ID int64 `db:"id" json:"id"`

	// 用户ID，关联到用户表的外键，标识包裹所属用户
	UserID int64 `db:"user_id" json:"user_id"`

	// 快递公司ID，关联到couriers表的外键，标识包裹所属快递公司
	CourierID int64 `db:"courier_id" json:"courier_id"`

	// 运单号/快递单号，包裹的唯一追踪标识，通常由快递公司提供
	TrackingNumber string `db:"tracking_number" json:"tracking_number"`

	// 取件码，用户取件时使用的验证码
	// 使用sql.NullString类型表示该字段可能为NULL值
	// 当未生成取件码或不需要取件码时，该字段为空
	PickupCode sql.NullString `db:"pickup_code" json:"pickup_code"`

	// 货架区域，包裹存储的货架区域标识（如A区、B区等）
	ShelfZone string `db:"shelf_zone" json:"shelf_zone"`

	// 货架行号，包裹存储的货架行号（第几行）
	ShelfRow int `db:"shelf_row" json:"shelf_row"`

	// 货架单元号，包裹存储的货架单元号（第几格）
	ShelfUnit int `db:"shelf_unit" json:"shelf_unit"`

	// 包裹状态，表示包裹当前所处的状态
	// 可能的值：stored(已入库)、picked_up(已取件)、waiting(待取件)等
	Status string `db:"status" json:"status"`

	// 创建时间，记录包裹信息首次创建的时间戳
	// 通常由数据库自动生成（如DEFAULT CURRENT_TIMESTAMP）
	CreatedAt time.Time `db:"created_at" json:"created_at"`

	// 更新时间，记录包裹信息最后一次更新的时间戳
	// 通常由数据库自动更新（如ON UPDATE CURRENT_TIMESTAMP）
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Courier 结构体表示快递公司实体，对应数据库中的couriers表
// 用于存储和管理快递公司信息
type Courier struct {
	// 主键ID，自增长，唯一标识一个快递公司记录
	ID int64 `db:"id" json:"id"`

	// 快递公司名称，如顺丰、圆通、中通等
	Name string `db:"name" json:"name"`

	// 快递公司代码，用于内部标识或简写（如SF、YT、ZT等）
	Code string `db:"code" json:"code"`

	// 快递公司联系电话，用于联系快递公司
	ContactPhone string `db:"contact_phone" json:"contact_phone"`

	// 创建时间，记录快递公司信息创建的时间戳
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// ParcelViewStudent 结构体表示学生视角的包裹视图模型
// 这个结构体不对应单一数据库表，而是多表关联查询的结果视图
// 专门为学生查询自己的包裹列表而设计，包含学生需要知道的关键信息
type ParcelViewStudent struct {
	// 运单号，包裹的唯一追踪标识
	TrackingNumber string `db:"tracking_number" json:"tracking_number"`

	// 快递公司名称，便于学生识别快递公司
	CourierName string `db:"courier_name" json:"courier_name"`

	// 取件码，学生取件时需要使用的验证码
	// 注意：这里使用的是string而不是sql.NullString
	// 因为在视图查询中，PickupCode要么有值，要么为空字符串
	PickupCode string `db:"pickup_code" json:"pickup_code"`

	// 货架区域，学生需要知道的包裹存储位置
	ShelfZone string `db:"shelf_zone" json:"shelf_zone"`

	// 包裹状态，学生需要知道的包裹当前状态
	Status string `db:"status" json:"status"`

	// 创建时间（入库时间参考）
	CreatedAt time.Time `db:"created_at" json:"created_at"`

	// 更新时间，包裹信息的最后更新时间
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// AdminDashboard 表示管理员仪表盘视图的数据结构
// 对应数据库视图 v_admin_dashboard 的查询结果
type AdminDashboard struct {
	WaitingPickup int `db:"waiting_pickup" json:"waiting_pickup"`
	FullShelves   int `db:"full_shelves" json:"full_shelves"`
	TodayOps      int `db:"today_ops" json:"today_ops"`
}
