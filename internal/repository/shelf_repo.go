package repository

import (
	"campus-logistics/internal/model"
	"database/sql"
	"fmt"
)

func ListShelves(limit, offset int) ([]model.Shelf, error) {
	shelves := []model.Shelf{}
	query := `
		SELECT id, zone, code, capacity, current_load, updated_at
		FROM shelves
		ORDER BY id ASC
		LIMIT $1 OFFSET $2
	`
	if err := DB.Select(&shelves, query, limit, offset); err != nil {
		return nil, fmt.Errorf("list shelves failed: %w", err)
	}
	return shelves, nil
}

func CreateShelf(zone, code string, capacity int) (*model.Shelf, error) {
	var s model.Shelf
	query := `
		INSERT INTO shelves (zone, code, capacity)
		VALUES ($1, $2, $3)
		RETURNING id, zone, code, capacity, current_load, updated_at
	`
	if err := DB.Get(&s, query, zone, code, capacity); err != nil {
		return nil, err
	}
	return &s, nil
}

type shelfForDelete struct {
	ID          int64 `db:"id"`
	CurrentLoad int   `db:"current_load"`
}

func DeleteEmptyShelfByCode(code string) error {
	var s shelfForDelete
	getQuery := `SELECT id, current_load FROM shelves WHERE code = $1`
	if err := DB.Get(&s, getQuery, code); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	if s.CurrentLoad != 0 {
		return ErrConflict
	}

	var activeCnt int
	if err := DB.Get(&activeCnt, `SELECT COUNT(1) FROM parcels WHERE shelf_id = $1 AND status IN ('stored','pending')`, s.ID); err != nil {
		return err
	}
	if activeCnt != 0 {
		return ErrConflict
	}

	result, err := DB.Exec(`DELETE FROM shelves WHERE id = $1`, s.ID)
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
