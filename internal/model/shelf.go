package model

import "time"

type Shelf struct {
	ID          int64     `db:"id" json:"id"`
	Zone        string    `db:"zone" json:"zone"`
	Code        string    `db:"code" json:"code"`
	Capacity    int       `db:"capacity" json:"capacity"`
	CurrentLoad int       `db:"current_load" json:"current_load"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}
