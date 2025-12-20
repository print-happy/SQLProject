// 包声明：service 包负责业务逻辑层（Business Logic Layer）
// 主要职责：处理业务规则、验证输入、协调数据访问和返回业务结果
// 作为handler层和repository层之间的桥梁，确保业务逻辑的独立性
package service

// 导入所需的包
import (
	"campus-logistics/internal/model"      // 数据模型
	"campus-logistics/internal/repository" // 数据访问层
)

// InboundRequest 入库请求结构体
// 定义接收入库请求时需要的数据格式
// 结构体标签说明：
//   - json: 指定JSON序列化/反序列化时的字段名
//   - binding: Gin框架的验证标签，用于请求参数验证
type InboundRequest struct {
	// 运单号/快递单号，入库包裹的唯一标识符
	// binding:"required" 表示该字段为必填项，如果请求中缺失，Gin会返回验证错误
	TrackingNumber string `json:"tracking_number" binding:"required"`

	// 收件人手机号，用于关联用户信息
	// 必填项，确保每个包裹都有对应的收件人
	Phone string `json:"phone" binding:"required"`

	// 快递公司代码，用于标识快递公司
	// 例如：SF（顺丰）、YT（圆通）、ZT（中通）
	// 必填项，确保包裹有明确的快递公司归属
	CourierCode string `json:"courier_code" binding:"required"`

	// 操作员名称，执行入库操作的人员名称
	// 非必填项（没有binding:"required"标签），可以为空
	// 用于记录操作日志和责任追踪
	UserName string `json:"user_name"`
}

// Inbound 包裹入库服务函数
// 功能：处理包裹入库的核心业务逻辑，协调相关操作
// 参数：req - InboundRequest结构体，包含入库所需的所有信息
// 返回值：error - 成功返回nil，失败返回具体错误
func Inbound(req InboundRequest) error {
	// 兼容旧调用方式：仍允许从 req.CourierCode 读取
	return repository.CreateParcelInbound(req.TrackingNumber, req.Phone, req.CourierCode, req.UserName)
}

// InboundByCourier 入库（快递员鉴权版）：courierCode 由 JWT 决定，不允许客户端伪造
func InboundByCourier(req InboundRequest, courierCode string) error {
	return repository.CreateParcelInbound(req.TrackingNumber, req.Phone, courierCode, req.UserName)
}

// PickupRequest 取件请求结构体
// 定义接收取件请求时需要的数据格式
type PickupRequest struct {
	// 运单号，取件时用于定位具体包裹
	TrackingNumber string `json:"tracking_number" binding:"required"`

	// 取件码，取件时用于验证用户身份的凭证
	PickupCode string `json:"pickup_code" binding:"required"`
}

// Pickup 包裹取件服务函数
// 功能：处理包裹取件的核心业务逻辑
// 参数：req - PickupRequest结构体，包含取件所需的所有信息
// 返回值：error - 成功返回nil，失败返回具体错误
func Pickup(req PickupRequest, userID int64) error {
	return repository.PickupParcel(req.TrackingNumber, req.PickupCode, userID)
}

// GetMyParcels 查询我的包裹服务函数
// 功能：根据手机号查询用户的所有包裹信息
// 参数：phone - 用户手机号，作为查询条件
// 返回值：
//   - []model.ParcelViewStudent: 包裹视图列表，包含学生视角的包裹信息
//   - error: 查询失败时返回错误，成功返回nil
func GetMyParcels(userID int64, page, pageSize int) ([]model.ParcelViewStudent, error) {
	// 简单的分页参数保护，防止恶意请求导致超大分页
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// 直接调用repository层的GetParcelByPhone函数
	// 该函数基于学生视图执行查询，返回学生视角的包裹信息
	return repository.GetParcelByUserID(userID, pageSize, offset)
}
