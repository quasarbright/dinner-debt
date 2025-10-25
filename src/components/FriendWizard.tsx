// Friend-focused wizard component for bill splitting.
// Provides a simplified 3-step flow: select items, configure splits, and pay.
// In calculator mode, adds a 4th step for bill details confirmation.
// Manages its own internal state separately from the main app state.

import React, { useState, useMemo } from 'react';
import type { Item } from '../types';
import { calculateDebt } from '../utils/debtCalculation';
import { getVenmoUrl } from '../utils/venmoUrl';
import { SplitControls } from './SplitControls';
import { ExpandIndicator } from './ExpandIndicator';
import { BillDetails } from './BillDetails';

interface FriendWizardProps {
  items: Partial<Item>[];
  subtotal?: number;
  total?: number;
  tip: number | undefined;
  tipIsRate: boolean;
  tipIncludedInTotal: boolean;
  isPayingMe: boolean;
  isCalculatorMode?: boolean;
  venmoUsername?: string;
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
  const { 
    items: initialItems,
    subtotal: initialSubtotal,
    total: initialTotal,
    tip: initialTip,
    tipIsRate: initialTipIsRate,
    tipIncludedInTotal,
    isPayingMe: initialIsPayingMe,
    isCalculatorMode = false,
    venmoUsername: initialVenmoUsername
  } = props;

