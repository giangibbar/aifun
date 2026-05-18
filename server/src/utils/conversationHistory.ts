import { ChatMessage } from '../types';

/**
 * Limita la cronologia della conversazione agli ultimi 20 messaggi.
 * Se la cronologia contiene 20 o meno messaggi, li restituisce tutti.
 * Se contiene più di 20 messaggi, restituisce solo gli ultimi 20 (i più recenti),
 * mantenendo l'ordine cronologico.
 */
const MAX_HISTORY_LENGTH = 20;

export function trimConversationHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_HISTORY_LENGTH) {
    return messages;
  }
  return messages.slice(messages.length - MAX_HISTORY_LENGTH);
}
