// Security rules tests against the Firestore emulator.
// Run with `npm run test:rules`.

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  setLogLevel,
  updateDoc,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Expected permission denials are noise.
setLogLevel('error');

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_ID = 'AbCdEfGhIjKlMnOpQrSt'; // 20 chars, auto-id shape
const OLD_SESSION_ID = 'OldOldOldOldOldOld12';
const HOST = 'host-uid';
const FRIEND = 'friend-uid';
const OTHER_FRIEND = 'other-friend-uid';
const ITEM_KEYS = ['nachos|1200|1', 'beer|700|1', 'beer|700|2'];

let env: RulesTestEnvironment;

const db = (uid: string | null) =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

const newSession = (hostUid = HOST) => ({
  hostUid,
  bill: { items: [], tipIsRate: true, tipIncludedInTotal: false },
  itemKeys: ITEM_KEYS,
  createdAt: serverTimestamp(),
  expiresAt: Timestamp.fromMillis(Date.now() + 7 * DAY_MS),
});

const payment = (ownerUid: string, source: string, shares: object = { 'nachos|1200|1': { num: 1, den: 3 } }) => ({
  ownerUid,
  source,
  shares,
  createdAt: serverTimestamp(),
});

const paymentRef = (uid: string | null, sessionId: string, paymentId: string) =>
  doc(db(uid), 'sessions', sessionId, 'payments', paymentId);

// Seed data directly, bypassing the rules.
async function seed(path: string, data: object) {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), data));
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dinner-debt',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await seed(`sessions/${SESSION_ID}`, { ...newSession(), createdAt: Timestamp.now() });
  await seed(`sessions/${OLD_SESSION_ID}`, {
    ...newSession(),
    createdAt: Timestamp.fromMillis(Date.now() - 8 * DAY_MS),
    expiresAt: Timestamp.fromMillis(Date.now() - DAY_MS),
  });
});

describe('sessions', () => {
  const NEW_ID = 'NewSessionId12345678';

  it('lets a signed-in user create a session as its host', async () => {
    await assertSucceeds(setDoc(doc(db(HOST), 'sessions', NEW_ID), newSession()));
  });

  it('requires sign-in', async () => {
    await assertFails(setDoc(doc(db(null), 'sessions', NEW_ID), newSession()));
  });

  it('rejects creating a session for someone else', async () => {
    await assertFails(setDoc(doc(db(FRIEND), 'sessions', NEW_ID), newSession(HOST)));
  });

  it('rejects ids that are not auto-id shaped', async () => {
    await assertFails(setDoc(doc(db(HOST), 'sessions', 'short'), newSession()));
    await assertFails(setDoc(doc(db(HOST), 'sessions', 'has-a-dash-1234567890'), newSession()));
  });

  it('rejects a client-chosen createdAt', async () => {
    await assertFails(setDoc(doc(db(HOST), 'sessions', NEW_ID), {
      ...newSession(),
      createdAt: Timestamp.fromMillis(Date.now() + 30 * DAY_MS),
    }));
  });

  it('rejects an expiresAt far from server time + 7 days', async () => {
    await assertFails(setDoc(doc(db(HOST), 'sessions', NEW_ID), {
      ...newSession(),
      expiresAt: Timestamp.fromMillis(Date.now() + 365 * DAY_MS),
    }));
  });

  it('rejects extra fields', async () => {
    await assertFails(setDoc(doc(db(HOST), 'sessions', NEW_ID), { ...newSession(), admin: true }));
  });

  it('never lets anyone overwrite, edit or delete a session', async () => {
    await assertFails(setDoc(doc(db(HOST), 'sessions', SESSION_ID), newSession()));
    await assertFails(updateDoc(doc(db(HOST), 'sessions', SESSION_ID), { itemKeys: [] }));
    await assertFails(deleteDoc(doc(db(HOST), 'sessions', SESSION_ID)));
  });

  it('lets anyone signed in read a live session by id', async () => {
    await assertSucceeds(getDoc(doc(db(FRIEND), 'sessions', SESSION_ID)));
    await assertFails(getDoc(doc(db(null), 'sessions', SESSION_ID)));
  });

  it('hides expired sessions', async () => {
    await assertFails(getDoc(doc(db(HOST), 'sessions', OLD_SESSION_ID)));
  });

  it('forbids listing sessions', async () => {
    await assertFails(getDocs(collection(db(HOST), 'sessions')));
  });
});

