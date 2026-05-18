/**
 * Category-to-color mapping for event markers.
 * Each EventCategory maps to a unique color.
 *
 * Requirements: 4.2
 */

import type { EventCategory } from '../api/client';

const CATEGORY_COLORS: Record<EventCategory, string> = {
  musica: '#e74c3c',      // red
  teatro: '#9b59b6',      // purple
  cinema: '#3498db',      // blue
  arte: '#f39c12',        // orange
  sport: '#27ae60',       // green
  food: '#e67e22',        // dark orange
  nightlife: '#8e44ad',   // dark purple
  festival: '#f1c40f',    // yellow
  conferenza: '#2c3e50',  // dark blue
  altro: '#95a5a6',       // gray
};

export function getCategoryColor(category: EventCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.altro;
}

export function getCategoryLabel(category: EventCategory): string {
  const labels: Record<EventCategory, string> = {
    musica: 'Musica',
    teatro: 'Teatro',
    cinema: 'Cinema',
    arte: 'Arte',
    sport: 'Sport',
    food: 'Food & Drink',
    nightlife: 'Nightlife',
    festival: 'Festival',
    conferenza: 'Conferenza',
    altro: 'Altro',
  };
  return labels[category] || 'Altro';
}

export const ALL_CATEGORIES: EventCategory[] = [
  'musica', 'teatro', 'cinema', 'arte', 'sport',
  'food', 'nightlife', 'festival', 'conferenza', 'altro',
];
