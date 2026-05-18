/**
 * Validation utility for source URL addition.
 */

/**
 * Result type for source addition validation.
 * On success: { valid: true }
 * On failure: { valid: false, error: string }
 */
export type SourceValidationResult =
  | { valid: true }
  | { valid: false; error: string };

const MAX_URL_LENGTH = 2048;
const MAX_SOURCES = 20;

/**
 * Validates whether a new source URL can be added.
 * Accepts if ALL conditions are met:
 * 1. url is a valid URL (parseable by new URL())
 * 2. url starts with http:// or https://
 * 3. url.length ≤ 2048 characters
 * 4. currentCount < 20
 *
 * Rejects with a descriptive error message in Italian if any condition fails.
 *
 * @param url - The URL string to validate
 * @param currentCount - The current number of custom sources
 * @returns A SourceValidationResult indicating success or failure with an error message
 */
export function validateSourceAddition(url: string, currentCount: number): SourceValidationResult {
  // Check source count limit first
  if (currentCount >= MAX_SOURCES) {
    return { valid: false, error: 'Raggiunto il limite massimo di 20 fonti personalizzate' };
  }

  // Check URL length
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: "L'URL non può superare i 2048 caratteri" };
  }

  // Check URL validity
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, error: "L'URL inserito non è valido" };
  }

  // Check schema (http or https only)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: "L'URL deve utilizzare il protocollo http o https" };
  }

  return { valid: true };
}
