// End-to-end test of the real session backend against the Firestore and Auth
// emulators, with the real security rules. Each backend instance is a
// separate "device" with its own anonymous user.
// Run with `npm run test:rules`.

import { createFirebaseBackend } from '../src/session/firebaseBackend';
import { paidFractions } from '../src/session/paymentStatus';
import type { Payment, SessionBackend, SessionBill } from '../src/session/types';
import { fraction } from '../src/utils/fraction';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteApp, getApps } from 'firebase/app';
import { setLogLevel } from 'firebase/firestore';

// Expected permission denials are noise.
setLogLevel('error');

let deviceCount = 0;
const device = (): SessionBackend =>
  createFirebaseBackend({
    config: { projectId: 'demo-dinner-debt', apiKey: 'demo-key' },
    emulators: { firestore: '127.0.0.1:8080', auth: 'http://127.0.0.1:9099' },
    appName: `device-${++deviceCount}`,
  });

const bill: SessionBill = {
  items: [
    { key: 'nachos|1200|1', name: 'Nachos', cost: 12, totalPortions: 3 },
    { key: 'beer|700|1', name: 'Beer', cost: 7, totalPortions: 1 },
  ],
  subtotal: 19,
  tip: 20,
  tipIsRate: true,
  tipIncludedInTotal: false,
  venmoUsername: undefined, // undefined fields must not break writes
};

// Resolve with the first payments snapshot that satisfies `done`.
function waitForPayments(
  backend: SessionBackend,
  sessionId: string,
  done: (payments: Payment[]) => boolean
): Promise<Payment[]> {
  return new Promise((resolvePromise, reject) => {
    const unsubscribe = backend.subscribeToPayments(
      sessionId,
      payments => {
        if (done(payments)) {
          unsubscribe();
          resolvePromise(payments);
        }
      },
      reject
    );
  });
}

beforeAll(async () => {
  // Load the real rules into the emulator.
  const env = await initializeTestEnvironment({
    projectId: 'demo-dinner-debt',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  await env.clearFirestore();
});

afterAll(() => Promise.all(getApps().map(app => deleteApp(app))));

it('host creates a session, friends pay, everyone sees exact totals', async () => {
  const host = device();
  const friendA = device();
  const friendB = device();

  const sessionId = await host.createSession(bill);
  expect(sessionId).toMatch(/^[A-Za-z0-9]{20}$/);

  await host.setOwnPayment(sessionId, { 'beer|700|1': fraction(1, 1) }, 'host-own');
  await friendA.setOwnPayment(sessionId, { 'nachos|1200|1': fraction(1, 3) }, 'friend');
  await friendB.setOwnPayment(sessionId, { 'nachos|1200|1': fraction(2, 3) }, 'friend');

  const payments = await waitForPayments(host, sessionId, p => p.length === 3);
  const paid = paidFractions(payments);
  expect(paid.get('nachos|1200|1')).toEqual({ num: 1, den: 1 });
  expect(paid.get('beer|700|1')).toEqual({ num: 1, den: 1 });
  expect(payments.map(p => p.source).sort()).toEqual(['friend', 'friend', 'host-own']);
});

it('paying again replaces the earlier payment from the same device', async () => {
  const host = device();
  const friend = device();
  const sessionId = await host.createSession(bill);

  await friend.setOwnPayment(sessionId, { 'nachos|1200|1': fraction(1, 3) }, 'friend');
  await friend.setOwnPayment(sessionId, { 'nachos|1200|1': fraction(2, 3) }, 'friend');

  const payments = await waitForPayments(host, sessionId, p => p.length >= 1);
  expect(payments).toHaveLength(1);
  expect(payments[0].shares['nachos|1200|1']).toEqual({ num: 2, den: 3 });
});

it('host can add and remove out-of-band payments; friends cannot', async () => {
  const host = device();
  const friend = device();
  const sessionId = await host.createSession(bill);

  const markedId = await host.addHostMarkedPayment(sessionId, { 'beer|700|1': fraction(1, 1) });
  await expect(friend.addHostMarkedPayment(sessionId, { 'beer|700|1': fraction(1, 1) })).rejects.toThrow();
  await expect(friend.deletePayment(sessionId, markedId)).rejects.toThrow();

  await host.deletePayment(sessionId, markedId);
  const payments = await waitForPayments(host, sessionId, () => true);
  expect(payments).toHaveLength(0);
});

it('rejects a friend posing as the host', async () => {
  const host = device();
  const friend = device();
  const sessionId = await host.createSession(bill);
  await expect(friend.setOwnPayment(sessionId, { 'beer|700|1': fraction(1, 1) }, 'host-own')).rejects.toThrow();
});

it('ignores malformed shares written by a misbehaving client', async () => {
  const host = device();
  const sessionId = await host.createSession(bill);
  // Rules can't validate every map value, so a bad client can store floats.
  await host.setOwnPayment(sessionId, {
    'nachos|1200|1': { num: 0.5, den: 1 },
    'beer|700|1': fraction(1, 1),
  }, 'host-own');

  const [payment] = await waitForPayments(host, sessionId, p => p.length === 1);
  expect(payment.shares).toEqual({ 'beer|700|1': { num: 1, den: 1 } });
});
