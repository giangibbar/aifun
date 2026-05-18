/**
 * Geocode route — POST /api/geocode
 */

import { Router, Request, Response } from 'express';
import { geocodingService } from '../services/GeocodingService.js';

export const geocodeRouter = Router();

/**
 * POST /api/geocode
 * Geocode an address string to coordinates.
 */
geocodeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string' || address.trim() === '') {
      return res.status(400).json({ error: 'Indirizzo è obbligatorio' });
    }

    const result = await geocodingService.geocode(address.trim());

    if (!result) {
      return res.status(404).json({
        error: 'Indirizzo non trovato. Verifica l\'indirizzo e riprova.',
      });
    }

    res.json({ lat: result.lat, lng: result.lng });
  } catch (error: any) {
    console.error('Geocode error:', error.message);

    if (error.message?.includes('timed out')) {
      return res.status(504).json({
        error: 'Il servizio di geocodifica non ha risposto in tempo. Riprova.',
      });
    }

    res.status(500).json({
      error: 'Errore durante la geocodifica dell\'indirizzo.',
    });
  }
});
