// Host's live view of a shared bill.
// Shows the share QR/link, how much is still owed, each item's paid status,
// lets the host mark what they ate, and record payments made outside Venmo.

import React, { useEffect, useMemo, useState } from 'react';
import type { FormState } from '../types';
import { ShareSection } from './ShareSection';
import { ExpandIndicator } from './ExpandIndicator';
import { useSessionPayments } from '../hooks/useSessionPayments';
import { billAmounts, overpaidKeys, paidFractions, sharesFromSelection } from '../session/paymentStatus';
import { sessionBillFromForm } from '../session/sessionBill';
import { withTimeout } from '../session/sessionClient';
import type { Payment, Shares } from '../session/types';
import { compare, ONE, type Fraction } from '../utils/fraction';

interface HostDashboardProps {
  form: FormState;
  sessionId: string;
}

// Item key -> portions selected (out of the item's totalPortions).
type Selection = Map<string, number>;

const money = (amount: number) =>
  Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

function selectionFromShares(shares: Shares | undefined, totalPortions: Map<string, number>): Selection {
  const selection: Selection = new Map();
  for (const [key, share] of Object.entries(shares ?? {})) {
    const den = totalPortions.get(key);
    if (!den) continue;
    // Convert back to portions of this item, e.g. 1/2 of a 4-way split = 2.
    selection.set(key, Math.max(1, Math.round((share.num * den) / share.den)));
  }
  return selection;
}

function paidLabel(paid: Fraction | undefined): string {
  if (!paid || paid.num === 0) return 'Unpaid';
  const cmp = compare(paid, ONE);
  if (cmp === 0) return 'Paid';
  if (cmp > 0) return paid.den === 1 ? `Overpaid (${paid.num}×)` : `Overpaid (${paid.num}/${paid.den})`;
  return `${paid.num}/${paid.den} paid`;
}

interface ItemPickerProps {
  items: Array<{ key: string; name?: string; cost: number; totalPortions: number }>;
  selection: Selection;
  onChange: (selection: Selection) => void;
  idPrefix: string;
}

