// Reusable split controls for configuring how items are divided.
// Handles both the "split between" and "paying for" selectors with
// support for custom input mode for large split counts.

import React from 'react';
import { SplitSelector } from './SplitSelector';

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

  const handleTotalPortionsChange = (newTotal: number) => {
    const actualTotal = Math.max(1, Math.abs(newTotal === 0 ? 0 : newTotal));
    const newPaying = Math.min(portionsPaying, actualTotal);
    onTotalPortionsChange(newTotal);
    onPortionsPayingChange(newPaying);
  };

  return (
    <>
      <SplitSelector
        label="Split?"
        value={totalPortions}
        maxSplit={maxSplit}
        onChange={handleTotalPortionsChange}
      />
      <SplitSelector
        label="Paying for"
        value={portionsPaying}
        maxValue={Math.abs(totalPortions)}
        onChange={onPortionsPayingChange}
        showMoreOption={false}
      />
    </>
  );
}

