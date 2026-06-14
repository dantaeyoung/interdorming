package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Frozen cross-language vector — MUST match the constants in
// src/features/sync/crypto.test.ts (VECTOR_AUTH_PROOF_HEX / VECTOR_WORKSPACE_ID).
// The client derives authProof from password "test-vector-pw" using the FIXED
// app salt "dormsync-auth-v1" (identity is password-only, no per-workspace
// salt); the server must hash that same proof into the same workspace id.
// Change one, change both.
const vectorAuthProofHex = "ace19f007a7a3e1d86df14ea3e0fa2ab0155f6ddbdd49d5995d501e5f49fe385"
const vectorWorkspaceID = "7babbdb1c3de7d98c121ebc5f8fc05f89611eaf1ec2f19e5cdd41e643fd4c99c"

func TestWorkspaceIdVector(t *testing.T) {
	req := httptest.NewRequest("POST", "/v1/pull", nil)
	req.Header.Set("Authorization", "Bearer "+vectorAuthProofHex)
	if got := idFromAuth(req); got != vectorWorkspaceID {
		t.Fatalf("workspace id mismatch:\n got  %s\n want %s", got, vectorWorkspaceID)
	}
}

func mustStore(t *testing.T) *Store {
	t.Helper()
	s, err := OpenStore(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	return s
}

// doReq issues a request with an optional bearer proof and raw body.
func doReq(srv http.Handler, method, path, proof, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if proof != "" {
		req.Header.Set("Authorization", "Bearer "+proof)
	}
	rr := httptest.NewRecorder()
	srv.ServeHTTP(rr, req)
	return rr
}

// doJSON is doReq with a JSON content-type.
func doJSON(srv http.Handler, method, path, proof, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if proof != "" {
		req.Header.Set("Authorization", "Bearer "+proof)
	}
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	srv.ServeHTTP(rr, req)
	return rr
}

func TestPullUnauthorized(t *testing.T) {
	srv := NewServer(mustStore(t))
	if rr := doReq(srv, "POST", "/v1/pull", "", ""); rr.Code != 401 {
		t.Fatalf("want 401 got %d", rr.Code)
	}
	// non-hex bearer is also rejected
	if rr := doReq(srv, "POST", "/v1/pull", "nothex!!", ""); rr.Code != 401 {
		t.Fatalf("want 401 for bad hex got %d", rr.Code)
	}
}

func TestPullUnknownWorkspace(t *testing.T) {
	srv := NewServer(mustStore(t))
	if rr := doReq(srv, "POST", "/v1/pull", "deadbeef", ""); rr.Code != 404 {
		t.Fatalf("want 404 got %d", rr.Code)
	}
}

func TestPushThenPull(t *testing.T) {
	srv := NewServer(mustStore(t))
	proof := "deadbeef"
	rr := doJSON(srv, "POST", "/v1/push", proof, `{"baseRevision":0,"salt":"s","iv":"i","ciphertext":"c"}`)
	if rr.Code != 200 {
		t.Fatalf("push code %d body %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"revision":1`) {
		t.Fatalf("want revision 1 got %s", rr.Body.String())
	}
	rr = doReq(srv, "POST", "/v1/pull", proof, "")
	if rr.Code != 200 {
		t.Fatalf("pull code %d", rr.Code)
	}
	body := rr.Body.String()
	if !strings.Contains(body, `"revision":1`) || !strings.Contains(body, `"ciphertext":"c"`) ||
		!strings.Contains(body, `"salt":"s"`) || !strings.Contains(body, `"iv":"i"`) {
		t.Fatalf("pull body missing fields: %s", body)
	}
}

func TestPushConflict(t *testing.T) {
	srv := NewServer(mustStore(t))
	proof := "deadbeef"
	doJSON(srv, "POST", "/v1/push", proof, `{"baseRevision":0,"salt":"s","iv":"i","ciphertext":"c"}`)
	rr := doJSON(srv, "POST", "/v1/push", proof, `{"baseRevision":0,"salt":"s","iv":"i","ciphertext":"c2"}`)
	if rr.Code != 409 {
		t.Fatalf("want 409 got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), `"currentRevision":1`) {
		t.Fatalf("want currentRevision 1 got %s", rr.Body.String())
	}
}

func TestPushTooLarge(t *testing.T) {
	srv := NewServer(mustStore(t))
	big := strings.Repeat("a", 6*1024*1024) // 6 MB > 5 MB cap
	body := `{"baseRevision":0,"salt":"s","iv":"i","ciphertext":"` + big + `"}`
	rr := doJSON(srv, "POST", "/v1/push", "deadbeef", body)
	if rr.Code != 413 {
		t.Fatalf("want 413 got %d", rr.Code)
	}
}
