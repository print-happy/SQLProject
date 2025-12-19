package main 

import (
	"campus-logistics/internal/handler"
	"campus-logistics/internal/repository"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func main() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("configs")

	if err:=viper.ReadInConfig(); err!=nil{
		log.Fatalf("Error reading config file: %s", err)

	}

	if err := repository.InitDB(); err != nil {
		log.Fatalf("Database initialization failed: %s", err)
	}

	r:=gin.Default()

	v1 := r.Group("/api/v1")
    {
		v1.POST("/inbound", handler.InboundHandler)
	}
	
	r.GET("/ping",func(c *gin.Context) {
		c.JSON(200,gin.H{
			"message":"pong",
            "db_status": "connected",
		})
	})

	port :=viper.GetString("server.port")
	log.Printf("Server starting on port %s... ",port)

	r.Run(":"+port)
}