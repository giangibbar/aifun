/**
 * SourceManager — Manage event data sources (add/remove URLs).
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import React, { useState, useEffect } from 'react';
import {
  getSources,
  addSource as apiAddSource,
  removeSource as apiRemoveSource,
  type Source,
} from '../api/client';

export function SourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const loadSources = async () => {
    setLoading(true);
    try {
      const result = await getSources();
      setSources(result.sources);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setAddLoading(true);
    setError(null);
    try {
      await apiAddSource(newUrl.trim());
      setNewUrl('');
      await loadSources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await apiRemoveSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">📡 Fonti Dati</h3>

      {/* Add source form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value.slice(0, 2048))}
          placeholder="https://esempio.com/eventi"
          maxLength={2048}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={addLoading}
          aria-label="URL nuova fonte"
        />
        <button
          type="submit"
          disabled={addLoading || !newUrl.trim()}
          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          {addLoading ? '...' : 'Aggiungi'}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {/* Sources list */}
      {loading ? (
        <p className="text-sm text-gray-500">Caricamento fonti...</p>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {source.name || source.url}
                </p>
                <p className="text-xs text-gray-500 truncate">{source.url}</p>
                {source.lastScrapedAt && (
                  <p className="text-xs text-gray-400">
                    Ultimo aggiornamento:{' '}
                    {new Date(source.lastScrapedAt).toLocaleString('it-IT')}
                    {source.lastScrapeStatus && (
                      <span className={source.lastScrapeStatus === 'success' ? 'text-green-600' : 'text-red-500'}>
                        {' '}• {source.lastScrapeStatus === 'success' ? '✓' : '✗'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2">
                {source.isDefault ? (
                  <span className="text-xs text-gray-400 italic">predefinita</span>
                ) : (
                  <button
                    onClick={() => handleRemove(source.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                    aria-label={`Rimuovi fonte ${source.name || source.url}`}
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
