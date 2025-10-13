// Friend-focused wizard component for bill splitting.
// Provides a simplified 3-step flow: select items, configure splits, and pay.
// Manages its own internal state separately from the main app state.

import React, { useState, useMemo } from 'react';
import type { Item } from '../types';
import { calculateDebt } from '../utils/debtCalculation';
import { getVenmoUrl } from '../utils/venmoUrl';
import { SplitControls } from './SplitControls';

interface FriendWizardProps {
  items: Partial<Item>[];
  subtotal?: number;
  total?: number;
  tip: number;
  tipIsRate: boolean;
  tipIncludedInTotal: boolean;
  isPayingMe: boolean;
}

interface DebtBreakdown {
  mySubtotal: number;
  myTax: number;
  myTip: number;
  myTotal: number;
}

interface SplitConfig {
  portionsPaying: number;
  totalPortions: number;
}

export function FriendWizard(props: FriendWizardProps) {
  const { items, subtotal, total, tip, tipIsRate, tipIncludedInTotal, isPayingMe: initialIsPayingMe } = props;

  // Wizard internal state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [friendSplitConfig, setFriendSplitConfig] = useState<Map<string, SplitConfig>>(new Map());
  const [isPayingMe, setIsPayingMe] = useState<boolean>(initialIsPayingMe);

  // Get selected items with friend's split configuration
  const selectedItems = useMemo(() => {
    return items
      .filter(item => item.id && selectedItemIds.has(item.id))
      .map(item => {
        const config = friendSplitConfig.get(item.id!);
        return {
          ...item,
          portionsPaying: config?.portionsPaying ?? item.portionsPaying ?? 1,
          totalPortions: config?.totalPortions ?? item.totalPortions ?? 1,
        };
      });
  }, [items, selectedItemIds, friendSplitConfig]);

  // Calculate debt based on selected items with friend's configuration
  const debt = useMemo(() => {
    return calculateDebt({
      items: selectedItems,
      subtotal,
      total,
      tip,
      tipIsRate,
      tipIncludedInTotal
    });
  }, [selectedItems, subtotal, total, tip, tipIsRate, tipIncludedInTotal]);

  // Calculate detailed breakdown
  const breakdown = useMemo((): DebtBreakdown => {
    // Calculate my subtotal
    let mySubtotal = 0;
    for (const item of selectedItems) {
      const actualTotal = Math.max(1, Math.abs(item.totalPortions ?? 1));
      const proportion = (item.portionsPaying ?? 1) / actualTotal;
      mySubtotal += (item.cost ?? 0) * proportion;
    }

    // Calculate my share of tax and fees
    const billSubtotal = subtotal ?? mySubtotal;
    const billTotal = total ?? billSubtotal;
    const tax = billTotal - billSubtotal;
    const myRatio = billSubtotal ? mySubtotal / billSubtotal : 0;
    const myTax = tax * myRatio;

    // Calculate my share of tip
    let myTip = 0;
    if (!tipIncludedInTotal) {
      if (tipIsRate) {
        myTip = billTotal * tip / 100 * myRatio;
      } else {
        myTip = tip * myRatio;
      }
    }

    return {
      mySubtotal,
      myTax,
      myTip,
      myTotal: mySubtotal + myTax + myTip
    };
  }, [selectedItems, subtotal, total, tip, tipIsRate, tipIncludedInTotal]);

  const debtStr = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(debt);
  const amountStr = debtStr.substring(1);
  const note = encodeURIComponent("dinner-debt");

  // Step 1: Item Selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
        // Also remove any split config for this item
        setFriendSplitConfig(configPrev => {
          const newConfig = new Map(configPrev);
          newConfig.delete(itemId);
          return newConfig;
        });
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Step 2: Split Configuration
  const updateSplitConfig = (itemId: string, config: SplitConfig) => {
    setFriendSplitConfig(prev => {
      const newConfig = new Map(prev);
      newConfig.set(itemId, config);
      return newConfig;
    });
  };

  // Navigation
  const goToStep = (step: 1 | 2 | 3) => {
    setCurrentStep(step);
  };

  const canProceedFromStep1 = selectedItemIds.size > 0;

  return (
    <div className="wizard-container">
      {/* Progress Indicator */}
      <div className="wizard-progress">
        Step {currentStep} of 3
      </div>

      {/* Step 1: Select Items */}
      {currentStep === 1 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">What did you eat?</h2>
          <p className="wizard-step-description">
            Check the items you ate or shared
          </p>
          
          <div className="item-checkbox-list">
            {items.map(item => {
              if (!item.id) return null;
              const isSelected = selectedItemIds.has(item.id);
              const itemCost = item.cost ?? 0;
              const costStr = Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(itemCost);

              return (
                <label key={item.id} className="item-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(item.id!)}
                    className="item-checkbox-input"
                  />
                  <span className="item-checkbox-label">
                    {item.name && <span className="item-checkbox-name">{item.name}</span>}
                    <span className="item-checkbox-cost">{costStr}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="running-total">
            <span>Items selected: {selectedItemIds.size}</span>
          </div>

          <div className="wizard-nav">
            <button
              className="btn btn-primary btn-wizard-next"
              onClick={() => goToStep(2)}
              disabled={!canProceedFromStep1}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure Splits */}
      {currentStep === 2 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Any shared items?</h2>
          <p className="wizard-step-description">
            Specify how many people shared each item
          </p>

          <div className="split-config-list">
            {selectedItems.map(item => {
              if (!item.id) return null;
              
              const config = friendSplitConfig.get(item.id) ?? {
                portionsPaying: item.portionsPaying ?? 1,
                totalPortions: item.totalPortions ?? 1
              };

              const costStr = Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(item.cost ?? 0);

              return (
                <div key={item.id} className="split-config-item">
                  <div className="split-config-header">
                    {item.name && <div className="split-config-name">{item.name}</div>}
                    <div className="split-config-cost">{costStr}</div>
                  </div>

                  <div className="item-controls">
                    <SplitControls
                      totalPortions={config.totalPortions}
                      portionsPaying={config.portionsPaying}
                      maxSplit={Math.max(8, ...selectedItems.map(i => Math.abs(i.totalPortions ?? 1)))}
                      onTotalPortionsChange={(newTotal) => {
                        const newPaying = Math.min(config.portionsPaying, Math.abs(newTotal));
                        updateSplitConfig(item.id!, {
                          portionsPaying: newPaying,
                          totalPortions: newTotal
                        });
                      }}
                      onPortionsPayingChange={(newPaying) => {
                        updateSplitConfig(item.id!, {
                          ...config,
                          portionsPaying: newPaying
                        });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

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

      {/* Step 3: Payment Summary */}
      {currentStep === 3 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Ready to pay?</h2>
          
          <div className="payment-summary">
            <h3 className="payment-summary-title">Your items{tipIncludedInTotal ? ' *' : ''}:</h3>
            <div className="payment-summary-items">
              {selectedItems.map(item => {
                if (!item.id) return null;
                const itemCost = item.cost ?? 0;
                const actualTotal = Math.max(1, Math.abs(item.totalPortions ?? 1));
                const proportion = (item.portionsPaying ?? 1) / actualTotal;
                const yourShare = itemCost * proportion;
                
                const shareStr = Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(yourShare);

                return (
                  <div key={item.id} className="payment-summary-item">
                    <span className="payment-summary-item-name">
                      {item.name || 'Item'}
                      {item.totalPortions && item.totalPortions > 1 && (
                        <span className="payment-summary-item-split">
                          {' '}({item.portionsPaying}/{item.totalPortions})
                        </span>
                      )}
                    </span>
                    <span className="payment-summary-item-cost">{shareStr}</span>
                  </div>
                );
              })}
              
              {/* Fees rendered the same way as items */}
              {(breakdown.myTax > 0 || breakdown.myTip > 0) && (
                <div className="payment-summary-divider"></div>
              )}
              {breakdown.myTax > 0 && (
                <div className="payment-summary-item">
                  <span className="payment-summary-item-name">Your share of tax & fees {tipIncludedInTotal ? ' *' : ''}</span>
                  <span className="payment-summary-item-cost">
                    {Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(breakdown.myTax)}
                  </span>
                </div>
              )}
              {breakdown.myTip > 0 && (
                <div className="payment-summary-item">
                  <span className="payment-summary-item-name">Your share of tip</span>
                  <span className="payment-summary-item-cost">
                    {Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(breakdown.myTip)}
                  </span>
                </div>
              )}
            </div>
            
            {tipIncludedInTotal && (
              <div className="tip-included-notice">
                * Gratuity is already included in the fees
              </div>
            )}
          </div>

          <div className="payment-amount">
            <div className="payment-amount-label">You owe:</div>
            <div className="payment-amount-value">{debtStr}</div>
          </div>

          {/* Payment recipient selection */}
          <div className="payment-recipient-selector">
            <p className="payment-recipient-question">Are you paying Mike Delmonaco?</p>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  className="radio-input"
                  name="paying-me" 
                  type="radio" 
                  checked={isPayingMe} 
                  onChange={() => setIsPayingMe(true)}
                />
                Yes
              </label>
              
              <label className="radio-label">
                <input 
                  className="radio-input"
                  name="not-paying-me" 
                  type="radio" 
                  checked={!isPayingMe} 
                  onChange={() => setIsPayingMe(false)}
                />
                No
              </label>
            </div>
          </div>

          <div className="wizard-actions">
            <a
              className="action-button venmo-button venmo-button-large"
              href={isPayingMe 
                ? getVenmoUrl(amountStr, note, 'Mike-Delmonaco')
                : getVenmoUrl(amountStr, note)
              }
            >
              Pay {debtStr} with Venmo
            </a>
          </div>

          <div className="wizard-nav">
            <button
              className="btn btn-outline btn-wizard-back"
              onClick={() => goToStep(2)}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

