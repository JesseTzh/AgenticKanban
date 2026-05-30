package config

import "testing"

func TestLoadDefaultsWebDistPath(t *testing.T) {
	t.Setenv("WEB_DIST_PATH", "")

	cfg := Load()

	if cfg.WebDistPath != "web/dist" {
		t.Fatalf("WebDistPath=%q", cfg.WebDistPath)
	}
}

func TestLoadWebDistPathFromEnvironment(t *testing.T) {
	t.Setenv("WEB_DIST_PATH", "/tmp/site")

	cfg := Load()

	if cfg.WebDistPath != "/tmp/site" {
		t.Fatalf("WebDistPath=%q", cfg.WebDistPath)
	}
}
