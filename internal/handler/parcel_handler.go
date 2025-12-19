package handler

import (
	"campus-logistics/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func InboundHandler(c *gin.Context) {
	var req service.InbounceRequest

	if err := c.ShouldBindJSON(&req); err!=nil{
		c.JSON(http.StatusBadRequest, gin.H{"error": "入库失败 "+err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"tracking_number": req.TrackingNumber,
			"status": "stored",
		},
	})
}