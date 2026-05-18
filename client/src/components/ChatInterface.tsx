/**
 * ChatInterface — Conversational interface with the LLM assistant.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type ChatMessage, type EventSummary } from '../api/client';

interface ChatInterfaceProps {
  lat: number;
  lng: number;
  radiusKm: number;
  availableEvents: EventSummary[];
}

export function ChatInterface({ lat, lng, radiusKm, availableEvents }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Ciao! Posso aiutarti a trovare eventi. Chiedimi raccomandazioni, cosa fare stasera, eventi per i tuoi gusti, o qualsiasi altra cosa sugli eventi nella tua zona.", timestamp: new Date().toISOString() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const trimmedInput = input.trim();
  const isValid = trimmedInput.length >= 1 && trimmedInput.length <= 500;

  const handleSend = async () => {
    if (!isValid || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      // Keep only last 20 messages for context
      const history = updatedMessages.slice(-20);
      const response = await sendChatMessage(trimmedInput, history, {
        lat,
        lng,
        radiusKm,
        availableEvents,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Servizio temporaneamente non disponibile. Riprova o riformula la domanda.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">💬 Assistente Eventi</h3>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Chiedimi qualcosa sugli eventi nella tua zona!
          </p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-500">
              <span className="animate-pulse">Sto pensando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            maxLength={500}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Messaggio chat"
          />
          <button
            onClick={handleSend}
            disabled={!isValid || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            aria-label="Invia messaggio"
          >
            Invia
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{trimmedInput.length}/500</p>
      </div>
    </div>
  );
}
