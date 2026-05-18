/**
 * Chat message validation utility.
 */

/**
 * Result type for chat message validation.
 * On success: { valid: true, value: string } (trimmed value)
 * On failure: { valid: false, error: string }
 */
export type ChatValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

/**
 * Validates a chat message input.
 * Accepts strings where trim().length is between 1 and 500 inclusive.
 * Rejects empty, whitespace-only, or trimmed > 500 character strings.
 *
 * @param input - The message string to validate
 * @returns A ChatValidationResult indicating success with the trimmed value, or failure with an error message
 */
export function validateChatMessage(input: string): ChatValidationResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Il messaggio non può essere vuoto' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Il messaggio non può superare i 500 caratteri' };
  }

  return { valid: true, value: trimmed };
}
