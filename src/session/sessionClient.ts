// Entry point the UI uses for live sessions.
// - Loads the Firebase SDK lazily, so link-only users never download it.
// - Returns null when sessions are unavailable (no config, SDK failed to load),
//   so callers fall back to link-only mode.
// - Puts a timeout on calls the UI waits for, so a slow backend can never
//   block sharing or paying.

import { firebaseConfig } from './firebaseConfig';
import type { SessionBackend } from './types';

const DEFAULT_TIMEOUT_MS = 5000;

let backendPromise: Promise<SessionBackend | null> | null = null;

function emulatorsEnabled(): boolean {
  return process.env.REACT_APP_FIREBASE_EMULATORS === 'true';
}

export function sessionsEnabled(): boolean {
  return firebaseConfig !== null || emulatorsEnabled();
}

export function getSessionBackend(): Promise<SessionBackend | null> {
  if (!sessionsEnabled()) return Promise.resolve(null);
  backendPromise ??= import('./firebaseBackend')
    .then(({ createFirebaseBackend }) =>
      emulatorsEnabled()
        ? createFirebaseBackend({
            config: { projectId: 'demo-dinner-debt', apiKey: 'demo-key' },
            emulators: { firestore: '127.0.0.1:8080', auth: 'http://127.0.0.1:9099' },
          })
        : createFirebaseBackend({ config: firebaseConfig! })
    )
    .catch(error => {
      console.warn('Live sessions unavailable:', error);
      backendPromise = null; // allow a retry later
      return null;
    });
  return backendPromise;
}

export function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}
