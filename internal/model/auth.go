package model

type Admin struct {
	ID           int64  `db:"id" json:"id"`
	Username     string `db:"username" json:"username"`
	PasswordHash string `db:"password_hash" json:"-"`
	Role         string `db:"role" json:"role"`
}

type User struct {
	ID    int64  `db:"id" json:"id"`
	Phone string `db:"phone" json:"phone"`
	Name  string `db:"name" json:"name"`
}
