// Encode and decode form state for sharing via URL.
// Uses base64 encoding to serialize form state into URL query parameters.

import type { FormState } from '../types';

export function encodeFormState(state: FormState): string {
  try {
    const json = JSON.stringify(state);
    return btoa(json);
  } catch (error) {
    console.error('Failed to encode form state:', error);
    return '';
  }
}

export function decodeFormState(encoded: string): FormState | null {
  try {
    const json = atob(encoded);
    console.debug('Decoded form state JSON:', json);
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to decode form state:', error);
    return null;
  }
}

