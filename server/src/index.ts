/**
 * Express server entry point.
 */

import express from "express";
import cors from "cors";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { eventsRouter } from "./routes/events.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { chatRouter } from "./routes/chat.js";
import { sourcesRouter } from "./routes/sources.js";
import { geocodeRouter } from "./routes/geocode.js";
import { getDatabase } from "./db/index.js";
import { remindersRouter } from "./routes/reminders.js";
import { reminderService } from "./services/ReminderService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../../client/dist"), { maxAge: "1d" }));

app.use("/api/events", eventsRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/geocode", geocodeRouter);
app.use("/api/reminders", remindersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Errore interno del server" });
});

getDatabase();
reminderService.init();

// Check reminders every hour and send Telegram notifications
setInterval(async () => {
  const due = reminderService.getDueReminders();
  for (const r of due) {
    try {
      const token = process.env.TELEGRAM_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        const text = "🔔 Promemoria evento domani!\n\n" + r.eventName + "\n" + r.eventDate + (r.sourceUrl ? "\n" + r.sourceUrl : "");
        await fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
      }
      reminderService.markNotified(r.id);
    } catch {}
  }
}, 3600000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
