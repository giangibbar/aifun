/**
 * LLMService — Wrapper per OpenAI API (GPT-4o-mini).
 *
 * Fornisce metodi per:
 * - Estrazione eventi da contenuto HTML
 * - Generazione raccomandazioni personalizzate
 * - Chat conversazionale sugli eventi disponibili
 *
 * Retry policy: 1 retry con backoff esponenziale (2s) per errori 5xx.
 * Timeout: 5s per chat, 10s per raccomandazioni/estrazione.
 */

import OpenAI from 'openai';
import type { ChatMessage, EventCategory, EventSummary } from '../types/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedEvent {
  name: string;
  dateStart: string;
  dateEnd?: string;
  venueName: string;
  venueAddress?: string;
  description?: string;
  category: EventCategory;
}

export interface LLMRecommendation {
  eventId: number;
  reason: string;
}

export interface ChatResponse {
  reply: string;
  suggestedEventIds?: number[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = process.env.LLM_MODEL || 'qwen2.5:1.5b';
const CHAT_TIMEOUT_MS = 90000;        // 90s — modelli locali su RPi sono lenti
const RECOMMENDATION_TIMEOUT_MS = 120000; // 2 min
const EXTRACTION_TIMEOUT_MS = 120000;     // 2 min
const MAX_RETRIES = 1;
const BASE_BACKOFF_MS = 2000;

const VALID_CATEGORIES: EventCategory[] = [
  'musica', 'teatro', 'cinema', 'arte', 'sport',
  'food', 'nightlife', 'festival', 'conferenza', 'altro',
];

// ─── Service ─────────────────────────────────────────────────────────────────

export class LLMService {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const baseURL = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';
    const key = apiKey || process.env.OPENAI_API_KEY || 'ollama'; // Ollama non richiede una vera key

    this.client = new OpenAI({ apiKey: key, baseURL });
  }

  /**
   * Estrae eventi strutturati da contenuto HTML grezzo.
   * Invia il contenuto a GPT-4o-mini con un prompt che richiede un array JSON.
   */
  async extractEvents(htmlContent: string): Promise<ExtractedEvent[]> {
    const systemPrompt = `Sei un assistente specializzato nell'estrazione di informazioni su eventi da pagine web.
Analizza il contenuto HTML fornito e identifica tutti gli eventi menzionati.

Per ogni evento trovato, restituisci un oggetto JSON con i seguenti campi:
- name (string, obbligatorio): nome dell'evento
- dateStart (string, obbligatorio): data e ora di inizio in formato ISO 8601 (es. "2024-03-15T20:00:00")
- dateEnd (string, opzionale): data e ora di fine in formato ISO 8601
- venueName (string, obbligatorio): nome del locale/venue
- venueAddress (string, opzionale): indirizzo completo del locale
- description (string, opzionale): breve descrizione dell'evento
- category (string, obbligatorio): una tra: musica, teatro, cinema, arte, sport, food, nightlife, festival, conferenza, altro

Rispondi SOLO con un array JSON valido. Se non trovi eventi, rispondi con un array vuoto [].
Non includere spiegazioni o testo aggiuntivo, solo il JSON.`;

    const userPrompt = `Estrai tutti gli eventi dal seguente contenuto HTML:\n\n${htmlContent}`;

    const response = await this.callWithRetry(
      systemPrompt,
      userPrompt,
      EXTRACTION_TIMEOUT_MS
    );

    return this.parseExtractedEvents(response);
  }

  /**
   * Genera raccomandazioni personalizzate basate sugli eventi disponibili.
   * Restituisce fino a 3 raccomandazioni con motivazione in italiano.
   */
  async generateRecommendations(
    events: EventSummary[],
    preferences?: string
  ): Promise<LLMRecommendation[]> {
    if (events.length === 0) {
      return [];
    }

    const eventsDescription = events.map((e) =>
      `[ID: ${e.id}] "${e.name}" - ${e.category} - ${e.venueName} - ${e.dateStart} - ${e.distanceKm.toFixed(1)} km`
    ).join('\n');

    const systemPrompt = `Sei un assistente locale italiano che consiglia eventi nella zona dell'utente.
Rispondi SEMPRE in italiano.

Analizza la lista di eventi disponibili e suggerisci fino a 3 eventi che potrebbero interessare l'utente.
Per ogni raccomandazione, fornisci una motivazione breve e coinvolgente in italiano.

Considera:
- La data e l'ora corrente (suggerisci eventi imminenti)
- La distanza dall'utente (preferisci eventi più vicini)
- La varietà delle categorie
${preferences ? `- Le preferenze dell'utente: "${preferences}"` : ''}

Rispondi SOLO con un array JSON valido con questa struttura:
[
  { "eventId": <id numerico dell'evento>, "reason": "<motivazione in italiano>" }
]

Massimo 3 raccomandazioni. Se ci sono meno di 3 eventi disponibili, raccomandali tutti.
Non includere spiegazioni o testo aggiuntivo, solo il JSON.`;

    const userPrompt = `Eventi disponibili:\n${eventsDescription}\n\nData e ora corrente: ${new Date().toISOString()}`;

    const response = await this.callWithRetry(
      systemPrompt,
      userPrompt,
      RECOMMENDATION_TIMEOUT_MS
    );

    return this.parseRecommendations(response, events);
  }

  /**
   * Gestisce una conversazione chat sugli eventi disponibili.
   * Risponde in italiano con suggerimenti basati sul contesto.
   */
  async chat(
    message: string,
    history: ChatMessage[],
    context: { availableEvents: EventSummary[] }
  ): Promise<ChatResponse> {
    const eventsContext = context.availableEvents.length > 0
      ? context.availableEvents.map((e) =>
          `[ID: ${e.id}] "${e.name}" - ${e.category} - ${e.venueName} - ${e.dateStart} - ${e.distanceKm.toFixed(1)} km`
        ).join('\n')
      : 'Nessun evento disponibile al momento.';

    const systemPrompt = `Sei un assistente locale italiano amichevole che aiuta le persone a trovare eventi interessanti nella loro zona.
Rispondi SEMPRE in italiano, in modo naturale e conversazionale.

Hai accesso alla seguente lista di eventi disponibili nella zona dell'utente:
${eventsContext}

Regole:
- Rispondi in italiano in modo naturale e amichevole
- Basa i tuoi suggerimenti sugli eventi disponibili nella lista
- Se l'utente chiede qualcosa di specifico, cerca di trovare eventi pertinenti dalla lista
- Se non ci sono eventi che corrispondono alla richiesta, dillo gentilmente e suggerisci alternative
- Puoi menzionare gli ID degli eventi quando li suggerisci (formato: suggestedEventIds nel JSON)
- Mantieni le risposte concise ma utili

Rispondi con un JSON valido con questa struttura:
{ "reply": "<la tua risposta in italiano>", "suggestedEventIds": [<id degli eventi suggeriti, opzionale>] }

Non includere spiegazioni o testo aggiuntivo fuori dal JSON.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const response = await this.callWithRetryMessages(
      messages,
      CHAT_TIMEOUT_MS
    );

    return this.parseChatResponse(response);
  }

  // ─── Private Methods ─────────────────────────────────────────────────────────

  /**
   * Chiama l'API OpenAI con retry per errori 5xx.
   * Usa system + user prompt semplici.
   */
  private async callWithRetry(
    systemPrompt: string,
    userPrompt: string,
    timeoutMs: number
  ): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return this.callWithRetryMessages(messages, timeoutMs);
  }

  /**
   * Chiama l'API OpenAI con un array di messaggi e retry per errori 5xx.
   */
  private async callWithRetryMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    timeoutMs: number
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const completion = await this.client.chat.completions.create(
            {
              model: MODEL,
              messages,
              temperature: 0.7,
              max_tokens: 2000,
            },
            {
              signal: controller.signal as any,
            }
          );

          clearTimeout(timeoutId);

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error('Empty response from OpenAI API');
          }

