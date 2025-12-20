package service

import (
	"fmt"

	"campus-logistics/internal/model"
	"campus-logistics/internal/repository"
)

// GetAdminDashboardService 获取管理员仪表盘统计数据
func GetAdminDashboardService() (*model.AdminDashboard, error) {
	return repository.GetAdminDashboard()
}

// GetRetentionParcelsService 查询滞留包裹列表
// days: 滞留天数阈值
// page/pageSize: 分页参数
func GetRetentionParcelsService(days, page, pageSize int) ([]model.ParcelViewStudent, error) {
	if days <= 0 {
		days = 7
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	return repository.GetRetentionParcels(days, pageSize, offset)
}

// UpdateParcelStatusService 管理员更新包裹状态
// 这里只允许部分业务状态，防止非法值传入
func UpdateParcelStatusService(trackingNum, newStatus string) error {
	switch newStatus {
	case "pending", "returned", "exception", "stored":
		// 合法状态，继续
	default:
		return fmt.Errorf("invalid status: %s", newStatus)
	}

	return repository.UpdateParcelStatus(trackingNum, newStatus)
}
