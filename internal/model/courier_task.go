package model

import "time"

type CourierTask struct {
	TrackingNumber string    `db:"tracking_number" json:"tracking_number"`
	Phone          string    `db:"phone" json:"phone"`
	Status         string    `db:"status" json:"status"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}
