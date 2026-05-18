import { describe, it, expect } from 'vitest';
import { validateChatMessage } from '../../utils/validateChat';

describe('validateChatMessage', () => {
  it('should accept a normal message', () => {
    const result = validateChatMessage('Ciao, cosa faccio stasera?');
    expect(result).toEqual({ valid: true, value: 'Ciao, cosa faccio stasera?' });
  });

  it('should return the trimmed value on success', () => {
    const result = validateChatMessage('  hello world  ');
    expect(result).toEqual({ valid: true, value: 'hello world' });
  });

  it('should accept a single character message', () => {
    const result = validateChatMessage('a');
    expect(result).toEqual({ valid: true, value: 'a' });
  });

  it('should accept a message of exactly 500 trimmed characters', () => {
    const msg = 'a'.repeat(500);
    const result = validateChatMessage(msg);
    expect(result).toEqual({ valid: true, value: msg });
  });

  it('should accept a message with surrounding whitespace that trims to 500 chars', () => {
    const msg = '  ' + 'a'.repeat(500) + '  ';
    const result = validateChatMessage(msg);
    expect(result).toEqual({ valid: true, value: 'a'.repeat(500) });
  });

  it('should reject an empty string', () => {
    const result = validateChatMessage('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeTruthy();
    }
  });

  it('should reject a whitespace-only string', () => {
    const result = validateChatMessage('   ');
    expect(result.valid).toBe(false);
  });

  it('should reject tabs and newlines only', () => {
    const result = validateChatMessage('\t\n\r  ');
    expect(result.valid).toBe(false);
  });

  it('should reject a message with trimmed length > 500', () => {
    const msg = 'a'.repeat(501);
    const result = validateChatMessage(msg);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeTruthy();
    }
  });

  it('should reject a message with whitespace padding that trims to > 500', () => {
    const msg = '  ' + 'b'.repeat(501) + '  ';
    const result = validateChatMessage(msg);
    expect(result.valid).toBe(false);
  });
});
