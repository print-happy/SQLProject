package service

import (
	"crypto/subtle"
	"errors"
	"os"
	"strings"
	"time"

	"campus-logistics/internal/middleware"
	"campus-logistics/internal/model"
	"campus-logistics/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

const defaultTokenTTL = 24 * time.Hour

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
	Role        string `json:"role"`
}

func AdminLogin(username, password string) (*TokenResponse, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return nil, ErrInvalidCredentials
	}

	// Preferred: admin credentials provided via environment variables.
	// Supports plain text or bcrypt hash in ADMIN_PASSWORD.
	// If ADMIN_USERNAME is set, we require ADMIN_PASSWORD as well.
	if envUser := strings.TrimSpace(os.Getenv("ADMIN_USERNAME")); envUser != "" {
		envPass := strings.TrimSpace(os.Getenv("ADMIN_PASSWORD"))
		if envPass == "" {
			return nil, ErrInvalidCredentials
		}
		if subtle.ConstantTimeCompare([]byte(envUser), []byte(username)) != 1 {
			return nil, ErrInvalidCredentials
		}
		if !verifyPassword(envPass, password) {
			return nil, ErrInvalidCredentials
		}

		tok, err := middleware.IssueToken(middleware.Claims{
			Role:     middleware.RoleAdmin,
			AdminID:  0,
			Username: envUser,
		}, defaultTokenTTL)
		if err != nil {
			return nil, err
		}

		return &TokenResponse{
			AccessToken: tok,
			TokenType:   "Bearer",
			ExpiresIn:   int64(defaultTokenTTL.Seconds()),
			Role:        string(middleware.RoleAdmin),
		}, nil
	}

	a, err := repository.GetAdminByUsername(username)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !verifyPassword(a.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	_ = repository.TouchAdminLastLogin(a.ID)

	tok, err := middleware.IssueToken(middleware.Claims{
		Role:     middleware.RoleAdmin,
		AdminID:  a.ID,
		Username: a.Username,
	}, defaultTokenTTL)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresIn:   int64(defaultTokenTTL.Seconds()),
		Role:        string(middleware.RoleAdmin),
	}, nil
}

func StudentLogin(phone, name string) (*TokenResponse, error) {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	if phone == "" {
		return nil, ErrInvalidCredentials
	}
	if name == "" {
		name = "同学"
	}

	u, err := repository.GetUserByPhone(phone)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			u, err = repository.CreateUser(phone, name)
		}
	}
	if err != nil {
		return nil, err
	}

	tok, err := middleware.IssueToken(middleware.Claims{
		Role:   middleware.RoleStudent,
		UserID: u.ID,
		Phone:  u.Phone,
	}, defaultTokenTTL)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresIn:   int64(defaultTokenTTL.Seconds()),
		Role:        string(middleware.RoleStudent),
	}, nil
}

func CourierLogin(courierCode string) (*TokenResponse, error) {
	courierCode = strings.TrimSpace(courierCode)
	if courierCode == "" {
		return nil, ErrInvalidCredentials
	}

	c, err := repository.GetCourierByCode(courierCode)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	tok, err := middleware.IssueToken(middleware.Claims{
		Role:        middleware.RoleCourier,
		CourierID:   c.ID,
		CourierCode: c.Code,
	}, defaultTokenTTL)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresIn:   int64(defaultTokenTTL.Seconds()),
		Role:        string(middleware.RoleCourier),
	}, nil
}

func verifyPassword(storedHash, password string) bool {
	storedHash = strings.TrimSpace(storedHash)
	if storedHash == "" {
		return false
	}
	// If it looks like a bcrypt hash, verify using bcrypt.
	if strings.HasPrefix(storedHash, "$2a$") || strings.HasPrefix(storedHash, "$2b$") || strings.HasPrefix(storedHash, "$2y$") {
		return bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)) == nil
	}
	// Demo fallback: constant-time compare for plain-text seed values.
	return subtle.ConstantTimeCompare([]byte(storedHash), []byte(password)) == 1
}

// Expose models for handlers that may want to return profile later.
func GetCourierTasksForCourier(courierID int64, page, pageSize int) ([]model.CourierTask, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize
	return repository.GetCourierTasks(courierID, pageSize, offset)
}