describe('friend payments', () => {
  it('lets a friend write their own payment at their uid', async () => {
    await assertSucceeds(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND), payment(FRIEND, 'friend')));
  });

  it('lets a friend replace their own payment', async () => {
    await assertSucceeds(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND), payment(FRIEND, 'friend')));
    await assertSucceeds(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND),
      payment(FRIEND, 'friend', { 'beer|700|2': { num: 1, den: 1 } })));
  });

  it("forbids writing someone else's payment", async () => {
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, OTHER_FRIEND), payment(FRIEND, 'friend')));
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, OTHER_FRIEND), payment(OTHER_FRIEND, 'friend')));
  });

  it('forbids a friend claiming to be the host', async () => {
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND), payment(FRIEND, 'host-own')));
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, 'AutoIdShapedId123456'), payment(FRIEND, 'host-marked')));
  });

  it('rejects item keys that are not on the bill', async () => {
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND),
      payment(FRIEND, 'friend', { 'lobster|9900|1': { num: 1, den: 1 } })));
  });

  it('rejects a client-chosen createdAt and extra fields', async () => {
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND),
      { ...payment(FRIEND, 'friend'), createdAt: Timestamp.now() }));
    await assertFails(setDoc(paymentRef(FRIEND, SESSION_ID, FRIEND),
      { ...payment(FRIEND, 'friend'), note: 'hi' }));
  });

  it('lets a friend delete only their own payment', async () => {
    await seed(`sessions/${SESSION_ID}/payments/${OTHER_FRIEND}`, payment(OTHER_FRIEND, 'friend'));
    await seed(`sessions/${SESSION_ID}/payments/${FRIEND}`, payment(FRIEND, 'friend'));
    await assertFails(deleteDoc(paymentRef(FRIEND, SESSION_ID, OTHER_FRIEND)));
    await assertSucceeds(deleteDoc(paymentRef(FRIEND, SESSION_ID, FRIEND)));
  });

  it('lets anyone signed in read payments of a live session', async () => {
    await assertSucceeds(getDocs(collection(db(FRIEND), 'sessions', SESSION_ID, 'payments')));
    await assertFails(getDocs(collection(db(null), 'sessions', SESSION_ID, 'payments')));
  });

  it('forbids reading or writing payments of an expired session', async () => {
    await assertFails(getDocs(collection(db(FRIEND), 'sessions', OLD_SESSION_ID, 'payments')));
    await assertFails(setDoc(paymentRef(FRIEND, OLD_SESSION_ID, FRIEND), payment(FRIEND, 'friend')));
  });

  it('forbids payments on sessions that do not exist', async () => {
    await assertFails(setDoc(paymentRef(FRIEND, 'NoSuchSession1234567', FRIEND), payment(FRIEND, 'friend')));
  });
});

describe('host payments', () => {
  const MARKED_ID = 'MarkedPaymentId12345';

  it("lets the host record their own items at their uid", async () => {
    await assertSucceeds(setDoc(paymentRef(HOST, SESSION_ID, HOST), payment(HOST, 'host-own')));
  });

  it("doesn't let the host's own payment pose as a friend payment", async () => {
    await assertFails(setDoc(paymentRef(HOST, SESSION_ID, HOST), payment(HOST, 'friend')));
  });

  it('lets the host add, edit and delete out-of-band payments', async () => {
    await assertSucceeds(setDoc(paymentRef(HOST, SESSION_ID, MARKED_ID), payment(HOST, 'host-marked')));
    await assertSucceeds(setDoc(paymentRef(HOST, SESSION_ID, MARKED_ID),
      payment(HOST, 'host-marked', { 'beer|700|1': { num: 1, den: 1 } })));
    await assertSucceeds(deleteDoc(paymentRef(HOST, SESSION_ID, MARKED_ID)));
  });

  it("forbids the host from overwriting or deleting a friend's payment", async () => {
    await seed(`sessions/${SESSION_ID}/payments/${FRIEND}`, payment(FRIEND, 'friend'));
    await assertFails(setDoc(paymentRef(HOST, SESSION_ID, FRIEND), payment(HOST, 'host-marked')));
    await assertFails(deleteDoc(paymentRef(HOST, SESSION_ID, FRIEND)));
  });

  it('forbids out-of-band entries at ids that could be a device uid', async () => {
    await assertFails(setDoc(paymentRef(HOST, SESSION_ID, 'abcdefghijklmnopqrstuvwxyz12'), payment(HOST, 'host-marked')));
  });
});
