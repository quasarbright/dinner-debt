// Shared component for bill details inputs (subtotal, total, tip).
// Used in both the main form and the FriendWizard calculator mode.

import React from 'react';

interface BillDetailsProps {
  subtotal: number | undefined;
  total: number | undefined;
  tip: number | undefined;
  tipIsRate: boolean;
  tipIncludedInTotal: boolean;
  onSubtotalChange: (value: number | undefined) => void;
  onTotalChange: (value: number | undefined) => void;
  onTipChange: (value: number | undefined) => void;
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
  const [subtotalStr, setSubtotalStr] = React.useState<string>('');
  const [totalStr, setTotalStr] = React.useState<string>('');
  const [tipStr, setTipStr] = React.useState<string>('');

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
            value={subtotalStr || (subtotal ?? '')}
            onChange={(ev) => {
              setSubtotalStr(ev.target.value);
            }}
            onBlur={() => {
              const parsed = Number.parseFloat(subtotalStr);
              onSubtotalChange(subtotalStr === '' || isNaN(parsed) ? undefined : parsed);
              setSubtotalStr('');
            }}
            onFocus={() => setSubtotalStr(subtotal?.toString() ?? '')}
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
            value={totalStr || (total ?? '')}
            onChange={(ev) => {
              setTotalStr(ev.target.value);
            }}
            onBlur={() => {
              const parsed = Number.parseFloat(totalStr);
              onTotalChange(totalStr === '' || isNaN(parsed) ? undefined : parsed);
              setTotalStr('');
            }}
            onFocus={() => setTotalStr(total?.toString() ?? '')}
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
              type='text' 
              inputMode="decimal"
              value={tipStr || (tip ?? '')}
              onChange={(ev) => {
                setTipStr(ev.target.value);
              }}
              onBlur={() => {
                const parsed = Number.parseFloat(tipStr);
                onTipChange(tipStr === '' || isNaN(parsed) ? undefined : parsed);
                setTipStr('');
              }}
              onFocus={() => setTipStr(tip?.toString() ?? '')}
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
                onChange={() => {}}
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
                onChange={() => {}}
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

