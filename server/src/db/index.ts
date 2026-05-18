import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/events.db');

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database instance.
 * Initializes the schema and seeds default sources on first call.
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  // Ensure the data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  seedDefaultSources(db);

  return db;
}

/**
 * Initialize the database schema from schema.sql
 */
function initializeSchema(database: Database.Database): void {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
}

/**
 * Seed default sources (Eventbrite, Facebook Events, pagine comuni).
 * Only inserts if the sources don't already exist.
 */
function seedDefaultSources(database: Database.Database): void {
  const defaultSources = [
    {
      url: 'https://www.eventbrite.it',
      name: 'Eventbrite',
    },
    {
      url: 'https://www.facebook.com/events',
      name: 'Facebook Events',
    },
    {
      url: 'https://www.comuni.it/eventi',
      name: 'Pagine Comuni',
    },
  ];

  const insertStmt = database.prepare(
    `INSERT OR IGNORE INTO sources (url, name, is_default, is_active)
     VALUES (@url, @name, TRUE, TRUE)`
  );

  const insertMany = database.transaction((sources: typeof defaultSources) => {
    for (const source of sources) {
      insertStmt.run(source);
    }
  });

  insertMany(defaultSources);
}

/**
 * Close the database connection. Useful for testing and graceful shutdown.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
