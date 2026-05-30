package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"agentic-kanban/internal/domain"
	"agentic-kanban/internal/store"
	"agentic-kanban/internal/utils"
)

func HashPassword(password, secret string) string { return mac(password, secret) }
func VerifyPassword(password, hash, secret string) bool {
	return hmac.Equal([]byte(HashPassword(password, secret)), []byte(hash))
}
func HashToken(token, secret string) string { return mac(token, secret) }

func mac(value, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(value))
	return hex.EncodeToString(h.Sum(nil))
}

func NewOpaqueToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func EnsureDefaultAdmin(ctx context.Context, st *store.Store, username, password, secret string) error {
	_, err := st.GetUserByUsername(ctx, username)
	if err == nil {
		return nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return err
	}
	return st.CreateUser(ctx, domain.User{ID: utils.NewID("usr"), Username: username, PasswordHash: HashPassword(password, secret), Role: domain.RoleAdmin})
}

func CreateSession(ctx context.Context, st *store.Store, userID string, ttl time.Duration, tokenSecret string) (rawToken string, err error) {
	rawToken = NewOpaqueToken()
	return rawToken, st.CreateSession(ctx, domain.Session{ID: HashToken(rawToken, tokenSecret), UserID: userID, ExpiresAt: time.Now().Add(ttl).UTC().Format(time.RFC3339)})
}
