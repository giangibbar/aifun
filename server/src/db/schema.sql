CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_scraped_at TEXT,
  last_scrape_status TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date_start TEXT NOT NULL,
  date_end TEXT,
  venue_name TEXT NOT NULL,
  venue_address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_id INTEGER REFERENCES sources(id),
  scraped_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES sources(id),
  status TEXT NOT NULL,
  events_found INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_coords ON events(lat, lng);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_start);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_id);
