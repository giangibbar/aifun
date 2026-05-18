/**
 * Shared TypeScript interfaces and types for Local Events Finder.
 * Defines domain models and API request/response contracts.
 */

// ─── Domain Models ───────────────────────────────────────────────────────────

/**
 * Categorie di eventi supportate dall'applicazione.
 */
export type EventCategory =
  | 'musica'
  | 'teatro'
  | 'cinema'
  | 'arte'
  | 'sport'
  | 'food'
  | 'nightlife'
  | 'festival'
  | 'conferenza'
  | 'altro';

/**
 * Evento completo con tutti i dettagli.
 */
export interface Event {
  id: number;
  name: string;
  dateStart: string;    // ISO datetime
  dateEnd?: string;     // ISO datetime
  venueName: string;
  venueAddress?: string;
  lat: number;
  lng: number;
  description?: string;
  category: EventCategory;
  sourceUrl: string;
  sourceId: number;
  scrapedAt: string;
}

/**
 * Riepilogo evento per liste e risultati di ricerca.
 */
export interface EventSummary {
  id: number;
  name: string;
  dateStart: string;
  venueName: string;
  distanceKm: number;
  category: EventCategory;
}

/**
 * Venue con lista degli eventi associati.
 */
export interface Venue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  events: EventSummary[];
}

/**
 * Fonte dati per lo scraping degli eventi.
 */
export interface Source {
  id: number;
  url: string;
  name?: string;
  isDefault: boolean;
  isActive: boolean;
  lastScrapedAt?: string;
  lastScrapeStatus?: 'success' | 'error';
}

/**
 * Raccomandazione generata dall'LLM con motivazione.
 */
export interface Recommendation {
  event: EventSummary;
  reason: string;
}

/**
 * Messaggio nella conversazione chat con l'assistente.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── API Request/Response Interfaces ─────────────────────────────────────────

/**
 * POST /api/events/search — Richiesta ricerca eventi.
 */
export interface SearchEventsRequest {
  lat: number;
  lng: number;
  radiusKm: number; // 1-100
  filters?: {
    categories?: string[];
    dateFrom?: string; // ISO date
    dateTo?: string;   // ISO date
    maxDistanceKm?: number;
  };
  page?: number;     // default 1
  pageSize?: number; // default 20
}

/**
 * POST /api/events/search — Risposta ricerca eventi.
 */
export interface SearchEventsResponse {
  events: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * POST /api/recommendations — Richiesta raccomandazioni.
 */
export interface RecommendationRequest {
  lat: number;
  lng: number;
  radiusKm: number;
  preferences?: string; // max 200 chars
}

/**
 * POST /api/recommendations — Risposta raccomandazioni.
 */
export interface RecommendationResponse {
  recommendations: Recommendation[];
  message: string;
}

/**
 * POST /api/chat — Richiesta messaggio chat.
 */
export interface ChatRequest {
  message: string; // 1-500 chars
  conversationHistory: ChatMessage[]; // max 20 messages
  context: {
    lat: number;
    lng: number;
    radiusKm: number;
    availableEvents: EventSummary[];
  };
}

/**
 * POST /api/chat — Risposta chat.
 */
export interface ChatResponse {
  reply: string;
  suggestedEvents?: EventSummary[];
}
