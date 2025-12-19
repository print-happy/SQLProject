package repository

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/spf13/viper"
)

var DB *sqlx.DB

func InitDB() error {
	// 1. 从 Viper 读取配置字符串
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		viper.GetString("database.host"),
		viper.GetString("database.port"),
		viper.GetString("database.user"),
		viper.GetString("database.password"),
		viper.GetString("database.dbname"),
		viper.GetString("database.sslmode"),
	)

	var err error

	DB, err=sqlx.Connect("postgres",dsn)
	if err!=nil{
		return fmt.Errorf("connect db failed: %w",err)
	}

	DB.SetMaxIdleConns(viper.GetInt("database.max_idle_conns"))
	DB.SetMaxOpenConns(viper.GetInt("database.max_open_conns"))

	log.Println("Database connection established")
	return nil
}

