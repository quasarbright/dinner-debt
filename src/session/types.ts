// Shared types for live bill sessions (see planning/live-bill-status.plan.md).

import type { Fraction } from '../utils/fraction';

// The bill as stored in a session. Locked once shared.
export interface SessionBill {
  items: Array<{
    key: string;
    name?: string;
    cost: number;
    totalPortions: number;
  }>;
  subtotal?: number;
  total?: number;
  tip?: number;
  tipIsRate: boolean;
  tipIncludedInTotal: boolean;
  venmoUsername?: string;
}

export type PaymentSource = 'friend' | 'host-own' | 'host-marked';

// Item key -> fraction of that item this payment covers.
export type Shares = Record<string, Fraction>;

export interface Payment {
  id: string;
  ownerUid: string;
  source: PaymentSource;
  shares: Shares;
}

export type Unsubscribe = () => void;

// What the UI needs from the backend. The Firebase implementation lives in
// firebaseBackend.ts and is only loaded on demand.
export interface SessionBackend {
  uid(): Promise<string>;
  createSession(bill: SessionBill): Promise<string>;
  subscribeToPayments(
    sessionId: string,
    onChange: (payments: Payment[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;
  // A friend's payment, or the host's own items. One per device; replaces any
  // earlier one. The rules reject 'host-own' from non-hosts and vice versa.
  setOwnPayment(sessionId: string, shares: Shares, source: 'friend' | 'host-own'): Promise<void>;
  // Host only: an out-of-band payment. Returns its id.
  addHostMarkedPayment(sessionId: string, shares: Shares): Promise<string>;
  // Host only for host-marked entries; anyone for their own payment.
  deletePayment(sessionId: string, paymentId: string): Promise<void>;
}
