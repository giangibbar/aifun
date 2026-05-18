/**
 * ReminderService — Stores event reminders and sends Telegram notifications.
 */

import { getDatabase } from "../db/index.js";

interface Reminder {
  id: number;
  eventName: string;
  eventDate: string;
  sourceUrl: string;
  notified: boolean;
}

export class ReminderService {
  init() {
    const db = getDatabase();
    db.exec(`CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      source_url TEXT,
      notified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  }

  add(eventName: string, eventDate: string, sourceUrl: string): number {
    const db = getDatabase();
    const result = db.prepare(
      "INSERT INTO reminders (event_name, event_date, source_url) VALUES (?, ?, ?)"
    ).run(eventName, eventDate, sourceUrl);
    return result.lastInsertRowid as number;
  }

  remove(id: number) {
    const db = getDatabase();
    db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
  }

  getAll(): Reminder[] {
    const db = getDatabase();
    return db.prepare("SELECT * FROM reminders ORDER BY event_date").all() as Reminder[];
  }

  getDueReminders(): Reminder[] {
    const db = getDatabase();
    // Get reminders for events happening tomorrow that haven't been notified
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    return db.prepare(
      "SELECT * FROM reminders WHERE notified = 0 AND event_date LIKE ?"
    ).all(tomorrowStr + "%") as Reminder[];
  }

  markNotified(id: number) {
    const db = getDatabase();
    db.prepare("UPDATE reminders SET notified = 1 WHERE id = ?").run(id);
  }
}

export const reminderService = new ReminderService();
