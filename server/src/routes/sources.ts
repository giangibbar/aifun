/**
 * Sources routes — CRUD for event data sources.
 * GET /api/sources, POST /api/sources, DELETE /api/sources/:id, POST /api/sources/:id/validate
 */

import { Router, Request, Response } from 'express';
import {
  getAllSources,
  addSource,
  removeSource,
  validateSource,
} from '../services/SourceService.js';

export const sourcesRouter = Router();

/**
 * GET /api/sources
 * List all configured sources with last update timestamp.
 */
sourcesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const sources = getAllSources();
    res.json({ sources });
  } catch (error: any) {
    console.error('Sources list error:', error.message);
    res.status(500).json({ error: 'Errore nel recupero delle fonti' });
  }
});

/**
 * POST /api/sources
 * Add a new custom source. Validates URL format, length, and count limit.
 */
sourcesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { url, name } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL è obbligatorio' });
    }

    // Add source (validates format, length, count)
    const result = addSource(url.trim(), name?.trim());

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Validate reachability
    const reachability = await validateSource(url.trim());
    if (!reachability.reachable) {
      // Remove the source we just added since it's not reachable
      removeSource(result.source.id);
      return res.status(400).json({ error: reachability.error });
    }

    res.status(201).json({ source: result.source });
  } catch (error: any) {
    console.error('Source add error:', error.message);
    res.status(500).json({ error: 'Errore durante l\'aggiunta della fonte' });
  }
});

/**
 * DELETE /api/sources/:id
 * Remove a custom source. Default sources cannot be removed.
 */
sourcesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID fonte non valido' });
    }

    const result = removeSource(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Source remove error:', error.message);
    res.status(500).json({ error: 'Errore durante la rimozione della fonte' });
  }
});

/**
 * POST /api/sources/:id/validate
 * Validate that a source URL is reachable and contains event content.
 */
sourcesRouter.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID fonte non valido' });
    }

    const sources = getAllSources();
    const source = sources.find((s) => s.id === id);

    if (!source) {
      return res.status(404).json({ error: 'Fonte non trovata' });
    }

    const result = await validateSource(source.url);

    if (!result.reachable) {
      return res.json({ valid: false, error: result.error });
    }

    res.json({ valid: true });
  } catch (error: any) {
    console.error('Source validate error:', error.message);
    res.status(500).json({ error: 'Errore durante la validazione della fonte' });
  }
});

// Local sources suggestions
import { getLocalSources } from '../services/LocalSourcesService.js';

/**
 * GET /api/sources/local?city=genova
 * Get suggested local news sources for a city.
 */
sourcesRouter.get('/local', (req: Request, res: Response) => {
  const city = req.query.city as string;
  if (!city) return res.status(400).json({ error: 'city parameter required' });
  const sources = getLocalSources(city);
  res.json({ city, sources });
});
