import { describe, it, expect } from 'vitest';
import { validateRadius } from '../../utils/validation';

describe('validateRadius', () => {
  describe('valid inputs', () => {
    it('accepts minimum value 1', () => {
      const result = validateRadius(1);
      expect(result).toEqual({ valid: true, value: 1 });
    });

    it('accepts maximum value 100', () => {
      const result = validateRadius(100);
      expect(result).toEqual({ valid: true, value: 100 });
    });

    it('accepts value in the middle of range', () => {
      const result = validateRadius(50);
      expect(result).toEqual({ valid: true, value: 50 });
    });

    it('accepts default value 15', () => {
      const result = validateRadius(15);
      expect(result).toEqual({ valid: true, value: 15 });
    });

    it('accepts string representation of valid integer', () => {
      const result = validateRadius('42');
      expect(result).toEqual({ valid: true, value: 42 });
    });
  });

  describe('invalid inputs - out of range', () => {
    it('rejects 0', () => {
      const result = validateRadius(0);
      expect(result.valid).toBe(false);
    });

    it('rejects negative numbers', () => {
      const result = validateRadius(-5);
      expect(result.valid).toBe(false);
    });

    it('rejects values above 100', () => {
      const result = validateRadius(101);
      expect(result.valid).toBe(false);
    });

    it('rejects very large numbers', () => {
      const result = validateRadius(1000);
      expect(result.valid).toBe(false);
    });
  });

  describe('invalid inputs - non-integer', () => {
    it('rejects decimal values', () => {
      const result = validateRadius(5.5);
      expect(result.valid).toBe(false);
    });

    it('rejects values like 1.1', () => {
      const result = validateRadius(1.1);
      expect(result.valid).toBe(false);
    });

    it('rejects string decimal values', () => {
      const result = validateRadius('3.14');
      expect(result.valid).toBe(false);
    });
  });

  describe('invalid inputs - non-numeric', () => {
    it('rejects non-numeric strings', () => {
      const result = validateRadius('abc');
      expect(result.valid).toBe(false);
    });

    it('rejects null', () => {
      const result = validateRadius(null);
      expect(result.valid).toBe(false);
    });

    it('rejects undefined', () => {
      const result = validateRadius(undefined);
      expect(result.valid).toBe(false);
    });

    it('rejects objects', () => {
      const result = validateRadius({});
      expect(result.valid).toBe(false);
    });

    it('rejects arrays', () => {
      const result = validateRadius([10]);
      expect(result.valid).toBe(false);
    });

    it('rejects boolean', () => {
      const result = validateRadius(true);
      expect(result.valid).toBe(false);
    });

    it('rejects NaN', () => {
      const result = validateRadius(NaN);
      expect(result.valid).toBe(false);
    });

    it('rejects Infinity', () => {
      const result = validateRadius(Infinity);
      expect(result.valid).toBe(false);
    });

    it('rejects empty string', () => {
      const result = validateRadius('');
      expect(result.valid).toBe(false);
    });
  });
});