  // Wizard internal state
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(isCalculatorMode ? 0 : 1);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [friendSplitConfig, setFriendSplitConfig] = useState<Map<string, SplitConfig>>(new Map());
  const [isPayingMe, setIsPayingMe] = useState<boolean>(initialIsPayingMe);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  // Calculator mode: editable bill details and item costs
  const [subtotal, setSubtotal] = useState<number | undefined>(initialSubtotal);
  const [total, setTotal] = useState<number | undefined>(initialTotal);
  const [tip, setTip] = useState<number | undefined>(initialTip);
  const [tipIsRate, setTipIsRate] = useState<boolean>(initialTipIsRate);
  const [items, setItems] = useState<Partial<Item>[]>(initialItems);
  const [editingCostItemId, setEditingCostItemId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<string>('');

  // Sync internal state with props when they change (e.g., when URL params change)
  React.useEffect(() => {
    setSubtotal(initialSubtotal);
    setTotal(initialTotal);
    setTip(initialTip);
    setTipIsRate(initialTipIsRate);
    setItems(initialItems);
    setIsPayingMe(initialIsPayingMe);
  }, [initialSubtotal, initialTotal, initialTip, initialTipIsRate, initialItems, initialIsPayingMe]);

  // Update item cost (calculator mode only)
  const updateItemCost = (itemId: string, newCost: number) => {
    if (!isCalculatorMode) return;
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, cost: newCost } : item
      )
    );
  };

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
    if (!tipIncludedInTotal && tip) {
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
  
  // Use venmoUsername from props if provided (from share URL), otherwise use isPayingMe logic
  const hasVenmoUsername = !!initialVenmoUsername;

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

  // Navigation
  const goToStep = (step: 0 | 1 | 2 | 3) => {
    setCurrentStep(step);
  };

  const canProceedFromStep1 = selectedItemIds.size > 0;
  const totalSteps = isCalculatorMode ? 4 : 3;
  const displayStep = isCalculatorMode ? currentStep + 1 : currentStep;

  return (
    <div className="wizard-container">
      {/* Progress Indicator */}
      <div className="wizard-progress">
        Step {displayStep} of {totalSteps}
      </div>

      {/* Step 0: Bill Details Confirmation (Calculator Mode Only) */}
      {isCalculatorMode && currentStep === 0 && (
        <div className="wizard-step">
          <h2 className="wizard-step-title">Confirm billing information</h2>
          <p className="wizard-step-description">
            Review and edit the bill details if needed
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
              className="btn btn-primary btn-wizard-next"
              onClick={() => goToStep(1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

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
                    {isCalculatorMode ? (
                      <div className="currency-input-wrapper" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className="currency-symbol">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="form-control form-control-sm currency-input"
                          value={editingCostItemId === item.id ? editingCostValue : (itemCost || '')}
                          onChange={(e) => {
                            e.stopPropagation();
                            setEditingCostValue(e.target.value);
                          }}
                          onFocus={(e) => {
                            e.stopPropagation();
                            setEditingCostItemId(item.id!);
                            setEditingCostValue(itemCost?.toString() ?? '');
                          }}
                          onBlur={() => {
                            const parsed = Number.parseFloat(editingCostValue);
                            updateItemCost(item.id!, editingCostValue === '' || isNaN(parsed) ? 0 : parsed);
                            setEditingCostItemId(null);
                            setEditingCostValue('');
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0.00"
                          style={{ width: '80px' }}
                        />
                      </div>
                    ) : (
                      <span className="item-checkbox-cost">{costStr}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="running-total">
            <span>Items selected: {selectedItemIds.size}</span>
          </div>

          <div className="wizard-nav">
            {isCalculatorMode && (
              <button
                className="btn btn-outline btn-wizard-back"
                onClick={() => goToStep(0)}
              >
                Back
              </button>
            )}
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

              const isExpanded = expandedItemId === item.id;
              const totalPortions = Math.abs(config.totalPortions);
              const isSplit = totalPortions > 1;
              
              // Status text for collapsed state
              const statusText = isSplit 
                ? `Split ${totalPortions} ways, paying for ${config.portionsPaying}`
                : 'Just me';

              return (
                <div key={item.id} className={`split-config-card ${isExpanded ? 'expanded' : ''}`}>
                  <button
                    className="split-config-card-header"
                    onClick={() => setExpandedItemId(isExpanded ? null : (item.id || null))}
                  >
                    <div className="split-config-card-info">
                      {item.name && <div className="split-config-card-name">{item.name}</div>}
                      <div className="split-config-card-status">
                        <ExpandIndicator isExpanded={isExpanded} className="split-config-card-toggle" />
                        {statusText}
                      </div>
                    </div>
                    <div className="split-config-card-cost">{costStr}</div>
                  </button>

                  {isExpanded && (
                    <div className="split-config-card-body">
                      <div className="item-controls">
                        <SplitControls
                          totalPortions={config.totalPortions}
                          portionsPaying={config.portionsPaying}
                          maxSplit={Math.max(8, ...selectedItems.map(i => Math.abs(i.totalPortions ?? 1)))}
                          onTotalPortionsChange={(newTotal) => {
                            setFriendSplitConfig(prev => {
                              const currentConfig = prev.get(item.id!) ?? {
                                portionsPaying: item.portionsPaying ?? 1,
                                totalPortions: item.totalPortions ?? 1
                              };
                              const newPaying = Math.min(currentConfig.portionsPaying, Math.abs(newTotal));
                              const newConfig = new Map(prev);
                              newConfig.set(item.id!, {
                                portionsPaying: newPaying,
                                totalPortions: newTotal
                              });
                              return newConfig;
                            });
                          }}
                          onPortionsPayingChange={(newPaying) => {
                            setFriendSplitConfig(prev => {
                              const currentConfig = prev.get(item.id!) ?? {
                                portionsPaying: item.portionsPaying ?? 1,
                                totalPortions: item.totalPortions ?? 1
                              };
                              const newConfig = new Map(prev);
                              newConfig.set(item.id!, {
                                totalPortions: currentConfig.totalPortions,
                                portionsPaying: newPaying
                              });
                              return newConfig;
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
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
            <h3 className="payment-summary-title">Your items:</h3>
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

          {/* Payment recipient selection - only show if no venmoUsername provided */}
          {!hasVenmoUsername && (
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
          )}

          <div className="wizard-actions">
            <a
              className="action-button venmo-button venmo-button-large"
              href={
                hasVenmoUsername 
                  ? getVenmoUrl(amountStr, note, initialVenmoUsername)
                  : isPayingMe 
                    ? getVenmoUrl(amountStr, note, 'Mike-Delmonaco')
                    : getVenmoUrl(amountStr, note)
              }
            >
              {hasVenmoUsername 
                ? `Pay @${initialVenmoUsername} ${debtStr} with Venmo`
                : `Pay ${debtStr} with Venmo`
              }
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