          return content.trim();
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error: any) {
        lastError = error;

        // Don't retry on abort (timeout)
        if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
          throw new Error(`LLM request timed out after ${timeoutMs}ms`);
        }

        // Only retry on 5xx errors
        const status = error?.status || error?.response?.status;
        if (status && status >= 500 && status < 600 && attempt < MAX_RETRIES) {
          const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(backoffMs);
          continue;
        }

        // Don't retry on 4xx or other errors
        throw error;
      }
    }

    throw lastError || new Error('LLM request failed after retries');
  }

  /**
   * Parsa la risposta dell'LLM per l'estrazione eventi.
   * Scarta eventi con campi obbligatori mancanti.
   */
  private parseExtractedEvents(response: string): ExtractedEvent[] {
    let parsed: any[];

    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => this.isValidExtractedEvent(item))
      .map((item) => ({
        name: String(item.name).trim(),
        dateStart: String(item.dateStart),
        dateEnd: item.dateEnd ? String(item.dateEnd) : undefined,
        venueName: String(item.venueName).trim(),
        venueAddress: item.venueAddress ? String(item.venueAddress).trim() : undefined,
        description: item.description ? String(item.description).trim() : undefined,
        category: this.normalizeCategory(item.category),
      }));
  }

  /**
   * Verifica che un evento estratto abbia tutti i campi obbligatori.
   */
  private isValidExtractedEvent(item: any): boolean {
    if (!item || typeof item !== 'object') return false;
    if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') return false;
    if (!item.dateStart || typeof item.dateStart !== 'string') return false;
    if (!item.venueName || typeof item.venueName !== 'string' || item.venueName.trim() === '') return false;
    if (!item.category || typeof item.category !== 'string') return false;

    // Validate dateStart is a parseable date
    const date = new Date(item.dateStart);
    if (isNaN(date.getTime())) return false;

    return true;
  }

  /**
   * Normalizza la categoria a un valore valido dell'enum.
   */
  private normalizeCategory(category: string): EventCategory {
    const normalized = category.toLowerCase().trim();
    if (VALID_CATEGORIES.includes(normalized as EventCategory)) {
      return normalized as EventCategory;
    }
    return 'altro';
  }

  /**
   * Parsa la risposta dell'LLM per le raccomandazioni.
   */
  private parseRecommendations(response: string, events: EventSummary[]): LLMRecommendation[] {
    let parsed: any[];

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validEventIds = new Set(events.map((e) => e.id));

    return parsed
      .filter((item) =>
        item &&
        typeof item === 'object' &&
        typeof item.eventId === 'number' &&
        validEventIds.has(item.eventId) &&
        typeof item.reason === 'string' &&
        item.reason.trim() !== ''
      )
      .slice(0, 3)
      .map((item) => ({
        eventId: item.eventId,
        reason: String(item.reason).trim(),
      }));
  }

  /**
   * Parsa la risposta dell'LLM per la chat.
   */
  private parseChatResponse(response: string): ChatResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed.reply === 'string') {
          return {
            reply: parsed.reply,
            suggestedEventIds: Array.isArray(parsed.suggestedEventIds)
              ? parsed.suggestedEventIds.filter((id: any) => typeof id === 'number')
              : undefined,
          };
        }
      }
    } catch {
      // If JSON parsing fails, use the raw response as the reply
    }

    // Fallback: use the entire response as the reply text
    return {
      reply: response,
      suggestedEventIds: undefined,
    };
  }

  /**
   * Sleep helper per il backoff esponenziale.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
