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

func TestStoreConflict(t *testing.T) {
	s, _ := OpenStore(":memory:")
	s.Put("abc", 0, "s", "i", "v1")                   // rev -> 1
	_, conflict, _ := s.Put("abc", 0, "s", "i", "v2") // stale base 0, current 1
	if !conflict {
		t.Fatal("expected conflict")
	}
	rec, _ := s.Get("abc")
	if rec.Ciphertext != "v1" {
		t.Fatal("stale write must not overwrite")
	}
	rev, conflict, _ := s.Put("abc", 1, "s", "i", "v2") // correct base
	if conflict || rev != 2 {
		t.Fatalf("expected rev 2, got %d conflict=%v", rev, conflict)
	}
}
