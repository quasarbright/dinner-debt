// URLs for live sessions. The bill always stays in the link too, so a link
// still works (without live status) if the backend is unavailable.

import type { FormState } from '../types';
import { encodeFormState } from '../utils/shareUrl';

const SESSION_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

function baseUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

// The session id from the current URL, if it looks valid.
export function sessionIdFromUrl(search = window.location.search): string | null {
  const id = new URLSearchParams(search).get('session');
  return id && SESSION_ID_PATTERN.test(id) ? id : null;
}

// Link friends open.
export function friendUrl(form: FormState, sessionId?: string | null): string {
  const session = sessionId ? `session=${sessionId}&` : '';
  return `${baseUrl()}?${session}data=${encodeFormState(form)}`;
}

// The host's own status page for a session.
export function hostUrl(form: FormState, sessionId: string): string {
  return `${baseUrl()}?mode=host&session=${sessionId}&data=${encodeFormState(form)}`;
}
