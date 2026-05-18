import { describe, it, expect } from 'vitest';
import { validatePreferences } from '../../utils/validatePreferences';

describe('validatePreferences', () => {
  it('should accept an empty string', () => {
    const result = validatePreferences('');
    expect(result).toEqual({ valid: true, value: '' });
  });

  it('should accept a short preferences string', () => {
    const result = validatePreferences('voglio musica dal vivo');
    expect(result).toEqual({ valid: true, value: 'voglio musica dal vivo' });
  });

  it('should accept a string of exactly 200 characters', () => {
    const input = 'a'.repeat(200);
    const result = validatePreferences(input);
    expect(result).toEqual({ valid: true, value: input });
  });

  it('should reject a string of 201 characters', () => {
    const input = 'a'.repeat(201);
    const result = validatePreferences(input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeTruthy();
    }
  });

  it('should reject a very long string', () => {
    const input = 'x'.repeat(500);
    const result = validatePreferences(input);
    expect(result.valid).toBe(false);
  });

  it('should accept a string with special characters within limit', () => {
    const result = validatePreferences('cerco qualcosa di gratuito! 🎵');
    expect(result).toEqual({ valid: true, value: 'cerco qualcosa di gratuito! 🎵' });
  });
});
