// Encode and decode form state for sharing via URL.
// New links deflate the JSON and base64url it behind a "z." prefix so big
// receipts still fit in a QR code. Older links are plain base64 JSON.

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { FormState } from '../types';

const DEFLATE_PREFIX = 'z.';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export function encodeFormState(state: FormState): string {
  try {
    // Item ids are random UUIDs that only matter locally; the decoder
    // regenerates them, so leave them out to keep the URL short.
    const items = state.items.map(({ id, ...rest }) => rest);
    const json = JSON.stringify({ ...state, items });
    console.debug('Encoding form state JSON:', json);
    return DEFLATE_PREFIX + bytesToBase64Url(deflateSync(strToU8(json), { level: 9 }));
  } catch (error) {
    console.error('Failed to encode form state:', error);
    return '';
  }
}

export function decodeFormState(encoded: string): FormState | null {
  try {
    const json = encoded.startsWith(DEFLATE_PREFIX)
      ? strFromU8(inflateSync(base64UrlToBytes(encoded.slice(DEFLATE_PREFIX.length))))
      : atob(encoded);
    console.debug('Decoded form state JSON:', json);
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to decode form state:', error);
    return null;
  }
}
