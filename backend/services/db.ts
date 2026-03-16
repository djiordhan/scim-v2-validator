import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// process.cwd() is always the backend/ directory (dev: ts-node-dev runs from there, prod: start script cds into it)
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'scim.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entra_config (
      id      INTEGER PRIMARY KEY CHECK (id = 1),
      scim_base_url TEXT NOT NULL DEFAULT '',
      token   TEXT NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO entra_config (id, scim_base_url, token) VALUES (1, '', '');

    CREATE TABLE IF NOT EXISTS entra_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name     TEXT NOT NULL UNIQUE,
      display_name  TEXT NOT NULL DEFAULT '',
      given_name    TEXT NOT NULL DEFAULT '',
      family_name   TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL DEFAULT '',
      active        INTEGER NOT NULL DEFAULT 1,
      scim_id       TEXT,
      sync_status   TEXT NOT NULL DEFAULT 'pending',
      last_synced_at TEXT,
      sync_error    TEXT
    );
  `);
}
