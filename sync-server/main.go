package main

import (
	"log"
	"net/http"
	"os"
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	port := getenv("PORT", "8787")
	dbPath := getenv("DB_PATH", "./sync.db")

	store, err := OpenStore(dbPath)
	if err != nil {
		log.Fatalf("failed to open store at %s: %v", dbPath, err)
	}
	defer store.Close()

	srv := NewServer(store)
	addr := ":" + port
	log.Printf("dormsync listening on %s (db=%s)", addr, dbPath)
	if err := http.ListenAndServe(addr, srv); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
