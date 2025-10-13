// Reusable split controls for configuring how items are divided.
// Handles both the "split between" and "paying for" selectors with
// support for custom input mode for large split counts.

import React from 'react';

interface SplitControlsProps {
  totalPortions: number;
  portionsPaying: number;
  maxSplit?: number;
  onTotalPortionsChange: (total: number) => void;
  onPortionsPayingChange: (paying: number) => void;
}

export function SplitControls(props: SplitControlsProps) {
  const {
    totalPortions,
    portionsPaying,
    maxSplit = 8,
    onTotalPortionsChange,
    onPortionsPayingChange
  } = props;

  return (
    <>
      <div className="control-group">
        <label className="control-label">Split?</label>
        {totalPortions < 0 || totalPortions === 0 ? (
          <input
            className="form-control form-control-sm"
            type="number"
            inputMode="numeric"
            value={totalPortions === 0 ? '' : Math.abs(totalPortions)}
            onChange={(ev) => {
              const value = ev.target.value;
              const newTotal = value === '' ? 0 : Number(value);
              const actualTotal = Math.max(1, newTotal);
              const newPaying = Math.min(portionsPaying, actualTotal);
              onTotalPortionsChange(newTotal === 0 ? 0 : -Math.abs(newTotal));
              onPortionsPayingChange(newPaying);
            }}
          />
        ) : (
          <select 
            className="form-control portion-select"
            value={totalPortions}
            onChange={(ev) => {
              const value = ev.target.value;
              if (value === 'more') {
                const newTotal = maxSplit + 1;
                const newPaying = Math.min(portionsPaying, newTotal);
                onTotalPortionsChange(-newTotal);
                onPortionsPayingChange(newPaying);
              } else {
                const newTotal = Number(value);
                const newPaying = Math.min(portionsPaying, newTotal);
                onTotalPortionsChange(newTotal);
                onPortionsPayingChange(newPaying);
              }
            }}
          >
            <option value={1}>Just me</option>
            {Array.from({length: maxSplit - 1}, (_, i) => i + 2).map(n => (
              <option key={n} value={n}>{n} people</option>
            ))}
            <option value="more">...more</option>
          </select>
        )}
      </div>
      
      <div className="control-group">
        <label className="control-label">Paying for</label>
        <select 
          className="form-control portion-select"
          value={portionsPaying}
          onChange={(ev) => onPortionsPayingChange(Number(ev.target.value))}
        >
          {Array.from({length: Math.max(1, Math.abs(totalPortions))}, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n === 1 ? 'Just me' : `${n} people`}</option>
          ))}
        </select>
      </div>
    </>
  );
}

