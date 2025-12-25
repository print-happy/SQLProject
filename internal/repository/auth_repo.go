package repository

import (
	"campus-logistics/internal/model"
	"database/sql"
	"fmt"
)

func GetAdminByUsername(username string) (*model.Admin, error) {
	var a model.Admin
	query := `SELECT id, username, password_hash, role FROM admins WHERE username = $1`
	if err := DB.Get(&a, query, username); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

func GetUserByPhone(phone string) (*model.User, error) {
	var u model.User
	query := `SELECT id, phone, name FROM users WHERE phone = $1`
	if err := DB.Get(&u, query, phone); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func CreateUser(phone, name string) (*model.User, error) {
	var u model.User
	query := `INSERT INTO users (phone, name) VALUES ($1, $2) RETURNING id, phone, name`
	if err := DB.Get(&u, query, phone, name); err != nil {
		return nil, err
	}
	return &u, nil
}

func GetCourierByCode(code string) (*model.Courier, error) {
	var c model.Courier
	query := `SELECT id, name, code FROM couriers WHERE code = $1`
	if err := DB.Get(&c, query, code); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func TouchAdminLastLogin(adminID int64) error {
	query := `UPDATE admins SET last_login_at = NOW() WHERE id = $1`
	_, err := DB.Exec(query, adminID)
	return err
}

func GetCourierTasks(courierID int64, limit, offset int) ([]model.CourierTask, error) {
	tasks := []model.CourierTask{}
	query := `
		SELECT tracking_number, phone, status, created_at
		FROM v_courier_tasks
		WHERE courier_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	if err := DB.Select(&tasks, query, courierID, limit, offset); err != nil {
		return nil, fmt.Errorf("query courier tasks failed: %w", err)
	}
	return tasks, nil
}
