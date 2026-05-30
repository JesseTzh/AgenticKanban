package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"agentic-kanban/internal/auth"
	"agentic-kanban/internal/cache"
	"agentic-kanban/internal/config"
	"agentic-kanban/internal/db"
	"agentic-kanban/internal/httpapi"
	"agentic-kanban/internal/permission"
	"agentic-kanban/internal/store"
)

func main() {
	cfg := config.Load()
	logger := newLogger(cfg.LogLevel)

	if err := validateWebDistPath(cfg.WebDistPath); err != nil {
		logger.Error("validate web dist path failed", slog.Any("err", err))
		os.Exit(1)
	}

	if err := os.MkdirAll(filepath.Dir(cfg.SQLitePath), 0o755); err != nil {
		logger.Error("create data dir failed", slog.Any("err", err))
		os.Exit(1)
	}

	database, err := db.Open(cfg.SQLitePath)
	if err != nil {
		logger.Error("open sqlite failed", slog.Any("err", err))
		os.Exit(1)
	}
	defer database.Close()

	if err := db.Migrate(database, filepath.Join("migrations")); err != nil {
		logger.Error("migrate failed", slog.Any("err", err))
		os.Exit(1)
	}

	st := store.New(database, logger)
	if err := auth.EnsureDefaultAdmin(context.Background(), st, "admin", "admin123", cfg.SessionSecret); err != nil {
		logger.Error("ensure default admin failed", slog.Any("err", err))
		os.Exit(1)
	}

	c, err := cache.New()
	if err != nil {
		logger.Error("cache init failed", slog.Any("err", err))
		os.Exit(1)
	}
	defer c.Close()

	perm, err := permission.NewEnforcer()
	if err != nil {
		logger.Error("permission init failed", slog.Any("err", err))
		os.Exit(1)
	}

	r := httpapi.NewRouter(httpapi.Dependencies{
		Config: cfg,
		Logger: logger,
		Store:  st,
		Cache:  c,
		Perm:   perm,
	})

	srv := &http.Server{Addr: cfg.HTTPAddr, Handler: r, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		logger.Info("server started", slog.String("addr", cfg.HTTPAddr), slog.String("sqlite", cfg.SQLitePath))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", slog.Any("err", err))
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	logger.Info("server stopped")
}

func validateWebDistPath(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("%s is not a directory", path)
	}
	indexInfo, err := os.Stat(filepath.Join(path, "index.html"))
	if err != nil {
		return err
	}
	if !indexInfo.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", filepath.Join(path, "index.html"))
	}
	return nil
}

func newLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
}
