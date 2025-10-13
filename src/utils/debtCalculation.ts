// Calculate user's portion of bill based on items, tax, and tip.
// Handles proportional splitting of items, tax distribution, and tip calculations.

import type { Item } from '../types';

export interface DebtCalculationParams {
  items: Partial<Item>[];
  subtotal?: number;
  total?: number;
  tip: number;
  tipIsRate: boolean;
  tipIncludedInTotal: boolean;
}

export function calculateDebt(params: DebtCalculationParams): number {
  const { items, subtotal, total, tip, tipIsRate, tipIncludedInTotal } = params;
  
  const mySubtotal = calculateMySubtotal(items);
  const tax = (total ?? mySubtotal) - (subtotal ?? mySubtotal);
  const tipCost = calculateTipCost(tip, tipIsRate, tipIncludedInTotal, total, subtotal, mySubtotal);
  const fees = tax + tipCost;
  const myRatio = calculateMyRatio(mySubtotal, subtotal);
  
  if (!(subtotal || mySubtotal)) {
    return 0;
  }
  
  const myFees = fees * myRatio;
  return mySubtotal + myFees;
}

function calculateMySubtotal(items: Partial<Item>[]): number {
  let mySubtotal = 0;
  for (const {cost, portionsPaying, totalPortions} of items) {
    const actualTotal = Math.max(1, Math.abs(totalPortions ?? 1));
    const proportion = (portionsPaying ?? 1) / actualTotal;
    mySubtotal += (cost ?? 0) * proportion;
  }
  return mySubtotal;
}

function calculateTipCost(
  tip: number,
  tipIsRate: boolean,
  tipIncludedInTotal: boolean,
  total: number | undefined,
  subtotal: number | undefined,
  mySubtotal: number
): number {
  if (tipIncludedInTotal) {
    return 0;
  }
  return tipIsRate ? (total ?? subtotal ?? mySubtotal) * tip / 100 : tip;
}

function calculateMyRatio(mySubtotal: number, subtotal: number | undefined): number {
  return mySubtotal / (subtotal ?? mySubtotal);
}

