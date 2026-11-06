// Firebase implementation of SessionBackend.
// Imported only through sessionClient.ts's dynamic import, so the Firebase SDK
// is never downloaded by people who don't use sessions.

import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { parseUnitFraction } from '../utils/fraction';
import type { Payment, PaymentSource, SessionBackend, SessionBill, Shares } from './types';

export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export interface FirebaseBackendOptions {
  config: FirebaseOptions;
  // e.g. { firestore: '127.0.0.1:8080', auth: 'http://127.0.0.1:9099' }
  emulators?: { firestore: string; auth: string };
  // Distinct app names let tests run several "devices" in one process.
  appName?: string;
}

const SOURCES: PaymentSource[] = ['friend', 'host-own', 'host-marked'];

// Payments are written by other people's browsers, so validate everything.
function parsePayment(id: string, data: Record<string, unknown>): Payment | null {
  const { ownerUid, source, shares } = data;
  if (typeof ownerUid !== 'string' || !SOURCES.includes(source as PaymentSource)) return null;
  if (typeof shares !== 'object' || shares === null) return null;
  const parsed: Shares = {};
  for (const [key, value] of Object.entries(shares)) {
    const share = parseUnitFraction(value);
    if (share && share.num > 0) parsed[key] = share;
  }
  return { id, ownerUid, source: source as PaymentSource, shares: parsed };
}

export function createFirebaseBackend(options: FirebaseBackendOptions): SessionBackend {
  const app = initializeApp(options.config, options.appName);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (options.emulators) {
    connectAuthEmulator(auth, options.emulators.auth, { disableWarnings: true });
    const [host, port] = options.emulators.firestore.split(':');
    connectFirestoreEmulator(db, host, Number(port));
  }

  // Reuse this browser's anonymous user across page loads, so a friend who
  // pays twice replaces their payment instead of adding a second one.
  let uidPromise: Promise<string> | null = null;
  const uid = () => {
    if (!uidPromise) {
      uidPromise = auth.authStateReady()
        .then(() => auth.currentUser ?? signInAnonymously(auth).then(cred => cred.user))
        .then(user => user.uid);
      // Retry on the next call if sign-in failed (e.g. offline).
      uidPromise.catch(() => { uidPromise = null; });
    }
    return uidPromise;
  };

  const sessions = collection(db, 'sessions');
  const payments = (sessionId: string) => collection(db, 'sessions', sessionId, 'payments');

  return {
    uid,

    async createSession(bill: SessionBill) {
      const hostUid = await uid();
      const ref = doc(sessions); // random 20-char id; rules forbid overwriting
      await setDoc(ref, {
        hostUid,
        bill,
        itemKeys: bill.items.map(item => item.key),
        createdAt: serverTimestamp(),
        // Only used for TTL cleanup; rules check it against the server clock.
        expiresAt: Timestamp.fromMillis(Date.now() + SESSION_LIFETIME_MS),
      });
      return ref.id;
    },

    subscribeToPayments(sessionId, onChange, onError) {
      let unsubscribe: (() => void) | null = null;
      let cancelled = false;
      uid().then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          payments(sessionId),
          snapshot => {
            const parsed = snapshot.docs
              .map(d => parsePayment(d.id, d.data()))
              .filter((p): p is Payment => p !== null);
            onChange(parsed);
          },
          onError
        );
      }, onError);
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    },

    async setOwnPayment(sessionId, shares, source) {
      const ownerUid = await uid();
      await setDoc(doc(payments(sessionId), ownerUid), {
        ownerUid,
        source,
        shares,
        createdAt: serverTimestamp(),
      });
    },

    async addHostMarkedPayment(sessionId: string, shares: Shares) {
      const ownerUid = await uid();
      const ref = await addDoc(payments(sessionId), {
        ownerUid,
        source: 'host-marked',
        shares,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },

    async deletePayment(sessionId: string, paymentId: string) {
      await uid();
      await deleteDoc(doc(payments(sessionId), paymentId));
    },
  };
}
