// 包声明：handler 包包含HTTP请求处理函数
package handler

// 导入所需的包
import (
	"campus-logistics/internal/middleware"
	"campus-logistics/internal/model"   // 项目内部数据模型定义
	"campus-logistics/internal/service" // 项目内部业务逻辑服务层
	"net/http"                          // Go标准HTTP包，提供HTTP状态码等常量
	"strconv"

	"github.com/gin-gonic/gin" // Gin Web框架
)

// InboundHandler 处理包裹入库请求
// 功能：接收入库请求，验证请求数据，调用入库服务，返回入库结果
// 请求方法：POST
// 请求路径：/api/v1/inbound
// 请求体：JSON格式的入库请求数据
func InboundHandler(c *gin.Context) {
	// 声明一个InboundRequest结构体变量，用于绑定请求中的JSON数据
	var req service.InboundRequest

	// 将请求体中的JSON数据绑定到req变量
	// ShouldBindJSON会自动根据结构体字段标签解析JSON
	// 如果绑定失败（如JSON格式错误、字段类型不匹配等），返回400错误
	if err := c.ShouldBindJSON(&req); err != nil {
		// 返回HTTP 400状态码，并包含错误信息
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "入库失败 " + err.Error(), // 将错误信息附加到响应中
		})
		return // 终止函数执行，不继续后续处理
	}

	// courier_code 由鉴权信息决定，避免客户端伪造
	claims, ok := middleware.GetClaims(c)
	if !ok || claims.CourierCode == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing courier claims"})
		return
	}

	// 调用service层的InboundByCourier函数执行入库业务逻辑
	if err := service.InboundByCourier(req, claims.CourierCode); err != nil {
		// 返回HTTP 500状态码，表示服务器内部错误
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "入库失败: " + err.Error(),
		})
		return
	}

	// 入库成功，返回HTTP 200状态码和成功响应
	c.JSON(http.StatusOK, gin.H{
		"message": "success", // 操作成功标志
		"data": gin.H{ // 返回的业务数据
			"tracking_number": req.TrackingNumber, // 运单号，来自请求数据
			"status":          "stored",           // 包裹当前状态：已入库
		},
	})
}

// PickupHandler 处理包裹取件请求
// 功能：接收取件请求，验证取件码和运单号，执行取件操作
// 请求方法：POST
// 请求路径：/api/v1/pickup
// 请求体：JSON格式的取件请求数据（应包含运单号和取件码）
func PickupHandler(c *gin.Context) {
	// 声明一个PickupRequest结构体变量，用于绑定请求中的JSON数据
	var req service.PickupRequest

	// 绑定JSON请求数据
	if err := c.ShouldBindJSON(&req); err != nil {
		// 返回HTTP 400状态码，表示客户端请求参数有误
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "参数错误：" + err.Error(),
		})
		return
	}

	claims, ok := middleware.GetClaims(c)
	if !ok || claims.UserID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing student claims"})
		return
	}

	// 调用service层的Pickup函数执行取件业务逻辑（绑定到当前 student）
	if err := service.Pickup(req, claims.UserID); err != nil {
		// 返回HTTP 409状态码，表示请求与服务器当前状态冲突
		c.JSON(http.StatusConflict, gin.H{
			"error": "取件失败，请检查取件码或包裹是否已取出",
		})
		return
	}

	// 取件成功，返回HTTP 200状态码和成功响应
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"tracking_number": req.TrackingNumber, // 运单号
			"status":          "picked_up",        // 包裹状态：已取件
			"action":          "completed",        // 操作状态：已完成
		},
	})
}

// GetMyParcelHandler 处理查询我的包裹请求
// 功能：根据手机号查询当前用户的所有包裹信息
// 请求方法：GET
// 请求路径：/api/v1/parcels
// 查询参数：phone（手机号）
func GetMyParcelHandler(c *gin.Context) {
	// phone 不再从 query 获取，改为从 JWT claims 获取，避免越权
	claims, ok := middleware.GetClaims(c)
	if !ok || claims.UserID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing student claims"})
		return
	}

	// 解析分页参数，提供默认值
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil {
		pageSize = 20
	}

	// 调用service层的GetMyParcels函数查询包裹列表
	// 参数：手机号 + 分页
	// 返回值：包裹列表和可能的错误
	parcels, err := service.GetMyParcels(claims.UserID, page, pageSize)
	if err != nil {
		// 查询过程中发生错误，返回500错误
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "查询失败", // 不暴露具体错误细节给客户端
		})
		return
	}

	// 处理空结果集的情况
	// 如果查询结果为空，将其转换为空切片而不是nil
	// 这样可以确保响应中的JSON数组始终是有效的
	if parcels == nil {
		parcels = []model.ParcelViewStudent{} // 创建空切片
	}

	// 查询成功，返回HTTP 200状态码和包裹列表
	c.JSON(http.StatusOK, gin.H{
		"message":   "success",
		"data":      parcels,      // 包裹列表数据
		"count":     len(parcels), // 当前页包裹数量
		"page":      page,
		"page_size": pageSize,
	})
}
