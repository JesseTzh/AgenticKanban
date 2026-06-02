package auth_test

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"agentic-kanban/internal/auth"
	"agentic-kanban/internal/db"
	"agentic-kanban/internal/domain"
	"agentic-kanban/internal/store"
)

func newTestStore(t *testing.T) *store.Store {
	t.Helper()
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close() })
	if err := db.Migrate(database, "../../migrations"); err != nil {
		t.Fatal(err)
	}
	return store.New(database, slog.New(slog.NewTextHandler(os.Stdout, nil)))
}

func TestEnsureInitialAdminCreatesRandomPasswordForEmptyUsers(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	secret := "test-session-secret"

	password, created, err := auth.EnsureInitialAdmin(ctx, st, "admin", secret)
	if err != nil {
		t.Fatal(err)
	}
	if !created {
		t.Fatal("expected admin to be created")
	}
	if len(password) != 24 {
		t.Fatalf("password length=%d", len(password))
	}
	admin, err := st.GetUserByUsername(ctx, "admin")
	if err != nil {
		t.Fatal(err)
	}
	if admin.Role != domain.RoleAdmin {
		t.Fatalf("role=%s", admin.Role)
	}
	if !auth.VerifyPassword(password, admin.PasswordHash, secret) {
		t.Fatal("generated password does not verify")
	}

	nextPassword, nextCreated, err := auth.EnsureInitialAdmin(ctx, st, "admin", secret)
	if err != nil {
		t.Fatal(err)
	}
	if nextCreated || nextPassword != "" {
		t.Fatalf("nextCreated=%v nextPassword=%q", nextCreated, nextPassword)
	}
}

func TestEnsureInitialAdminSkipsNonEmptyUsers(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	if err := st.CreateUser(ctx, domain.User{ID: "usr-existing", Username: "manager", PasswordHash: "hash", Role: domain.RoleManager}); err != nil {
		t.Fatal(err)
	}

	password, created, err := auth.EnsureInitialAdmin(ctx, st, "admin", "test-session-secret")
	if err != nil {
		t.Fatal(err)
	}
	if created || password != "" {
		t.Fatalf("created=%v password=%q", created, password)
	}
	if _, err := st.GetUserByUsername(ctx, "admin"); err != store.ErrNotFound {
		t.Fatalf("admin err=%v", err)
	}
}
