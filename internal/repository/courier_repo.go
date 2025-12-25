package repository

import (
	"campus-logistics/internal/model"
	"database/sql"
	"fmt"
)

func ListCouriers(limit, offset int) ([]model.Courier, error) {
	couriers := []model.Courier{}
	query := `
		SELECT id, name, code, COALESCE(contact_phone, '') AS contact_phone, created_at
		FROM couriers
		ORDER BY id ASC
		LIMIT $1 OFFSET $2
	`
	if err := DB.Select(&couriers, query, limit, offset); err != nil {
		return nil, fmt.Errorf("list couriers failed: %w", err)
	}
	return couriers, nil
}

func CreateCourier(name, code, contactPhone string) (*model.Courier, error) {
	var c model.Courier
	query := `
		INSERT INTO couriers (name, code, contact_phone)
		VALUES ($1, $2, $3)
		RETURNING id, name, code, COALESCE(contact_phone, '') AS contact_phone, created_at
	`
	if err := DB.Get(&c, query, name, code, sql.NullString{String: contactPhone, Valid: contactPhone != ""}); err != nil {
		return nil, err
	}
	return &c, nil
}

func DeleteCourierByCode(code string) error {
	query := `DELETE FROM couriers WHERE code = $1`
	result, err := DB.Exec(query, code)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
