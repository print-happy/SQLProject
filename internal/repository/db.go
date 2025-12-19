// 包声明：repository 包负责数据访问层的初始化和管理
// 主要职责：数据库连接池的初始化和全局数据库实例的管理
package repository

// 导入所需的包
import (
    "fmt"     // 格式化字符串，用于构建连接字符串和错误信息
    "log"     // 标准日志库，用于记录数据库连接状态

    // sqlx 扩展了标准库 database/sql，提供更便捷的数据操作方法
    // 支持结构体标签绑定、命名参数等高级功能
    "github.com/jmoiron/sqlx"
    
    // PostgreSQL 数据库驱动，匿名导入（使用 _ ）只注册驱动而不直接使用
    // 驱动会在 database/sql 中注册，通过 "postgres" 标识符使用
    _ "github.com/lib/pq"
    
    // Viper 配置管理库，用于读取数据库连接配置
    "github.com/spf13/viper"
)

// DB 是一个全局的数据库连接池实例
// 使用 sqlx.DB 类型，它是对标准 sql.DB 的扩展
// 全局变量通常大写字母开头，表示包外可访问
// 注意：全局数据库实例需要在使用前通过 InitDB() 初始化
var DB *sqlx.DB

// InitDB 初始化数据库连接池
// 函数功能：读取配置文件，建立数据库连接，配置连接池参数
// 返回值：error - 如果初始化失败返回错误，成功返回 nil
func InitDB() error {
    // 1. 使用 Viper 读取配置并构建 PostgreSQL 连接字符串 (DSN)
    // DSN (Data Source Name) 格式：host=... port=... user=... password=... dbname=... sslmode=...
    // Viper 从配置文件中读取对应的配置项
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
        viper.GetString("database.host"),      // 数据库主机地址（如：localhost）
        viper.GetString("database.port"),      // 数据库端口（如：5432）
        viper.GetString("database.user"),      // 数据库用户名
        viper.GetString("database.password"),  // 数据库密码
        viper.GetString("database.dbname"),    // 数据库名称
        viper.GetString("database.sslmode"),   // SSL 模式（如：disable、require、verify-full）
    )

    // 声明错误变量，用于捕获连接过程中的错误
    var err error

    // 2. 使用 sqlx.Connect 建立数据库连接
    // 第一个参数 "postgres" 指定使用 PostgreSQL 驱动
    // 第二个参数 dsn 是连接字符串
    // Connect 函数会同时执行 Ping 操作，确保连接可用
    DB, err = sqlx.Connect("postgres", dsn)
    if err != nil {
        // 如果连接失败，使用 fmt.Errorf 包装错误信息
        // %w 动词将原始错误包装在新错误中，便于错误链追踪
        return fmt.Errorf("connect db failed: %w", err)
    }

    // 3. 配置数据库连接池参数
    // SetMaxIdleConns: 设置连接池中最大空闲连接数
    // 空闲连接可被后续操作复用，减少建立新连接的开销
    // 合理的值：通常设置为应用预期的并发连接数
    DB.SetMaxIdleConns(viper.GetInt("database.max_idle_conns"))

    // SetMaxOpenConns: 设置数据库最大打开连接数
    // 限制同时打开的连接总数，防止过多连接耗尽数据库资源
    // 建议值：根据数据库服务器的配置和应用负载调整
    DB.SetMaxOpenConns(viper.GetInt("database.max_open_conns"))

    // 4. 记录成功日志
    // 使用 log.Println 输出数据库连接成功的信息
    log.Println("Database connection established")
    
    // 返回 nil 表示初始化成功
    return nil
}