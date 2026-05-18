/**
 * Recommendations route — POST /api/recommendations
 * Uses deterministic logic (no LLM).
 */

import { Router, Request, Response } from 'express';
import { validateRadius } from '../utils/validation.js';
import { validatePreferences } from '../utils/validatePreferences.js';
import { RecommendationService } from '../services/RecommendationService.js';
import { CacheService } from '../services/CacheService.js';
import type { RecommendationRequest, RecommendationResponse } from '../types/index.js';

export const recommendationsRouter = Router();

const recommendationService = new RecommendationService();

/**
 * POST /api/recommendations
 * Generate up to 3 personalized event recommendations.
 */
recommendationsRouter.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body as RecommendationRequest;
    const { lat, lng, radiusKm, preferences } = body;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat e lng sono obbligatori' });
    }

    const radiusValidation = validateRadius(radiusKm);
    if (!radiusValidation.valid) {
      return res.status(400).json({ error: radiusValidation.error });
    }

    if (preferences !== undefined) {
      const prefValidation = validatePreferences(preferences);
      if (!prefValidation.valid) {
        return res.status(400).json({ error: prefValidation.error });
      }
    }

    // Get cached events
    const cacheService = new CacheService();
    const events = cacheService.getCachedEvents(lat, lng, radiusValidation.value) || [];

    if (events.length === 0) {
      const response: RecommendationResponse = {
        recommendations: [],
        message: 'Nessun evento disponibile nella zona. Prova ad ampliare il raggio di ricerca.',
      };
      return res.json(response);
    }

    // Generate recommendations (deterministic, no LLM)
    const recommendations = recommendationService.getRecommendations(
      events,
      lat,
      lng,
      radiusValidation.value,
      preferences
    );

    const response: RecommendationResponse = {
      recommendations,
      message: recommendations.length > 0
        ? `Ecco ${recommendations.length} suggeriment${recommendations.length === 1 ? 'o' : 'i'} per te!`
        : 'Non ho trovato eventi adatti. Prova a modificare le preferenze o ampliare il raggio.',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Recommendation error:', error.message);
    res.status(500).json({ error: 'Errore durante la generazione delle raccomandazioni.' });
  }
});
