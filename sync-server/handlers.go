package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

const maxBodyBytes = 5 << 20 // 5 MB

// Server wires the HTTP routes to the store.
type Server struct {
	store *Store
	mux   *http.ServeMux
}

// NewServer returns an http.Handler exposing /v1/pull and /v1/push.
func NewServer(store *Store) http.Handler {
	s := &Server{store: store, mux: http.NewServeMux()}
	s.mux.HandleFunc("/v1/pull", s.handlePull)
	s.mux.HandleFunc("/v1/push", s.handlePush)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }

// idFromAuth extracts the bearer authProof (hex), validates it, and returns the
// workspace id = hex(SHA-256(rawProofBytes)). The empty string means the token
// was missing or not valid hex (caller responds 401).
func idFromAuth(r *http.Request) string {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return ""
	}
	proofHex := strings.TrimSpace(h[len(prefix):])
	if proofHex == "" {
		return ""
	}
	raw, err := hex.DecodeString(proofHex)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (s *Server) handlePull(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := idFromAuth(r)
	if id == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	rec, err := s.store.Get(id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if rec == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"revision":   rec.Revision,
		"salt":       rec.Salt,
		"iv":         rec.IV,
		"ciphertext": rec.Ciphertext,
	})
}

type pushBody struct {
	BaseRevision int    `json:"baseRevision"`
	Salt         string `json:"salt"`
	IV           string `json:"iv"`
	Ciphertext   string `json:"ciphertext"`
}

func (s *Server) handlePush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := idFromAuth(r)
	if id == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var body pushBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	rev, conflict, err := s.store.Put(id, body.BaseRevision, body.Salt, body.IV, body.Ciphertext)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if conflict {
		writeJSON(w, http.StatusConflict, map[string]any{"currentRevision": rev})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"revision": rev})
}
