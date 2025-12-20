package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/spf13/viper"
)

const contextClaimsKey = "authClaims"

type Role string

const (
	RoleStudent Role = "student"
	RoleCourier Role = "courier"
	RoleAdmin   Role = "admin"
)

type Claims struct {
	Role        Role   `json:"role"`
	UserID      int64  `json:"user_id,omitempty"`
	Phone       string `json:"phone,omitempty"`
	CourierID   int64  `json:"courier_id,omitempty"`
	CourierCode string `json:"courier_code,omitempty"`
	AdminID     int64  `json:"admin_id,omitempty"`
	Username    string `json:"username,omitempty"`

	jwt.RegisteredClaims
}

func JwtSecret() (string, error) {
	if s := strings.TrimSpace(os.Getenv("JWT_SECRET")); s != "" {
		return s, nil
	}
	if s := strings.TrimSpace(viper.GetString("jwt.secret")); s != "" {
		return s, nil
	}
	return "", errors.New("jwt secret not configured (set env JWT_SECRET or config jwt.secret)")
}

func IssueToken(claims Claims, ttl time.Duration) (string, error) {
	secret, err := JwtSecret()
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims.RegisteredClaims = jwt.RegisteredClaims{
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if h == "" || !strings.HasPrefix(strings.ToLower(h), "bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			c.Abort()
			return
		}

		raw := strings.TrimSpace(h[len("Bearer "):])
		if raw == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			c.Abort()
			return
		}

		secret, err := JwtSecret()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		parsed, err := jwt.ParseWithClaims(raw, &Claims{}, func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		claims, ok := parsed.Claims.(*Claims)
		if !ok || !parsed.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set(contextClaimsKey, claims)
		c.Next()
	}
}

func GetClaims(c *gin.Context) (*Claims, bool) {
	v, ok := c.Get(contextClaimsKey)
	if !ok {
		return nil, false
	}
	claims, ok := v.(*Claims)
	return claims, ok
}

func RequireRole(roles ...Role) gin.HandlerFunc {
	allowed := map[Role]struct{}{}
	for _, r := range roles {
		allowed[r] = struct{}{}
	}

	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing auth claims"})
			c.Abort()
			return
		}
		if _, ok := allowed[claims.Role]; !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			c.Abort()
			return
		}
		c.Next()
	}
}
