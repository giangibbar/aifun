import { describe, it, expect } from 'vitest';
import { trimConversationHistory } from '../../utils/conversationHistory';
import { ChatMessage } from '../../types';

function createMessage(index: number): ChatMessage {
  return {
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${index}`,
    timestamp: new Date(2024, 0, 1, 0, index).toISOString(),
  };
}

function createMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => createMessage(i));
}

describe('trimConversationHistory', () => {
  it('returns all messages when array has fewer than 20', () => {
    const messages = createMessages(5);
    const result = trimConversationHistory(messages);
    expect(result).toEqual(messages);
    expect(result).toHaveLength(5);
  });

  it('returns all messages when array has exactly 20', () => {
    const messages = createMessages(20);
    const result = trimConversationHistory(messages);
    expect(result).toEqual(messages);
    expect(result).toHaveLength(20);
  });

  it('returns last 20 messages when array has more than 20', () => {
    const messages = createMessages(30);
    const result = trimConversationHistory(messages);
    expect(result).toHaveLength(20);
    expect(result[0]).toEqual(messages[10]);
    expect(result[19]).toEqual(messages[29]);
  });

  it('preserves chronological order', () => {
    const messages = createMessages(25);
    const result = trimConversationHistory(messages);
    for (let i = 1; i < result.length; i++) {
      expect(new Date(result[i].timestamp).getTime())
        .toBeGreaterThan(new Date(result[i - 1].timestamp).getTime());
    }
  });

  it('returns empty array when input is empty', () => {
    const result = trimConversationHistory([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('returns single message when input has one message', () => {
    const messages = createMessages(1);
    const result = trimConversationHistory(messages);
    expect(result).toEqual(messages);
    expect(result).toHaveLength(1);
  });
});
