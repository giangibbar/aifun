/**
 * EventFilters — Filter controls for category, date range, and distance.
 *
 * Requirements: 5.4, 5.5
 */

import React from 'react';
import { ALL_CATEGORIES, getCategoryLabel, getCategoryColor } from '../utils/categoryColors';
import type { EventCategory } from '../api/client';

export interface FilterState {
  categories: EventCategory[];
  dateFrom: string;
  dateTo: string;
  maxDistanceKm: number | null;
}

interface EventFiltersProps {
  filters: FilterState;
  radius: number;
  onRadiusChange: (r: number) => void;
  onSearch: () => void;
  onChange: (filters: FilterState) => void;
}

export function EventFilters({ filters, onChange, radius, onRadiusChange, onSearch }: EventFiltersProps) {
  const toggleCategory = (cat: EventCategory) => {
    const current = filters.categories;
    const updated = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    onChange({ ...filters, categories: updated });
  };

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">Categorie</p>
        <div className="flex flex-wrap gap-1">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`text-xs px-2 py-1 rounded-full border transition-all ${
                filters.categories.includes(cat)
                  ? 'text-white border-transparent'
                  : 'text-gray-600 border-gray-300 bg-white hover:border-gray-400'
              }`}
              style={
                filters.categories.includes(cat)
                  ? { backgroundColor: getCategoryColor(cat) }
                  : undefined
              }
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600">Da</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600">A</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">
          Raggio: {radius} km
        </label>
        <input
          type="range"
          min={1}
          max={200}
          value={radius}
          onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      <button
        onClick={onSearch}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        🔍 Cerca eventi
      </button>


      {(filters.categories.length > 0 || filters.dateFrom || filters.dateTo || filters.maxDistanceKm) && (
        <button
          onClick={() => onChange({ categories: [], dateFrom: '', dateTo: '', maxDistanceKm: null })}
          className="text-xs text-blue-600 hover:underline"
        >
          Rimuovi tutti i filtri
        </button>
      )}
    </div>
  );
}
