/**
 * RadiusControl — Slider/input for configuring search radius (1-100 km).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import React from 'react';

interface RadiusControlProps {
  value: number;
  onChange: (radius: number) => void;
}

export function RadiusControl({ value, onChange }: RadiusControlProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (newValue >= 1 && newValue <= 100) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 1 && newValue <= 100) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Raggio:
      </label>
      <input
        type="range"
        min={1}
        max={200}
        value={value}
        onChange={handleSliderChange}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        aria-label="Raggio di ricerca in chilometri"
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={200}
          value={value}
          onChange={handleInputChange}
          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
          aria-label="Raggio in km"
        />
        <span className="text-sm text-gray-600">km</span>
      </div>
    </div>
  );
}
