package model

import(
	"database/sql"
	"time"
)

type Parcel struct {
	ID             int64          `db:"id" json:"id"`
	UserID         int64          `db:"user_id" json:"user_id"`
	CourierID      int64          `db:"courier_id" json:"courier_id"`
	TrackingNumber string         `db:"tracking_number" json:"tracking_number"`
	PickupCode     sql.NullString `db:"pickup_code" json:"pickup_code"` // 可能为空
	ShelfZone      string         `db:"shelf_zone" json:"shelf_zone"`
	ShelfRow       int            `db:"shelf_row" json:"shelf_row"`
	ShelfUnit      int            `db:"shelf_unit" json:"shelf_unit"`
	Status         string         `db:"status" json:"status"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

type Courier struct {
    ID        int64     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Code      string    `db:"code" json:"code"`
	Phone     string    `db:"phone" json:"phone"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}