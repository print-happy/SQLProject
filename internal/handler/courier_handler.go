package handler

import (
	"net/http"
	"strconv"

	"campus-logistics/internal/middleware"
	"campus-logistics/internal/model"
	"campus-logistics/internal/service"

	"github.com/gin-gonic/gin"
)

// GetCourierTasksHandler 快递员查看自己的任务列表
// GET /api/v1/courier/tasks?page=1&page_size=20
func GetCourierTasksHandler(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok || claims.CourierID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing courier claims"})
		return
	}

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

	tasks, err := service.GetCourierTasksForCourier(claims.CourierID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query tasks"})
		return
	}

	if tasks == nil {
		tasks = []model.CourierTask{}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "success",
		"data":      tasks,
		"count":     len(tasks),
		"page":      page,
		"page_size": pageSize,
	})
}
