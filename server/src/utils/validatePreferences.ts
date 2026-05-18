/**
 * Validation utility for user preferences input.
 */

/**
 * Result type for preferences validation.
 * On success: { valid: true, value: string }
 * On failure: { valid: false, error: string }
 */
export type PreferencesValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

/**
 * Validates a preferences input string.
 * Accepts strings with length ≤ 200 characters.
 * Rejects strings with length > 200 characters.
 * Empty strings are valid (preferences are optional).
 *
 * @param input - The preferences string to validate
 * @returns A PreferencesValidationResult indicating success with the value, or failure with an error message
 */
export function validatePreferences(input: string): PreferencesValidationResult {
  if (input.length > 200) {
    return { valid: false, error: 'Le preferenze non possono superare i 200 caratteri' };
  }

  return { valid: true, value: input };
}
