// Firebase web app config. These values are public by design: access is
// controlled by firestore.rules, not by keeping this secret.
//
// Leave as null until the Firebase project exists; the app then runs in
// link-only mode exactly as before. For local development against the
// emulators, run with REACT_APP_FIREBASE_EMULATORS=true instead.

import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions | null = null;
