// Encode and decode form state for sharing via URL.
// Uses base64 encoding to serialize form state into URL query parameters.

import type { FormState } from '../types';

export function encodeFormState(state: FormState): string {
  try {
    // Item ids are random UUIDs that only matter locally; the decoder
    // regenerates them, so leave them out to keep the URL short.
    const items = state.items.map(({ id, ...rest }) => rest);
    const json = JSON.stringify({ ...state, items });
    console.debug('Encoding form state JSON:', json);
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

