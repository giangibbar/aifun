import { Router, Request, Response } from "express";
import { reminderService } from "../services/ReminderService.js";

export const remindersRouter = Router();

remindersRouter.get("/", (_req: Request, res: Response) => {
  res.json(reminderService.getAll());
});

remindersRouter.post("/add", (req: Request, res: Response) => {
  const { eventName, eventDate, sourceUrl } = req.body;
  if (!eventName || !eventDate) {
    return res.status(400).json({ error: "eventName and eventDate required" });
  }
  const id = reminderService.add(eventName, eventDate, sourceUrl || "");
  res.json({ ok: true, id });
});

remindersRouter.delete("/:id", (req: Request, res: Response) => {
  reminderService.remove(parseInt(req.params.id));
  res.json({ ok: true });
});

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "../../telegram_config.json");

remindersRouter.post("/telegram", (req: Request, res: Response) => {
  const { token, chatId } = req.body;
  writeFileSync(configPath, JSON.stringify({ token, chatId }));
  // Also set env vars for the current process
  process.env.TELEGRAM_TOKEN = token;
  process.env.TELEGRAM_CHAT_ID = chatId;
  res.json({ ok: true });
});

remindersRouter.post("/test-telegram", async (_req: Request, res: Response) => {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.json({ ok: false, error: "Not configured" });
  try {
    await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "✅ AiFun: Telegram collegato correttamente!" }),
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.json({ ok: false, error: e.message });
  }
});
