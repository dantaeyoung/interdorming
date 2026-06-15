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
	return withCORS(s)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }

// withCORS allows the static app (served from a different origin, e.g.
// app.<domain> calling sync.<domain>) to reach the API. Auth is a bearer proof
// in the Authorization header — there are no cookies — so an open origin is
// safe: the proof, not the origin, is what authorizes.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

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

func isHex(s string) bool {
	_, err := hex.DecodeString(s)
	return err == nil
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
	// Reject malformed blobs up front: salt/iv/ciphertext must be present and
	// valid hex. A buggy or hostile client (even with a valid proof) shouldn't
	// be able to store garbage that breaks decryption for every other device.
	if !isHex(body.Salt) || !isHex(body.IV) || !isHex(body.Ciphertext) ||
		body.Salt == "" || body.IV == "" || body.Ciphertext == "" {
		http.Error(w, "salt, iv and ciphertext must be non-empty hex", http.StatusBadRequest)
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
