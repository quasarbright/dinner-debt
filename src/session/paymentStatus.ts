// Pure functions that turn a session's payments into what the UI shows:
// how much of each item is paid, which items are fully paid or overpaid,
// and how much money is still outstanding.

import type { Item } from '../types';
import { calculateDebt } from '../utils/debtCalculation';
import { add, compare, fraction, max, min, ONE, subtract, ZERO, type Fraction } from '../utils/fraction';
import type { Payment, SessionBill, Shares } from './types';

// Shares for a selection of items, e.g. "I had 1 of 3 portions of the nachos".
export function sharesFromSelection(
  selections: Array<{ key: string; portionsPaying?: number; totalPortions?: number }>
): Shares {
  const shares: Shares = {};
  for (const { key, portionsPaying, totalPortions } of selections) {
    // Same clamping as debtCalculation: at least one portion, sign ignored.
    const den = Math.max(1, Math.abs(Math.trunc(totalPortions ?? 1)));
    const num = Math.min(den, Math.max(0, Math.trunc(portionsPaying ?? 1)));
    if (num > 0) {
      shares[key] = fraction(num, den);
    }
  }
  return shares;
}

// Sum of all payments per item key. May exceed 1 when an item is overpaid.
export function paidFractions(payments: Payment[]): Map<string, Fraction> {
  const totals = new Map<string, Fraction>();
  for (const payment of payments) {
    for (const [key, share] of Object.entries(payment.shares)) {
      totals.set(key, add(totals.get(key) ?? ZERO, share));
    }
  }
  return totals;
}

export function fullyPaidKeys(payments: Payment[]): Set<string> {
  const result = new Set<string>();
  paidFractions(payments).forEach((paid, key) => {
    if (compare(paid, ONE) >= 0) result.add(key);
  });
  return result;
}

export function overpaidKeys(payments: Payment[]): Set<string> {
  const result = new Set<string>();
  paidFractions(payments).forEach((paid, key) => {
    if (compare(paid, ONE) > 0) result.add(key);
  });
  return result;
}

// Bill amounts including each item's share of tax and tip.
export function billAmounts(bill: SessionBill, payments: Payment[]): { total: number; remaining: number } {
  const paid = paidFractions(payments);
  const allItems: Partial<Item>[] = bill.items.map(item => ({ cost: item.cost, portionsPaying: 1, totalPortions: 1 }));
  const remainingItems: Partial<Item>[] = bill.items.map(item => {
    const unpaid = max(ZERO, subtract(ONE, min(ONE, paid.get(item.key) ?? ZERO)));
    return { cost: item.cost, portionsPaying: unpaid.num, totalPortions: unpaid.den };
  });

  // Pin subtotal/total to the whole bill so tax and tip are spread over all of it,
  // not just over whatever happens to be unpaid.
  const fullSubtotal = bill.subtotal ?? bill.items.reduce((sum, item) => sum + item.cost, 0);
  const params = {
    subtotal: fullSubtotal,
    total: bill.total ?? fullSubtotal,
    tip: bill.tip,
    tipIsRate: bill.tipIsRate,
    tipIncludedInTotal: bill.tipIncludedInTotal,
  };
  return {
    total: calculateDebt({ ...params, items: allItems }),
    remaining: calculateDebt({ ...params, items: remainingItems }),
  };
}
