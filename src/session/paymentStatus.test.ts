import { fraction } from '../utils/fraction';
import { billAmounts, fullyPaidKeys, overpaidKeys, paidFractions, sharesFromSelection } from './paymentStatus';
import type { Payment, SessionBill } from './types';

const payment = (id: string, shares: Payment['shares']): Payment =>
  ({ id, ownerUid: id, source: 'friend', shares });

describe('sharesFromSelection', () => {
  it('turns portions into reduced integer fractions', () => {
    expect(sharesFromSelection([
      { key: 'nachos', portionsPaying: 2, totalPortions: 4 },
      { key: 'burger' },
    ])).toEqual({ nachos: { num: 1, den: 2 }, burger: { num: 1, den: 1 } });
  });

  it('clamps nonsense portions like the debt calculation does', () => {
    expect(sharesFromSelection([
      { key: 'a', portionsPaying: 5, totalPortions: 3 },
      { key: 'b', portionsPaying: 1, totalPortions: -2 },
      { key: 'c', portionsPaying: 0, totalPortions: 2 },
    ])).toEqual({ a: { num: 1, den: 1 }, b: { num: 1, den: 2 } });
  });
});

describe('paid status', () => {
  const payments = [
    payment('p1', { nachos: fraction(1, 3), burger: fraction(1, 1) }),
    payment('p2', { nachos: fraction(1, 3) }),
    payment('p3', { nachos: fraction(1, 3), fries: fraction(1, 2) }),
    payment('p4', { fries: fraction(2, 3) }),
  ];

  it('sums payments exactly per item', () => {
    const paid = paidFractions(payments);
    expect(paid.get('nachos')).toEqual({ num: 1, den: 1 });
    expect(paid.get('fries')).toEqual({ num: 7, den: 6 });
    expect(paid.has('salad')).toBe(false);
  });

  it('reports fully paid and overpaid items', () => {
    expect(fullyPaidKeys(payments)).toEqual(new Set(['nachos', 'burger', 'fries']));
    expect(overpaidKeys(payments)).toEqual(new Set(['fries']));
  });
});

describe('billAmounts', () => {
  const bill: SessionBill = {
    items: [
      { key: 'a', cost: 30, totalPortions: 3 },
      { key: 'b', cost: 70, totalPortions: 1 },
    ],
    subtotal: 100,
    total: 110, // $10 tax
    tip: 20,
    tipIsRate: true,
    tipIncludedInTotal: false,
  };

  it('is the whole bill when nothing is paid', () => {
    const { total, remaining } = billAmounts(bill, []);
    expect(total).toBeCloseTo(132); // 110 + 20% of 110
    expect(remaining).toBeCloseTo(132);
  });

  it('spreads tax and tip over what is still unpaid', () => {
    const { remaining } = billAmounts(bill, [payment('p', { a: fraction(2, 3) })]);
    // $20 of items paid = 20% of the bill
    expect(remaining).toBeCloseTo(132 * 0.8);
  });

  it('never goes below zero when items are overpaid', () => {
    const { remaining } = billAmounts(bill, [
      payment('p1', { a: fraction(1, 1), b: fraction(1, 1) }),
      payment('p2', { a: fraction(1, 1) }),
    ]);
    expect(remaining).toBeCloseTo(0);
  });

  it('works without subtotal and total', () => {
    const { total, remaining } = billAmounts(
      { ...bill, subtotal: undefined, total: undefined, tip: 0 },
      [payment('p', { b: fraction(1, 1) })]
    );
    expect(total).toBeCloseTo(100);
    expect(remaining).toBeCloseTo(30);
  });
});
