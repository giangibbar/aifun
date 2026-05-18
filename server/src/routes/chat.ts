/**
 * Chat route — POST /api/chat
 */

import { Router, Request, Response } from 'express';
import { validateChatMessage } from '../utils/validateChat.js';
import { trimConversationHistory } from '../utils/conversationHistory.js';
import { LLMService } from '../services/LLMService.js';
import type { ChatRequest, ChatResponse } from '../types/index.js';

export const chatRouter = Router();

/**
 * POST /api/chat
 * Send a message to the LLM assistant and get a response.
 */
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequest;
    const { message, conversationHistory, context } = body;

    // Validate message
    const messageValidation = validateChatMessage(message || '');
    if (!messageValidation.valid) {
      return res.status(400).json({ error: messageValidation.error });
    }

    // Validate context
    if (!context || context.lat == null || context.lng == null) {
      return res.status(400).json({ error: 'Il contesto (lat, lng) è obbligatorio' });
    }

    // Trim conversation history to last 20 messages
    const trimmedHistory = trimConversationHistory(conversationHistory || []);

    // Call LLM
    let llmService: LLMService;
    try {
      llmService = new LLMService();
    } catch {
      return res.status(503).json({
        error: 'Servizio chat temporaneamente non disponibile. Riprova più tardi.',
      });
    }

    const llmResponse = await llmService.chat(
      messageValidation.value,
      trimmedHistory,
      { availableEvents: context.availableEvents || [] }
    );

    const response: ChatResponse = {
      reply: llmResponse.reply,
      suggestedEvents: undefined, // Could map suggestedEventIds to EventSummary if needed
    };

    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error.message);

    if (error.message?.includes('timed out')) {
      return res.status(504).json({
        error: 'Il servizio non ha risposto in tempo. Riprova o riformula la domanda.',
      });
    }

    res.status(500).json({
      error: 'Errore durante l\'elaborazione del messaggio. Riprova più tardi.',
    });
  }
});
