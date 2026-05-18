import React, { useState } from 'react';
import { useGeolocation } from '../contexts/GeolocationContext';

interface AddressInputProps {
  inline?: boolean;
}

export function AddressInput({ inline }: AddressInputProps) {
  const { geocodeAndSet, status, error } = useGeolocation();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    await geocodeAndSet(address.trim());
    setLoading(false);
  };

  if (inline) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Inserisci città o indirizzo..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? '...' : '📍'}
        </button>
      </form>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Inserisci la tua posizione</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Es. Milano, Via Roma 1..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Cercando...' : 'Cerca'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
