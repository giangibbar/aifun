/**
 * App — Root component for Local Events Finder.
 * Wires together geolocation, event search, map, list, recommendations, chat, and sources.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GeolocationProvider, useGeolocation } from './contexts/GeolocationContext';
import { AddressInput } from './components/AddressInput';
import { RadiusControl } from './components/RadiusControl';
import { MapView } from './components/MapView';
import { EventList } from './components/EventList';
import { EventDetail } from './components/EventDetail';
import { EventFilters, type FilterState } from './components/EventFilters';
import { RecommendationPanel } from './components/RecommendationPanel';
import { ChatInterface } from './components/ChatInterface';
import { SourceManager } from './components/SourceManager';
import { searchEvents, type EventSummary } from './api/client';

function AppContent() {
  const { lat: rawLat, lng: rawLng, status, setManualPosition } = useGeolocation();
  const lat = rawLat ?? 44.4056;
  const lng = rawLng ?? 8.9463;
  const [radiusKm, setRadiusKm] = useState(15);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
  const [chatTab, setChatTab] = useState<"chat"|"saved"|"telegram">("chat");
  const [savedEvents, setSavedEvents] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    dateFrom: '',
    dateTo: '',
    maxDistanceKm: null,
  });
  const [activeTab, setActiveTab] = useState<'map' | 'chat' | 'sources'>('map');

  const fetchEvents = useCallback(async (pageNum = 1, append = false) => {
    if (lat == null || lng == null) return;

    setLoading(true);
    try {
      const apiFilters: any = {};
      if (filters.categories.length > 0) apiFilters.categories = filters.categories;
      if (filters.dateFrom) apiFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) apiFilters.dateTo = filters.dateTo;
      if (filters.maxDistanceKm) apiFilters.maxDistanceKm = filters.maxDistanceKm;

      const result = await searchEvents(
        lat,
        lng,
        radiusKm,
        Object.keys(apiFilters).length > 0 ? apiFilters : undefined,
        pageNum,
        200
      );

      if (append) {
        setEvents((prev) => [...prev, ...result.events]);
      } else {
        setEvents(result.events);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radiusKm, filters]);

  // Initial load + manual search
  const addReminder = async (event: any) => {
    try {
      await fetch(`${import.meta.env.BASE_URL}api/reminders/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: event.name, eventDate: event.dateStart, sourceUrl: event.sourceUrl || "" }) });
      const idx = events.findIndex(e => e.name === event.name && e.dateStart === event.dateStart);
      if (idx >= 0) setSavedEvents(prev => new Set([...prev, idx]));
    } catch {}
  };

  const saveTelegramConfig = async () => {
    const token = (document.getElementById("tg-token-input") as HTMLInputElement)?.value;
    const chatId = (document.getElementById("tg-chatid-input") as HTMLInputElement)?.value;
    if (!token || !chatId) return;
    await fetch(`${import.meta.env.BASE_URL}api/reminders/telegram`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, chatId }) });
    alert("✅ Configurazione salvata!");
  };
  const testTelegramConfig = async () => {
    await fetch(`${import.meta.env.BASE_URL}api/reminders/test-telegram`, { method: "POST" });
    alert("📱 Messaggio di test inviato!");
  };

  const doSearch = useCallback(() => { if (lat && lng) fetchEvents(1, false); }, [fetchEvents, lat, lng]);
  useEffect(() => { doSearch(); }, [lat, lng]); // eslint-disable-line
  const handleLoadMore = () => {
    fetchEvents(page + 1, true);
  };

  // Show address input if geolocation not available

  // Main app layout
  return (
    <div className="space-y-3 h-full flex flex-col overflow-hidden">

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white rounded-lg shadow p-1 shrink-0">
        {[
          { id: 'map' as const, label: '🗺️ Mappa & Eventi' },
          { id: 'chat' as const, label: '✨ Assistente' },
          { id: 'sources' as const, label: '📡 Fonti' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "map" && (
        <>
        <div className="bg-white rounded-lg shadow p-3 flex items-center gap-4 mb-3 shrink-0"><AddressInput inline /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          {/* Map */}
          <div className="lg:col-span-2 h-full min-h-0">
            <MapView
              lat={lat}
              lng={lng}
              radiusKm={radiusKm}
              events={events}
              onEventClick={setSelectedEventId}
              onLocationChange={(newLat, newLng) => setManualPosition(newLat, newLng)}
              onEventHover={setHoveredEventId}
            />
          </div>

          {/* Event list or detail */}
          <div className="space-y-3 h-full flex flex-col min-h-0">
            <EventFilters filters={filters} onChange={setFilters} radius={radiusKm} onRadiusChange={setRadiusKm} onSearch={doSearch} />

                <p className="text-sm text-gray-500">
                  {loading ? "🔄 Ricerca in corso..." : total + " eventi trovati entro " + radiusKm + " km"}
                </p>
                <div className="flex-1 overflow-y-auto"><EventList
                  events={events}
                  hasMore={hasMore}
                  loading={loading}
                  onLoadMore={handleLoadMore}
                  onEventSelect={(idx) => setSelectedEventId(idx)}
                  onReminder={addReminder}
                  savedEvents={savedEvents}
                  hoveredEventId={hoveredEventId}
                />
          </div>
          </div>
        </div>
        </>
      )}


      {activeTab === "chat" && (
        <div className="h-[calc(100vh-180px)] flex flex-col">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setChatTab("chat")} className={chatTab==="chat"?"px-3 py-1 bg-blue-600 text-white rounded-md text-sm":"px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm"}>💬 Chat</button>
            <button onClick={() => setChatTab("saved")} className={chatTab==="saved"?"px-3 py-1 bg-blue-600 text-white rounded-md text-sm":"px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm"}>⭐ Salvati ({savedEvents.size})</button>
            <button onClick={() => setChatTab("telegram")} className={chatTab==="telegram"?"px-3 py-1 bg-blue-600 text-white rounded-md text-sm":"px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm"}>📱 Telegram</button>
          </div>
          {chatTab === "chat" && <ChatInterface lat={lat} lng={lng} radiusKm={radiusKm} availableEvents={events} />}
          {chatTab === "saved" && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {[...savedEvents].map(idx => { const ev = events[idx]; if(!ev) return null; return (
                <div key={idx} className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-3">
                  <div className="flex-1"><b>{ev.name}</b><br/><span className="text-sm text-gray-500">{new Date(ev.dateStart).toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"})} — {ev.venueName}</span></div>
                  <button onClick={() => setSavedEvents(prev => { const n = new Set(prev); n.delete(idx); return n; })} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              ); })}
              {savedEvents.size === 0 && <p className="text-gray-400 text-center mt-8">Nessun evento salvato. Clicca 🔔 su un evento per salvarlo.</p>}
            </div>
          )}
          {chatTab === "telegram" && (
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              <h3 className="font-semibold">📱 Configura Telegram</h3>
              <p className="text-sm text-gray-600">Ricevi notifiche il giorno prima degli eventi salvati.</p>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Apri Telegram e cerca <b>@BotFather</b></li>
                <li>Scrivi <code>/newbot</code> e segui le istruzioni</li>
                <li>Copia il <b>token</b> e incollalo qui sotto</li>
                <li>Cerca <b>@userinfobot</b> su Telegram e scrivi <code>/start</code></li>
                <li>Copia il tuo <b>Chat ID</b> e incollalo qui sotto</li>
              </ol>
              <input id="tg-token-input" placeholder="Token del bot" className="w-full px-3 py-2 border rounded-md text-sm" />
              <input id="tg-chatid-input" placeholder="Chat ID" className="w-full px-3 py-2 border rounded-md text-sm" />
              <button onClick={saveTelegramConfig} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Salva</button>
              <button onClick={testTelegramConfig} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 ml-2">Invia test</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sources' && <SourceManager />}

      {/* Event Detail Modal */}
      {selectedEventId !== null && (() => {
        const ev = events[selectedEventId];
        if (!ev) return null;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setSelectedEventId(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{ev.name}</h2>
                <button onClick={() => setSelectedEventId(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p><span className="font-semibold">📅 Data:</span> {new Date(ev.dateStart).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}{ev.dateEnd ? " — " + new Date(ev.dateEnd).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                <p><span className="font-semibold">📍 Venue:</span> {ev.venueName}</p>
                {ev.venueAddress && <p><span className="font-semibold">🏠 Indirizzo:</span> {ev.venueAddress}</p>}
                <p><span className="font-semibold">🏷️ Categoria:</span> {ev.category}</p>
                <p><span className="font-semibold">📏 Distanza:</span> {ev.distanceKm.toFixed(1)} km</p>
                {ev.description && <div className="mt-3 p-3 bg-gray-50 rounded-lg"><p className="text-gray-600">{ev.description}</p></div>}
                <div className="mt-4 pt-4 border-t flex gap-3">
                  <button onClick={() => addReminder(ev)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600">🔔 Ricordami</button>
                  {ev.sourceUrl && <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">🔗 Vedi dettagli</a>}
                  {ev.sourceUrl && <a href={"https://www.ticketone.it/search/?searchterm=" + encodeURIComponent(ev.name)} target="_blank" rel="noopener noreferrer" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">🎫 Cerca su TicketOne</a>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function App() {
  return (
    <GeolocationProvider>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="w-full px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">🎉 Local Events Finder</h1>
            <p className="text-sm text-gray-500">Scopri cosa succede intorno a te</p>
          </div>
        </header>
        <main className="w-full px-6 py-4 flex-1 overflow-hidden">
          <AppContent />
        </main>
      </div>
    </GeolocationProvider>
  );
}

export default App;
