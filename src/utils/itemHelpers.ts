// Helper functions for item manipulation.
// Provides utilities for creating new items and safely evaluating numeric expressions.

import type { Item } from '../types';

export function emptyItem(): Partial<Item> {
  return {portionsPaying: 1, totalPortions: 1, id: crypto.randomUUID()};
}

export function safeEval(expr: string, defaultValue: any) {
  try {
    // eslint-disable-next-line no-eval
    return eval(expr);
  } catch (ignored) {
    return defaultValue;
  }
}

