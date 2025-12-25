package handler

import (
	"campus-logistics/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

type createCourierRequest struct {
	Name         string `json:"name" binding:"required"`
	Code         string `json:"code" binding:"required"`
	ContactPhone string `json:"contact_phone"`
}

func ListCouriersHandler(c *gin.Context) {
	// Simple paging with sane defaults
	limit := 100
	offset := 0

	couriers, err := repository.ListCouriers(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list couriers failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": couriers})
}

func CreateCourierHandler(c *gin.Context) {
	var req createCourierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	name := strings.TrimSpace(req.Name)
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	contactPhone := strings.TrimSpace(req.ContactPhone)

	if name == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and code are required"})
		return
	}

	created, err := repository.CreateCourier(name, code, contactPhone)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch string(pqErr.Code) {
			case "23505":
				c.JSON(http.StatusConflict, gin.H{"error": "courier name/code already exists"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create courier failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": created})
}

func DeleteCourierHandler(c *gin.Context) {
	code := strings.ToUpper(strings.TrimSpace(c.Param("code")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	if err := repository.DeleteCourierByCode(code); err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "courier not found"})
			return
		}
		if pqErr, ok := err.(*pq.Error); ok {
			switch string(pqErr.Code) {
			case "23503":
				c.JSON(http.StatusConflict, gin.H{"error": "courier is referenced by parcels; cannot delete"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete courier failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}
