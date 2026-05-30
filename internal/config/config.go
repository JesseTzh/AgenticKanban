package config

import (
	"os"
	"time"
)

type Config struct {
	AppEnv           string
	HTTPAddr         string
	SQLitePath       string
	SessionSecret    string
	SessionTTL       time.Duration
	AgentTokenSecret string
	WebhookBaseURL   string
	WebDistPath      string
	LogLevel         string
}

func Load() Config {
	return Config{
		AppEnv:           env("APP_ENV", "dev"),
		HTTPAddr:         env("HTTP_ADDR", ":8080"),
		SQLitePath:       env("SQLITE_PATH", "data/agentic-kanban.db"),
		SessionSecret:    env("SESSION_SECRET", "dev-session-secret-change-me"),
		SessionTTL:       durationEnv("SESSION_TTL", 24*time.Hour),
		AgentTokenSecret: env("AGENT_TOKEN_SECRET", "dev-agent-token-secret-change-me"),
		WebhookBaseURL:   env("WEBHOOK_BASE_URL", "http://localhost:8080"),
		WebDistPath:      env("WEB_DIST_PATH", "web/dist"),
		LogLevel:         env("LOG_LEVEL", "info"),
	}
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

func durationEnv(k string, fallback time.Duration) time.Duration {
	if v := os.Getenv(k); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
