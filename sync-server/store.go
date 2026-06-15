package main

import (
	"database/sql"
	"time"

	_ "modernc.org/sqlite"
)

// Record is one workspace row: ciphertext blob + non-secret metadata.
type Record struct {
	ID         string
	Revision   int
	Salt       string
	IV         string
	Ciphertext string
	UpdatedAt  string
	CreatedAt  string
}

// Store wraps the SQLite database holding encrypted workspace snapshots.
type Store struct {
	db *sql.DB
}

const schema = `
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,   -- hex SHA-256(authProof)
  revision    INTEGER NOT NULL,
  salt        TEXT NOT NULL,
  iv          TEXT NOT NULL,
  ciphertext  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);`

// OpenStore opens (or creates) the SQLite database at path and ensures the
// schema exists. Use ":memory:" for tests.
func OpenStore(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	// A single connection keeps an in-memory DB stable across queries and
	// serialises writes (SQLite is single-writer anyway).
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{db: db}, nil
}

// Close releases the underlying database handle.
func (s *Store) Close() error { return s.db.Close() }

// Get returns the record for id, or (nil, nil) when absent.
func (s *Store) Get(id string) (*Record, error) {
	row := s.db.QueryRow(
		`SELECT id, revision, salt, iv, ciphertext, updated_at, created_at FROM workspaces WHERE id = ?`,
		id,
	)
	var r Record
	err := row.Scan(&r.ID, &r.Revision, &r.Salt, &r.IV, &r.Ciphertext, &r.UpdatedAt, &r.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// Put upserts the workspace blob under a revision guard. If baseRevision does
// not match the current revision (0 when absent), it returns conflict=true and
// writes nothing. Otherwise it stores the blob at revision current+1 and
// returns the new revision.
func (s *Store) Put(id string, baseRevision int, salt, iv, ciphertext string) (newRev int, conflict bool, err error) {
	tx, err := s.db.Begin()
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback()

	var current int
	var createdAt string
	row := tx.QueryRow(`SELECT revision, created_at FROM workspaces WHERE id = ?`, id)
	switch err := row.Scan(&current, &createdAt); err {
	case sql.ErrNoRows:
		current = 0
		createdAt = ""
	case nil:
		// found
	default:
		return 0, false, err
	}

	if baseRevision != current {
		return current, true, nil
	}

	now := time.Now().UTC().Format(time.RFC3339)
	if createdAt == "" {
		createdAt = now
	}
	newRev = current + 1
	_, err = tx.Exec(
		`INSERT INTO workspaces (id, revision, salt, iv, ciphertext, updated_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		   revision = excluded.revision,
		   salt = excluded.salt,
		   iv = excluded.iv,
		   ciphertext = excluded.ciphertext,
		   updated_at = excluded.updated_at`,
		id, newRev, salt, iv, ciphertext, now, createdAt,
	)
	if err != nil {
		return 0, false, err
	}
	if err := tx.Commit(); err != nil {
		return 0, false, err
	}
	return newRev, false, nil
}
