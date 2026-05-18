/**
 * RecommendationService — Generates event recommendations using deterministic logic.
 * No LLM dependency — ranks events by proximity, time, and category diversity.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { filterByDate } from '../utils/dateFilter.js';
import { filterByDistance, haversineDistanceKm } from '../utils/geo.js';
import type { Event, EventSummary, Recommendation } from '../types/index.js';

export class RecommendationService {
  /**
   * Generate up to 3 event recommendations based on proximity, timing, and preferences.
   */
  getRecommendations(
    events: Event[],
    lat: number,
    lng: number,
    radiusKm: number,
    preferences?: string
  ): Recommendation[] {
    // Filter: only future/ongoing within 30 days and within radius
    const dateFiltered = filterByDate(events, new Date());
    const distanceFiltered = filterByDistance(dateFiltered, lat, lng, radiusKm);

    if (distanceFiltered.length === 0) {
      return [];
    }

    // Convert to summaries with distance
    const summaries: (EventSummary & { score: number })[] = distanceFiltered.map((event) => {
      const distanceKm = haversineDistanceKm(lat, lng, event.lat, event.lng);
      return {
        id: event.id,
        name: event.name,
        dateStart: event.dateStart,
        venueName: event.venueName,
        distanceKm,
        category: event.category,
        score: this.calculateScore(event, distanceKm, preferences),
      };
    });

    // Sort by score (higher = better)
    summaries.sort((a, b) => b.score - a.score);

    // Pick top 3, preferring category diversity
    const selected = this.selectDiverse(summaries, 3);

    return selected.map((event) => ({
      event: {
        id: event.id,
        name: event.name,
        dateStart: event.dateStart,
        venueName: event.venueName,
        distanceKm: event.distanceKm,
        category: event.category,
      },
      reason: this.generateReason(event),
    }));
  }

  /**
   * Calculate a relevance score for an event.
   * Higher = more relevant.
   */
  private calculateScore(event: Event, distanceKm: number, preferences?: string): number {
    let score = 0;

    // Proximity bonus (closer = higher score, max 40 points)
    score += Math.max(0, 40 - distanceKm * 2);

    // Time proximity bonus (sooner = higher, max 30 points)
    const hoursUntil = (new Date(event.dateStart).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil >= 0 && hoursUntil <= 6) {
      score += 30; // Happening very soon / tonight
    } else if (hoursUntil > 6 && hoursUntil <= 24) {
      score += 20; // Today/tomorrow
    } else if (hoursUntil > 24 && hoursUntil <= 72) {
      score += 10; // This week
    }

    // Preference matching bonus (max 20 points)
    if (preferences) {
      const prefLower = preferences.toLowerCase();
      const eventText = `${event.name} ${event.category} ${event.description || ''}`.toLowerCase();

      const prefWords = prefLower.split(/\s+/).filter((w) => w.length > 2);
      const matches = prefWords.filter((w) => eventText.includes(w)).length;
      score += Math.min(20, matches * 7);
    }

    // Category popularity bonus
    const popularCategories = ['musica', 'nightlife', 'food', 'festival'];
    if (popularCategories.includes(event.category)) {
      score += 5;
    }

    return score;
  }

  /**
   * Select up to N events preferring category diversity.
   */
  private selectDiverse(
    sorted: (EventSummary & { score: number })[],
    max: number
  ): (EventSummary & { score: number })[] {
    if (sorted.length <= max) return sorted;

    const selected: (EventSummary & { score: number })[] = [];
    const usedCategories = new Set<string>();

    // First pass: pick top from different categories
    for (const event of sorted) {
      if (selected.length >= max) break;
      if (!usedCategories.has(event.category)) {
        selected.push(event);
        usedCategories.add(event.category);
      }
    }

    // Second pass: fill remaining slots with highest scores
    if (selected.length < max) {
      for (const event of sorted) {
        if (selected.length >= max) break;
        if (!selected.includes(event)) {
          selected.push(event);
        }
      }
    }

    return selected;
  }

  /**
   * Generate a human-readable reason in Italian.
   */
  private generateReason(event: EventSummary & { score: number }): string {
    const parts: string[] = [];

    // Distance
    if (event.distanceKm < 1) {
      parts.push('vicinissimo a te');
    } else if (event.distanceKm < 5) {
      parts.push(`a soli ${event.distanceKm.toFixed(1)} km`);
    } else {
      parts.push(`a ${event.distanceKm.toFixed(1)} km`);
    }

    // Timing
    const hoursUntil = (new Date(event.dateStart).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil >= 0 && hoursUntil <= 3) {
      parts.push('inizia tra poco');
    } else if (hoursUntil > 3 && hoursUntil <= 8) {
      parts.push('stasera');
    } else if (hoursUntil > 8 && hoursUntil <= 24) {
      parts.push('domani');
    }

    // Category
    const categoryLabels: Record<string, string> = {
      musica: 'musica dal vivo',
      teatro: 'spettacolo teatrale',
      cinema: 'proiezione cinematografica',
      arte: 'esposizione artistica',
      sport: 'evento sportivo',
      food: 'esperienza gastronomica',
      nightlife: 'serata',
      festival: 'festival',
      conferenza: 'conferenza',
      altro: 'evento',
    };

    const catLabel = categoryLabels[event.category] || 'evento';

    return `${catLabel.charAt(0).toUpperCase() + catLabel.slice(1)} ${parts.join(', ')} presso ${event.venueName}`;
  }
}
