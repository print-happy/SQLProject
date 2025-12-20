package handler

import (
	"net/http"
	"strconv"

	"campus-logistics/internal/model"
	"campus-logistics/internal/service"

	"github.com/gin-gonic/gin"
)

// AdminDashboardHandler 管理员仪表盘接口
// GET /api/v1/admin/dashboard
func AdminDashboardHandler(c *gin.Context) {
	dashboard, err := service.GetAdminDashboardService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to load dashboard",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    dashboard,
	})
}

// GetRetentionParcelsHandler 查询滞留包裹列表
// GET /api/v1/admin/parcels/retention?days=7&page=1&page_size=20
func GetRetentionParcelsHandler(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "7")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	days, err := strconv.Atoi(daysStr)
	if err != nil {
		days = 7
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil {
		pageSize = 20
	}

	parcels, err := service.GetRetentionParcelsService(days, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to query retention parcels",
		})
		return
	}

	if parcels == nil {
		parcels = []model.ParcelViewStudent{}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "success",
		"data":      parcels,
		"count":     len(parcels),
		"page":      page,
		"page_size": pageSize,
		"days":      days,
	})
}

// UpdateParcelStatusHandler 管理员更新包裹状态接口
// POST /api/v1/admin/parcels/:tracking_number/status
// body: {"status": "pending" | "returned" | "exception" | "stored"}
func UpdateParcelStatusHandler(c *gin.Context) {
	trackingNum := c.Param("tracking_number")
	if trackingNum == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "tracking_number is required",
		})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid status payload",
		})
		return
	}

	if err := service.UpdateParcelStatusService(trackingNum, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "success",
		"tracking_number": trackingNum,
		"status":          req.Status,
	})
}
