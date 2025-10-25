// Single split selector component for configuring portions.
// Handles dropdown with standard options and optional custom input mode.
// Reusable across different contexts (split between, paying for, etc.)

import React from 'react';

interface SplitSelectorProps {
  label: string;
  value: number;
  maxValue?: number;
  maxSplit?: number;
  onChange: (value: number) => void;
  justMeText?: string;
  multipleText?: (n: number) => string;
  showMoreOption?: boolean;
}

export function SplitSelector({
  label,
  value,
  maxValue,
  maxSplit = 8,
  onChange,
  justMeText = 'Just me',
  multipleText = (n: number) => `${n} people`,
  showMoreOption = true
}: SplitSelectorProps) {
  const isCustomInputMode = value < 0 || value === 0;
  const displayValue = isCustomInputMode ? Math.abs(value) : value;
  const effectiveMaxValue = maxValue ?? maxSplit;

  return (
    <div className="control-group">
      <label className="control-label">{label}</label>
      {isCustomInputMode ? (
        <input
          className="form-control form-control-sm"
          type="number"
          inputMode="numeric"
          value={value === 0 ? '' : displayValue}
          onChange={(ev) => {
            const inputValue = ev.target.value;
            const newValue = inputValue === '' ? 0 : Number(inputValue);
            onChange(newValue === 0 ? 0 : -Math.abs(newValue));
          }}
        />
      ) : (
        <select 
          className="form-control portion-select"
          value={value}
          onChange={(ev) => {
            const selectedValue = ev.target.value;
            if (selectedValue === 'more') {
              const newValue = maxSplit + 1;
              onChange(-newValue);
            } else {
              onChange(Number(selectedValue));
            }
          }}
        >
          <option value={1}>{justMeText}</option>
          {Array.from({length: effectiveMaxValue - 1}, (_, i) => i + 2).map(n => (
            <option key={n} value={n}>{multipleText(n)}</option>
          ))}
          {showMoreOption && effectiveMaxValue >= maxSplit && (
            <option value="more">...more</option>
          )}
        </select>
      )}
    </div>
  );
}

