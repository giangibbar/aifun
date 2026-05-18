/**
 * EventDetail — Full event details panel.
 *
 * Requirements: 5.3, 5.6
 */

import React, { useEffect, useState } from 'react';
import { getEventDetail, type EventDetail as EventDetailType } from '../api/client';
import { getCategoryColor, getCategoryLabel } from '../utils/categoryColors';

interface EventDetailProps {
  eventId: number;
  onClose: () => void;
}

export function EventDetail({ eventId, onClose }: EventDetailProps) {
  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEventDetail(eventId)
      .then(setEvent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Caricamento dettagli...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">{error || 'Evento non trovato'}</p>
        <button onClick={onClose} className="mt-2 text-sm text-blue-600 hover:underline">
          ← Torna alla lista
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <button onClick={onClose} className="text-sm text-blue-600 hover:underline mb-4">
        ← Torna alla lista
      </button>

      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
          <span
            className="text-xs px-2 py-1 rounded-full text-white font-medium shrink-0"
            style={{ backgroundColor: getCategoryColor(event.category) }}
          >
            {getCategoryLabel(event.category)}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">Data:</span>{' '}
            {new Date(event.dateStart).toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {event.dateEnd && (
              <> — {new Date(event.dateEnd).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>

          <p>
            <span className="font-medium">Venue:</span> {event.venueName}
          </p>

          {event.venueAddress && (
            <p>
              <span className="font-medium">Indirizzo:</span> {event.venueAddress}
            </p>
          )}

          {event.description && (
            <div className="mt-3">
              <p className="font-medium mb-1">Descrizione:</p>
              <p className="text-gray-600">{event.description}</p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100">
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Vedi fonte originale →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
