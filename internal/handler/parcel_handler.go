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

func PickupHandler(c *gin.Context) {
	var req service.PickupRequest

	if err := c.ShouldBindJSON(&req); err!=nil{
		c.JSON(http.StatusBadRequest, gin.H{"error":"参数错误："+err.Error()})
		return
	}

	if err :=service.Pickup(req); err!=nil{
		c.JSON(http.StatusConflict, gin.H{"error": "取件失败，请检查取件码或包裹是否已取出"})
        return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"tracking_number": req.TrackingNumber,
			"status":"picked_up",
			"action":"completed",
		},
	})
}