package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestValidateWebDistPath(t *testing.T) {
	t.Run("accepts directory with index", func(t *testing.T) {
		dist := t.TempDir()
		if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html></html>"), 0o644); err != nil {
			t.Fatal(err)
		}

		if err := validateWebDistPath(dist); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("rejects missing directory", func(t *testing.T) {
		if err := validateWebDistPath(filepath.Join(t.TempDir(), "missing")); err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("rejects directory without index", func(t *testing.T) {
		if err := validateWebDistPath(t.TempDir()); err == nil {
			t.Fatal("expected error")
		}
	})
}
