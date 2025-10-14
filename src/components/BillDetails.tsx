// Shared component for bill details inputs (subtotal, total, tip).
// Used in both the main form and the FriendWizard calculator mode.

import React from 'react';

interface BillDetailsProps {
  subtotal: number;
  total: number;
  tip: number;
  tipIsRate: boolean;
  tipIncludedInTotal: boolean;
  onSubtotalChange: (value: number) => void;
  onTotalChange: (value: number) => void;
  onTipChange: (value: number) => void;
  onTipIsRateChange: (value: boolean) => void;
}

export function BillDetails({
  subtotal,
  total,
  tip,
  tipIsRate,
  tipIncludedInTotal,
  onSubtotalChange,
  onTotalChange,
  onTipChange,
  onTipIsRateChange
}: BillDetailsProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor='sub'>Subtotal (Whole Bill)</label>
        <div className="currency-input-wrapper">
          <span className="currency-symbol">$</span>
          <input 
            className="form-control form-control-sm currency-input"
            name='sub' 
            type='text' 
            inputMode="decimal"
            value={subtotal ?? ''}
            onChange={(ev) => onSubtotalChange(Number.parseFloat(ev.target.value))} 
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor='total'>Total (Whole Bill)</label>
        <div className="currency-input-wrapper">
          <span className="currency-symbol">$</span>
          <input 
            className="form-control form-control-sm currency-input"
            name='total' 
            type='text' 
            inputMode="decimal"
            value={total ?? ''}
            onChange={(ev) => onTotalChange(Number.parseFloat(ev.target.value))} 
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor='tip'>
          Tip{tipIncludedInTotal && ' *'}
        </label>
        <div style={{display: 'flex', alignItems: 'center'}}>
          <div className={tipIsRate ? "percent-input-wrapper" : "currency-input-wrapper"} style={{marginRight: '0.5rem'}}>
            {!tipIsRate && <span className="currency-symbol">$</span>}
            <input 
              className={`form-control form-control-sm ${tipIsRate ? 'percent-input' : 'currency-input'}`}
              name='tip' 
              type='number' 
              inputMode="decimal"
              value={tip} 
              onChange={(ev) => onTipChange(Number.parseFloat(ev.target.value))} 
            />
            {tipIsRate && <span className="percent-symbol">%</span>}
          </div>
          
          <div className="radio-group">
            <label className="radio-label">
              <input 
                className="radio-input"
                name="tipIsRate" 
                type="radio" 
                checked={tipIsRate} 
                onClick={() => onTipIsRateChange(true)}
              />
              percent
            </label>
            
            <label className="radio-label">
              <input 
                className="radio-input"
                name="tipisFlat" 
                type="radio" 
                checked={!tipIsRate} 
                onClick={() => onTipIsRateChange(false)}
              />
              flat amount
            </label>
          </div>
        </div>
        {tipIncludedInTotal && (
          <div className="tip-included-notice">
            * Gratuity is already included in the total
          </div>
        )}
      </div>
    </>
  );
}

