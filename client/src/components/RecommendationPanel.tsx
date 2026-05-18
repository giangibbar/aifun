/**
 * RecommendationPanel — "Cosa faccio stasera?" button + recommendations display.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import React, { useState } from 'react';
import { getRecommendations, type Recommendation } from '../api/client';
import { getCategoryColor, getCategoryLabel } from '../utils/categoryColors';

interface RecommendationPanelProps {
  lat: number;
  lng: number;
  radiusKm: number;
  onEventSelect?: (eventId: number) => void;
}

export function RecommendationPanel({ lat, lng, radiusKm, onEventSelect }: RecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleGetRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecommendations(lat, lng, radiusKm, preferences || undefined);
      setRecommendations(result.recommendations);
      setMessage(result.message);
      setShowResults(true);
    } catch (err: any) {
      setError(err.message || 'Servizio temporaneamente non disponibile. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleGetRecommendations}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-sm font-medium shadow-sm"
        >
          {loading ? '⏳ Pensando...' : '✨ Cosa faccio stasera?'}
        </button>
      </div>

      <div className="mb-3">
        <input
          type="text"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value.slice(0, 200))}
          placeholder="Preferenze (es. musica dal vivo, gratuito...)"
          maxLength={200}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          aria-label="Preferenze per le raccomandazioni"
        />
        <p className="text-xs text-gray-400 mt-0.5 text-right">{preferences.length}/200</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}

      {showResults && (
        <div className="space-y-2">
          {message && <p className="text-sm text-gray-600 italic">{message}</p>}
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-purple-200 transition-colors"
              onClick={() => onEventSelect?.(rec.event.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onEventSelect?.(rec.event.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{rec.event.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rec.event.venueName} • {rec.event.distanceKm.toFixed(1)} km
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: getCategoryColor(rec.event.category) }}
                >
                  {getCategoryLabel(rec.event.category)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2 italic">💡 {rec.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
