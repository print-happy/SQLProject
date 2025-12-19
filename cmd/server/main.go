package main // 声明当前文件属于 main 包，是程序的入口点

// 导入所需的包
import (
    "campus-logistics/internal/handler"   // 项目内部的处理函数包，包含业务逻辑处理器
    "campus-logistics/internal/repository" // 项目内部的数据访问层包，负责数据库操作
    "log"                                  // Go标准日志库，用于记录程序运行状态

    "github.com/gin-gonic/gin"             // Gin Web框架，用于构建HTTP API服务器
    "github.com/spf13/viper"               // Viper配置管理库，用于读取配置文件
)

// main 函数是程序的入口点，程序从此处开始执行
func main() {
    // ==================== 配置初始化部分 ====================
    // 设置Viper配置文件的名称（不含扩展名）
    viper.SetConfigName("config")
    // 设置配置文件的格式为YAML
    viper.SetConfigType("yaml")
    // 添加配置文件的搜索路径，Viper会在该目录下查找配置文件
    viper.AddConfigPath("configs")

    // 读取并解析配置文件
    // 如果读取失败，记录错误日志并终止程序运行
    if err := viper.ReadInConfig(); err != nil {
        // log.Fatalf会在打印错误信息后调用os.Exit(1)终止程序
        log.Fatalf("Error reading config file: %s", err)
    }

    // ==================== 数据库初始化部分 ====================
    // 调用repository包的InitDB函数初始化数据库连接
    // 如果初始化失败，记录错误日志并终止程序运行
    if err := repository.InitDB(); err != nil {
        log.Fatalf("Database initialization failed: %s", err)
    }

    // ==================== 路由初始化部分 ====================
    // 创建一个默认的Gin引擎实例
    // Default()函数会附加Logger和Recovery两个中间件，用于日志记录和错误恢复
    r := gin.Default()

    // 创建API版本分组v1，所有以/api/v1开头的请求都会进入该分组
    v1 := r.Group("/api/v1")
    {
        // 定义入库接口：POST /api/v1/inbound
        // 用于处理包裹入库请求，handler.InboundHandler是具体的处理函数
        v1.POST("/inbound", handler.InboundHandler)
        
        // 定义取件接口：POST /api/v1/pickup
        // 用于处理用户取件请求，handler.PickupHandler是具体的处理函数
        v1.POST("/pickup", handler.PickupHandler)
        
        // 定义查询接口：GET /api/v1/parcels
        // 用于查询当前用户的包裹列表，handler.GetMyParcelHandler是具体的处理函数
        v1.GET("/parcels", handler.GetMyParcelHandler)
    }

    // 定义健康检查端点：GET /ping
    // 用于检查服务器和数据库的健康状态
    r.GET("/ping", func(c *gin.Context) {
        // 返回JSON响应，包含服务器状态和数据库连接状态
        c.JSON(200, gin.H{
            "message":   "pong",           // 表示服务器正常运行
            "db_status": "connected",      // 表示数据库连接正常
        })
    })

    // ==================== 服务器启动部分 ====================
    // 从Viper配置中获取服务器端口号
    // 配置项"server.port"需要在配置文件中定义
    port := viper.GetString("server.port")
    
    // 在控制台输出服务器启动信息
    log.Printf("Server starting on port %s... ", port)
    
    // 启动HTTP服务器，监听指定端口
    // Run()函数会阻塞当前goroutine，直到服务器关闭
    r.Run(":" + port)
}