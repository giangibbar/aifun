import { describe, it, expect } from 'vitest';
import { validateSourceAddition } from '../../utils/validateSource';

describe('validateSourceAddition', () => {
  describe('valid URLs', () => {
    it('should accept a valid http URL with count < 20', () => {
      const result = validateSourceAddition('http://example.com/events', 0);
      expect(result).toEqual({ valid: true });
    });

    it('should accept a valid https URL with count < 20', () => {
      const result = validateSourceAddition('https://www.eventbrite.it/events', 5);
      expect(result).toEqual({ valid: true });
    });

    it('should accept URL at exactly 2048 characters', () => {
      const url = 'https://example.com/' + 'a'.repeat(2048 - 'https://example.com/'.length);
      expect(url.length).toBe(2048);
      const result = validateSourceAddition(url, 0);
      expect(result).toEqual({ valid: true });
    });

    it('should accept when currentCount is 19 (one below limit)', () => {
      const result = validateSourceAddition('https://example.com', 19);
      expect(result).toEqual({ valid: true });
    });
  });

  describe('invalid URLs', () => {
    it('should reject when currentCount is 20 (at limit)', () => {
      const result = validateSourceAddition('https://example.com', 20);
      expect(result).toEqual({ valid: false, error: 'Raggiunto il limite massimo di 20 fonti personalizzate' });
    });

    it('should reject when currentCount exceeds 20', () => {
      const result = validateSourceAddition('https://example.com', 25);
      expect(result).toEqual({ valid: false, error: 'Raggiunto il limite massimo di 20 fonti personalizzate' });
    });

    it('should reject URL longer than 2048 characters', () => {
      const url = 'https://example.com/' + 'a'.repeat(2049);
      const result = validateSourceAddition(url, 0);
      expect(result).toEqual({ valid: false, error: "L'URL non può superare i 2048 caratteri" });
    });

    it('should reject an invalid URL', () => {
      const result = validateSourceAddition('not-a-url', 0);
      expect(result).toEqual({ valid: false, error: "L'URL inserito non è valido" });
    });

    it('should reject empty string', () => {
      const result = validateSourceAddition('', 0);
      expect(result).toEqual({ valid: false, error: "L'URL inserito non è valido" });
    });

    it('should reject ftp:// protocol', () => {
      const result = validateSourceAddition('ftp://files.example.com/events', 0);
      expect(result).toEqual({ valid: false, error: "L'URL deve utilizzare il protocollo http o https" });
    });

    it('should reject file:// protocol', () => {
      const result = validateSourceAddition('file:///etc/passwd', 0);
      expect(result).toEqual({ valid: false, error: "L'URL deve utilizzare il protocollo http o https" });
    });

    it('should reject mailto: protocol', () => {
      const result = validateSourceAddition('mailto:test@example.com', 0);
      expect(result).toEqual({ valid: false, error: "L'URL deve utilizzare il protocollo http o https" });
    });
  });
});
