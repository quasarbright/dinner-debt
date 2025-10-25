// Shared type definitions for the Dinner Debt application.
// Centralizes interfaces used across multiple modules.

export interface Item {
  name?: string
  cost: number
  // how many people you're paying for
  portionsPaying: number
  // how many people this was split with
  totalPortions: number
  id: string
}

export interface FormState {
  items: Partial<Item>[]
  subtotal?: number
  total?: number
  tip: number | undefined
  tipIsRate: boolean
  tipIncludedInTotal: boolean
  venmoUsername?: string
}

export interface ReceiptData {
  items: Array<{
    name: string;
    cost: number;
  }>;
  subtotal?: number;
  total?: number;
  tipIncludedInTotal: boolean;
  tip?: number;
}

