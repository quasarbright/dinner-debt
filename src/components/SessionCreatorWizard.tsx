// Session creator wizard for setting up bills to share with friends.
// Provides a 3-step flow: verify items, confirm bill details, and share.
// Manages its own internal state for the bill configuration.

import React, { useState } from 'react';
import type { Item } from '../types';
import { BillDetails } from './BillDetails';
import { SplitSelector } from './SplitSelector';
import { ShareSection } from './ShareSection';
import { HostDashboard } from './HostDashboard';
import { emptyItem } from '../utils/itemHelpers';
import type { FormState } from '../types';
import { getSessionBackend, sessionsEnabled, withTimeout } from '../session/sessionClient';
import { sessionBillFromForm } from '../session/sessionBill';
import { hostUrl } from '../session/sessionUrls';

interface SessionCreatorWizardProps {
  initialItems?: Partial<Item>[];
  initialSubtotal?: number;
  initialTotal?: number;
  initialTip?: number;
  initialTipIsRate?: boolean;
  initialTipIncludedInTotal?: boolean;
  initialVenmoUsername?: string;
}

export function SessionCreatorWizard({
  initialItems = [emptyItem()],
  initialSubtotal,
  initialTotal,
  initialTip = 20,
  initialTipIsRate = true,
  initialTipIncludedInTotal = false,
  initialVenmoUsername
}: SessionCreatorWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [items, setItems] = useState<Partial<Item>[]>(initialItems);
  const [subtotal, setSubtotal] = useState<number | undefined>(initialSubtotal);
  const [total, setTotal] = useState<number | undefined>(initialTotal);
  const [tip, setTip] = useState<number | undefined>(initialTip);
  const [tipIsRate, setTipIsRate] = useState<boolean>(initialTipIsRate);
  const [tipIncludedInTotal] = useState<boolean>(initialTipIncludedInTotal);
  const [venmoUsername, setVenmoUsername] = useState<string>(() => {
    // Load from initialVenmoUsername first, otherwise try localStorage
    if (initialVenmoUsername) return initialVenmoUsername;
    return localStorage.getItem('venmo_username') || '';
  });
  const [rememberUsername, setRememberUsername] = useState<boolean>(() => {
    return !!localStorage.getItem('venmo_username');
  });
  const [editingCostIndex, setEditingCostIndex] = useState<number | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<string>('');

  // Sync internal state with props when they change (e.g., after receipt upload)
  React.useEffect(() => {
    setItems(initialItems);
    setSubtotal(initialSubtotal);
    setTotal(initialTotal);
    setTip(initialTip);
    setTipIsRate(initialTipIsRate);
    // Only update venmoUsername if explicitly provided via props
    if (initialVenmoUsername !== undefined) {
      setVenmoUsername(initialVenmoUsername);
    }
  }, [initialItems, initialSubtotal, initialTotal, initialTip, initialTipIsRate, initialVenmoUsername]);

  const setItem = (index: number, updates: Partial<Item>) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], ...updates };
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prevItems => [...prevItems, emptyItem()]);
  };

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    // When leaving step 3, save username to localStorage if checkbox is checked
    if (currentStep === 3 && step !== 3) {
      if (rememberUsername && venmoUsername) {
        localStorage.setItem('venmo_username', venmoUsername);
      } else if (!rememberUsername) {
        localStorage.removeItem('venmo_username');
      }
    }
    setCurrentStep(step);
  };

  // Live session for this bill. Once it exists the bill is locked: the
  // wizard is replaced by the host dashboard.
  const [shared, setShared] = useState<{ form: FormState; sessionId: string } | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionFailed, setSessionFailed] = useState(false);

  React.useEffect(() => {
    if (currentStep !== 4 || shared || sessionFailed || creatingSession || !sessionsEnabled()) return;
    const form = formState;
    setCreatingSession(true);
    withTimeout(
      getSessionBackend().then(backend => {
        if (!backend) throw new Error('Sessions unavailable');
        return backend.createSession(sessionBillFromForm(form));
      })
    )
      .then(sessionId => {
        // Refreshing or coming back later reopens the dashboard.
        window.history.replaceState(null, '', hostUrl(form, sessionId));
        setShared({ form, sessionId });
      })
      .catch(error => {
        console.warn('Could not create live session; sharing link only:', error);
        setSessionFailed(true);
      })
      .finally(() => setCreatingSession(false));
    // formState is rebuilt every render; only react to reaching step 4.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, shared, sessionFailed]);

  const formState: FormState = {
    items,
    subtotal,
    total,
    tip,
    tipIsRate,
    tipIncludedInTotal,
    venmoUsername: venmoUsername || undefined
  };

  const maxSplit = Math.max(8, ...items.map(i => Math.abs(i.totalPortions ?? 1)));

  if (shared) {
    return <HostDashboard form={shared.form} sessionId={shared.sessionId} />;
  }

  return (
    <div className="wizard-container">
      <div className="wizard-progress">
        Step {currentStep} of 4
      </div>

      {/* Step 1: Item Verification */}
      {currentStep === 1 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Verify Items</h2>
          <p className="wizard-step-description">
            Check that all items and prices are correct
          </p>

          <div className="items-container">
            {items.map((item, index) => (
              <div key={item.id} className="item-card">
                {item.name !== undefined && (
                  <div className="item-name">
                    <input
                      type="text"
                      className="item-name-input"
                      value={item.name}
                      onChange={(ev) => setItem(index, { name: ev.target.value })}
                      placeholder="Item name"
                    />
                  </div>
                )}
                
                <div className="item-controls">
                  <button 
                    className="btn btn-danger btn-sm btn-remove" 
                    onClick={() => removeItem(index)}
                  >
                    ×
                  </button>
                  
                  <div className="control-group">
                    <label className="control-label">Cost</label>
                    <div className="currency-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        className="form-control form-control-sm currency-input"
                        name={`cost${index}`}
                        type="text"
                        inputMode="decimal"
                        value={editingCostIndex === index ? editingCostValue : (item.cost ?? '')}
                        onChange={(ev) => {
                          setEditingCostValue(ev.target.value);
                        }}
                        onFocus={() => {
                          setEditingCostIndex(index);
                          setEditingCostValue(item.cost?.toString() ?? '');
                        }}
                        onBlur={() => {
                          const parsed = Number.parseFloat(editingCostValue);
                          setItem(index, {
                            cost: editingCostValue === '' || isNaN(parsed) ? undefined : parsed
                          });
                          setEditingCostIndex(null);
                          setEditingCostValue('');
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <SplitSelector
                    label="Split?"
                    value={item.totalPortions ?? 1}
                    maxSplit={maxSplit}
                    onChange={(newTotal) => setItem(index, { totalPortions: newTotal })}
                    justMeText="1 person"
                  />
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-secondary btn-add-item" onClick={addItem}>
            + Add Item
          </button>

          <div className="wizard-nav">
            <button
              className="btn btn-primary btn-wizard-next"
              onClick={() => goToStep(2)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Bill Details Confirmation */}
      {currentStep === 2 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Confirm Bill Details</h2>
          <p className="wizard-step-description">
            Review and edit the bill totals if needed
          </p>
          
          <BillDetails
            subtotal={subtotal}
            total={total}
            tip={tip}
            tipIsRate={tipIsRate}
            tipIncludedInTotal={tipIncludedInTotal}
            onSubtotalChange={setSubtotal}
            onTotalChange={setTotal}
            onTipChange={setTip}
            onTipIsRateChange={setTipIsRate}
          />

          <div className="wizard-nav">
            <button
              className="btn btn-outline btn-wizard-back"
              onClick={() => goToStep(1)}
            >
              Back
            </button>
            <button
              className="btn btn-primary btn-wizard-next"
              onClick={() => goToStep(3)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Venmo Username (Optional) */}
      {currentStep === 3 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Venmo Username (Optional)</h2>
          <p className="wizard-step-description">
            If you want friends to pay you directly, enter your Venmo username
          </p>
          
          <div className="form-group">
            <label className="form-label" htmlFor="venmo">Venmo Username</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>@</span>
              <input
                className="form-control"
                id="venmo"
                type="text"
                value={venmoUsername}
                onChange={(ev) => setVenmoUsername(ev.target.value)}
                placeholder="username"
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label className="radio-label" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(ev) => setRememberUsername(ev.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                Remember my username
              </label>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Leave blank if you prefer friends to select the recipient themselves
            </p>
          </div>

          <div className="wizard-nav">
            <button
              className="btn btn-outline btn-wizard-back"
              onClick={() => goToStep(2)}
            >
              Back
            </button>
            <button
              className={`btn ${venmoUsername ? 'btn-primary' : 'btn-outline'} btn-wizard-next`}
              onClick={() => goToStep(4)}
            >
              {venmoUsername ? 'Next' : 'Skip'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Sharing */}
      {currentStep === 4 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Share with Friends</h2>
          <p className="wizard-step-description">
            Have your friends scan this QR code or share the link with them
          </p>
          
          {creatingSession ? (
            <p className="wizard-step-description">Creating your link…</p>
          ) : (
            <>
              <ShareSection
                formState={formState}
                showAsStep={true}
              />
              {sessionFailed && (
                <p className="wizard-step-description">
                  Live payment tracking isn't available right now, but this link works as usual.
                </p>
              )}
            </>
          )}

          <div className="wizard-nav">
            <button
              className="btn btn-outline btn-wizard-back"
              onClick={() => { setSessionFailed(false); goToStep(3); }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