// Checkbox list with a "how many portions" picker for split items.
function ItemPicker({ items, selection, onChange, idPrefix }: ItemPickerProps) {
  const update = (key: string, portions: number | null) => {
    const next = new Map(selection);
    if (portions === null) next.delete(key);
    else next.set(key, portions);
    onChange(next);
  };

  return (
    <div className="item-checkbox-list">
      {items.map(item => {
        const portions = selection.get(item.key);
        const checked = portions !== undefined;
        return (
          <label key={item.key} className="item-checkbox-item">
            <input
              type="checkbox"
              className="item-checkbox-input"
              checked={checked}
              onChange={() => update(item.key, checked ? null : 1)}
            />
            <span className="item-checkbox-label">
              <span className="item-checkbox-name">{item.name || 'Item'}</span>
              {checked && item.totalPortions > 1 && (
                <select
                  className="form-control form-control-sm host-portion-select"
                  aria-label={`Portions of ${item.name || 'item'}`}
                  id={`${idPrefix}-${item.key}`}
                  value={portions}
                  onChange={ev => update(item.key, Number(ev.target.value))}
                >
                  {Array.from({ length: item.totalPortions }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} of {item.totalPortions}</option>
                  ))}
                </select>
              )}
              <span className="item-checkbox-cost">{money(item.cost)}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function toShares(selection: Selection, totalPortions: Map<string, number>): Shares {
  return sharesFromSelection(
    Array.from(selection, ([key, portionsPaying]) => ({ key, portionsPaying, totalPortions: totalPortions.get(key) }))
  );
}

export function HostDashboard({ form, sessionId }: HostDashboardProps) {
  const bill = useMemo(() => sessionBillFromForm(form), [form]);
  const totalPortions = useMemo(() => new Map(bill.items.map(i => [i.key, i.totalPortions])), [bill]);
  const { payments, status, backend } = useSessionPayments(sessionId);

  const paid = useMemo(() => paidFractions(payments), [payments]);
  const overpaid = useMemo(() => overpaidKeys(payments), [payments]);
  const amounts = useMemo(() => billAmounts(bill, payments), [bill, payments]);
  const myPayment = payments.find(p => p.source === 'host-own');
  const markedPayments = payments.filter(p => p.source === 'host-marked');

  const [showMine, setShowMine] = useState(false);
  const [mine, setMine] = useState<Selection>(new Map());
  const [mineDirty, setMineDirty] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [marked, setMarked] = useState<Selection>(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show what's saved until the host starts editing.
  useEffect(() => {
    if (!mineDirty) setMine(selectionFromShares(myPayment?.shares, totalPortions));
  }, [myPayment, mineDirty, totalPortions]);

  const live = status === 'live' && backend !== null;

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await withTimeout(action());
      return true;
    } catch (e) {
      console.warn('Session write failed:', e);
      setError("Couldn't save. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveMine = async () => {
    if (!backend) return;
    const ok = mine.size > 0
      ? await run(() => backend.setOwnPayment(sessionId, toShares(mine, totalPortions), 'host-own'))
      : !myPayment || await run(() => backend.deletePayment(sessionId, myPayment.id));
    if (ok) {
      setMineDirty(false);
      setShowMine(false);
    }
  };

  const markPaid = async () => {
    if (!backend || marked.size === 0) return;
    const ok = await run(() => backend.addHostMarkedPayment(sessionId, toShares(marked, totalPortions)));
    if (ok) {
      setMarked(new Map());
      setShowMarkPaid(false);
    }
  };

  const removeMarked = (payment: Payment) => {
    if (backend) run(() => backend.deletePayment(sessionId, payment.id));
  };

  const describeShares = (shares: Shares) =>
    bill.items
      .filter(item => shares[item.key])
      .map(item => {
        const share = shares[item.key];
        const name = item.name || 'Item';
        return share.num === share.den ? name : `${name} (${share.num}/${share.den})`;
      })
      .join(', ');

  return (
    <div className="wizard-container host-dashboard">
      <div className="wizard-step">
        <h2 className="wizard-step-title">Share with Friends</h2>
        <p className="wizard-step-description">
          Have your friends scan this QR code or share the link with them
        </p>
        <ShareSection formState={form} sessionId={sessionId} showAsStep={true} />
      </div>

      <div className="wizard-step">
        <h2 className="wizard-step-title">Who's paid</h2>

        {status === 'unavailable' ? (
          <p className="wizard-step-description">
            Live payment tracking isn't available right now. Your link still works.
          </p>
        ) : (
          <>
            <div className="payment-amount">
              <div className="payment-amount-label">Still owed</div>
              <div className="payment-amount-value" data-testid="remaining">
                {status === 'loading' ? '…' : money(amounts.remaining)}
              </div>
              <div className="host-total-note">of {money(amounts.total)} total</div>
            </div>

            {overpaid.size > 0 && (
              <div className="error-message host-overpaid-warning" role="alert">
                ⚠️ Some items have been paid for more than once. Check the items marked "Overpaid".
              </div>
            )}

            <div className="payment-summary">
              <div className="payment-summary-items">
                {bill.items.map(item => {
                  const itemPaid = paid.get(item.key);
                  const isPaid = !!itemPaid && compare(itemPaid, ONE) >= 0;
                  return (
                    <div
                      key={item.key}
                      className={`payment-summary-item ${isPaid ? 'item-paid' : ''} ${overpaid.has(item.key) ? 'item-overpaid' : ''}`}
                    >
                      <span className="payment-summary-item-name">
                        {item.name || 'Item'} <span className="host-item-cost">{money(item.cost)}</span>
                      </span>
                      <span className="payment-summary-item-cost host-item-status">{paidLabel(itemPaid)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="host-section">
              <button className="qr-toggle host-section-toggle" onClick={() => setShowMine(v => !v)} disabled={!live}>
                <ExpandIndicator isExpanded={showMine} />
                What did you have?{myPayment ? ` (${describeShares(myPayment.shares)})` : ''}
              </button>
              {showMine && (
                <>
                  <p className="wizard-step-description">
                    Check what you ate so it isn't counted as owed.
                  </p>
                  <ItemPicker
                    items={bill.items}
                    selection={mine}
                    idPrefix="mine"
                    onChange={next => { setMine(next); setMineDirty(true); }}
                  />
                  <button className="btn btn-primary" onClick={saveMine} disabled={saving || !live}>
                    {saving ? 'Saving…' : 'Save my items'}
                  </button>
                </>
              )}
            </div>

            <div className="host-section">
              <button className="qr-toggle host-section-toggle" onClick={() => setShowMarkPaid(v => !v)} disabled={!live}>
                <ExpandIndicator isExpanded={showMarkPaid} />
                Someone paid another way?
              </button>
              {showMarkPaid && (
                <>
                  <p className="wizard-step-description">
                    Mark items as paid, e.g. if someone paid you in cash.
                  </p>
                  <ItemPicker items={bill.items} selection={marked} idPrefix="marked" onChange={setMarked} />
                  <button className="btn btn-primary" onClick={markPaid} disabled={saving || !live || marked.size === 0}>
                    {saving ? 'Saving…' : 'Mark paid'}
                  </button>
                </>
              )}
              {markedPayments.length > 0 && (
                <ul className="host-marked-list">
                  {markedPayments.map(p => (
                    <li key={p.id} className="host-marked-entry">
                      <span>Paid another way: {describeShares(p.shares)}</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeMarked(p)}
                        disabled={saving}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
