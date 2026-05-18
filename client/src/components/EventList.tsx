/**
 * EventList — Paginated list of events sorted by date.
 *
 * Requirements: 5.1, 5.2
 */

import React, { useEffect, useRef } from "react";
import type { EventSummary } from '../api/client';
import { getCategoryColor, getCategoryLabel } from '../utils/categoryColors';

interface EventListProps {
  events: EventSummary[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onEventSelect: (eventId: number) => void;
  onReminder?: (event: EventSummary) => void;
  savedEvents?: Set<number>;
  hoveredEventId?: number | null;
}

export function EventList({ events, hasMore, loading, onLoadMore, onEventSelect, hoveredEventId, onReminder, savedEvents }: EventListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hoveredEventId == null || !listRef.current) return;
    const el = listRef.current.querySelector("[data-event-id=" + JSON.stringify(String(hoveredEventId)) + "]");
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [hoveredEventId]);
  if (events.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">Nessun evento trovato</p>
        <p className="text-sm mt-1">Prova ad ampliare il raggio di ricerca</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={listRef}>
      {events.map((event, idx) => (
        <button
          key={idx}
          onClick={() => onEventSelect(idx)}
          data-event-id={idx}
          className={`w-full text-left p-3 rounded-lg shadow-sm border transition-all ${hoveredEventId === idx ? "bg-blue-50 border-blue-400 shadow-md" : "bg-white border-gray-100 hover:border-blue-200 hover:shadow"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{event.name}</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {new Date(event.dateStart).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{event.venueName}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: getCategoryColor(event.category) }}
              >
                {getCategoryLabel(event.category)}
              </span>
              <span className="text-xs text-gray-500">
                {event.distanceKm.toFixed(1)} km
              </span>
              <button onClick={(e) => { e.stopPropagation(); onReminder?.(event); }} className="text-lg hover:scale-125 transition-transform" title="Ricordami">{savedEvents?.has(idx) ? "✅" : "🔔"}</button>
            </div>
          </div>
        </button>
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        >
          {loading ? 'Caricamento...' : 'Carica altri eventi'}
        </button>
      )}
    </div>
  );
}
