package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"agentic-kanban/internal/config"
	"agentic-kanban/internal/db"
	"agentic-kanban/internal/seed"
)

func main() {
	cfg := config.Load()
	if err := os.MkdirAll(filepath.Dir(cfg.SQLitePath), 0o755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}

	database, err := db.Open(cfg.SQLitePath)
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	defer database.Close()

	if err := db.Migrate(database, "migrations"); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	summary, err := seed.Run(context.Background(), database, cfg.SessionSecret)
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
	fmt.Printf("seed complete: created=%d skipped=%d\n", summary.Created, summary.Skipped)
}
