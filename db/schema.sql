CREATE TABLE IF NOT EXISTS providers (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  base_url         TEXT NOT NULL,
  description      TEXT,
  is_ego_service   INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tools (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  url              TEXT NOT NULL,
  description      TEXT,
  provider_id      TEXT NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  tags             TEXT NOT NULL DEFAULT '[]',
  icon_url         TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
