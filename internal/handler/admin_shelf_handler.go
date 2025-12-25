package handler

import (
	"campus-logistics/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

type createShelfRequest struct {
	Zone     string `json:"zone" binding:"required"`
	Code     string `json:"code" binding:"required"`
	Capacity int    `json:"capacity" binding:"required"`
}

func ListShelvesHandler(c *gin.Context) {
	limit := 200
	offset := 0

	shelves, err := repository.ListShelves(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list shelves failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": shelves})
}

func CreateShelfHandler(c *gin.Context) {
	var req createShelfRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	zone := strings.TrimSpace(req.Zone)
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	capacity := req.Capacity

	if zone == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "zone and code are required"})
		return
	}
	if capacity <= 0 || capacity > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "capacity must be between 1 and 10000"})
		return
	}

	created, err := repository.CreateShelf(zone, code, capacity)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch string(pqErr.Code) {
			case "23505":
				c.JSON(http.StatusConflict, gin.H{"error": "shelf code already exists"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create shelf failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": created})
}

func DeleteShelfHandler(c *gin.Context) {
	code := strings.ToUpper(strings.TrimSpace(c.Param("code")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	if err := repository.DeleteEmptyShelfByCode(code); err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "shelf not found"})
			return
		}
		if err == repository.ErrConflict {
			c.JSON(http.StatusConflict, gin.H{"error": "shelf is not empty; cannot delete"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete shelf failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}
