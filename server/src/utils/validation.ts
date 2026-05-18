/**
 * Validation utility functions for user input.
 */

/**
 * Result type for validation functions.
 * On success: { valid: true, value: number }
 * On failure: { valid: false, error: string }
 */
export type ValidationResult =
  | { valid: true; value: number }
  | { valid: false; error: string };

/**
 * Validates a search radius value.
 * Accepts only integers between 1 and 100 inclusive.
 * Rejects decimals, non-numeric values, and out-of-range values.
 *
 * @param value - The value to validate (unknown type)
 * @returns A ValidationResult indicating success with the parsed value, or failure with an error message
 */
export function validateRadius(value: unknown): ValidationResult {
  // Check if the value is a number (or can be treated as one)
  if (typeof value !== 'number') {
    // Try to parse string values
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        return { valid: false, error: 'Il valore del raggio deve essere un numero' };
      }
      // Recurse with the parsed number
      return validateRadius(parsed);
    }
    return { valid: false, error: 'Il valore del raggio deve essere un numero' };
  }

  // Reject NaN and Infinity
  if (!isFinite(value)) {
    return { valid: false, error: 'Il valore del raggio deve essere un numero finito' };
  }

  // Reject decimals (must be an integer)
  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Il raggio deve essere un numero intero' };
  }

  // Check range: 1-100 inclusive
  if (value < 1 || value > 200) {
    return { valid: false, error: 'Il raggio deve essere compreso tra 1 e 200 km' };
  }

  return { valid: true, value };
}
