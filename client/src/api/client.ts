/**
 * Typed API client for the Local Events Finder backend.
 */

// ─── Types (mirrored from server) ───────────────────────────────────────────

export type EventCategory =
  | 'musica' | 'teatro' | 'cinema' | 'arte' | 'sport'
  | 'food' | 'nightlife' | 'festival' | 'conferenza' | 'altro';

export interface EventSummary {
  id: number;
  name: string;
  dateStart: string;
  venueName: string;
  distanceKm: number;
  lat?: number;
  lng?: number;
  category: EventCategory;
  sourceUrl?: string;
  description?: string;
  dateEnd?: string;
  venueAddress?: string;
}

export interface EventDetail {
  id: number;
  name: string;
  dateStart: string;
  dateEnd?: string;
  venueName: string;
  venueAddress?: string;
  lat: number;
  lng: number;
  description?: string;
  category: EventCategory;
  sourceUrl?: string;
  description?: string;
  dateEnd?: string;
  venueAddress?: string;
  sourceUrl: string;
  sourceId: number;
  scrapedAt: string;
}

export interface SearchEventsResponse {
  events: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Recommendation {
  event: EventSummary;
  reason: string;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  reply: string;
  suggestedEvents?: EventSummary[];
}

export interface Source {
  id: number;
  url: string;
  name?: string;
  isDefault: boolean;
  isActive: boolean;
  lastScrapedAt?: string;
  lastScrapeStatus?: 'success' | 'error';
}

// ─── API Functions ───────────────────────────────────────────────────────────

const BASE_URL = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data as T;
}

export async function searchEvents(
  lat: number,
  lng: number,
  radiusKm: number,
  filters?: {
    categories?: string[];
    dateFrom?: string;
    dateTo?: string;
    maxDistanceKm?: number;
  },
  page = 1,
  pageSize = 20
): Promise<SearchEventsResponse> {
  return fetchJSON<SearchEventsResponse>(`${BASE_URL}/events/search`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng, radiusKm, filters, page, pageSize }),
  });
}

export async function getEventDetail(id: number): Promise<EventDetail> {
  return fetchJSON<EventDetail>(`${BASE_URL}/events/${id}`);
}

export async function getRecommendations(
  lat: number,
  lng: number,
  radiusKm: number,
  preferences?: string
): Promise<RecommendationResponse> {
  return fetchJSON<RecommendationResponse>(`${BASE_URL}/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng, radiusKm, preferences }),
  });
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[],
  context: { lat: number; lng: number; radiusKm: number; availableEvents: EventSummary[] }
): Promise<ChatResponse> {
  return fetchJSON<ChatResponse>(`${BASE_URL}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, conversationHistory, context }),
  });
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  return fetchJSON<{ lat: number; lng: number }>(`${BASE_URL}/geocode`, {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}

export async function getSources(): Promise<{ sources: Source[] }> {
  return fetchJSON<{ sources: Source[] }>(`${BASE_URL}/sources`);
}

export async function addSource(url: string, name?: string): Promise<{ source: Source }> {
  return fetchJSON<{ source: Source }>(`${BASE_URL}/sources`, {
    method: 'POST',
    body: JSON.stringify({ url, name }),
  });
}

export async function removeSource(id: number): Promise<{ success: boolean }> {
  return fetchJSON<{ success: boolean }>(`${BASE_URL}/sources/${id}`, {
    method: 'DELETE',
  });
}

export async function validateSourceUrl(id: number): Promise<{ valid: boolean; error?: string }> {
  return fetchJSON<{ valid: boolean; error?: string }>(`${BASE_URL}/sources/${id}/validate`, {
    method: 'POST',
  });
}
