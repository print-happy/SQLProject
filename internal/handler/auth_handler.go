package handler

import (
	"net/http"

	"campus-logistics/internal/service"

	"github.com/gin-gonic/gin"
)

type adminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type studentLoginRequest struct {
	Phone string `json:"phone" binding:"required"`
	Name  string `json:"name"`
}

type courierLoginRequest struct {
	CourierCode string `json:"courier_code" binding:"required"`
}

// POST /api/v1/auth/admin/login
func AdminLoginHandler(c *gin.Context) {
	var req adminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	resp, err := service.AdminLogin(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": resp})
}

// POST /api/v1/auth/student/login
func StudentLoginHandler(c *gin.Context) {
	var req studentLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	resp, err := service.StudentLogin(req.Phone, req.Name)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": resp})
}

// POST /api/v1/auth/courier/login
func CourierLoginHandler(c *gin.Context) {
	var req courierLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	resp, err := service.CourierLogin(req.CourierCode)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": resp})
}
