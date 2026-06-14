package main

import "testing"

func TestStorePutGet(t *testing.T) {
	s, err := OpenStore(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if rec, _ := s.Get("abc"); rec != nil {
		t.Fatal("expected nil")
	}
	rev, conflict, err := s.Put("abc", 0, "salt", "iv", "ct")
	if err != nil || conflict {
		t.Fatalf("put failed: %v conflict=%v", err, conflict)
	}
	if rev != 1 {
		t.Fatalf("want rev 1 got %d", rev)
	}
	rec, _ := s.Get("abc")
	if rec == nil || rec.Revision != 1 || rec.Ciphertext != "ct" {
		t.Fatalf("bad rec %+v", rec)
	}
}
