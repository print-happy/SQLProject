package handler

import (
	"campus-logistics/internal/service"
	"campus-logistics/internal/model"
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

func GetMyParcelHandler(c *gin.Context){
	phone:=c.Query("phone")

	if phone==""{
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone parameter is required"})
		return
	}

	parcels, err := service.GetMyParcels(phone)
	if err!= nil{
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	if parcels==nil{
		parcels=[]model.ParcelViewStudent{}
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    parcels,
		"count":   len(parcels),
	})
}