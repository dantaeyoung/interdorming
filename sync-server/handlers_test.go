package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

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
