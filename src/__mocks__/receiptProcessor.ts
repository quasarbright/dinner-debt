// Mock implementation of receipt processor to prevent accidental API calls during tests.
// This mock is automatically used by Jest for any imports of '../receiptProcessor'.

import type { ReceiptData } from '../types';

export async function processReceipt(
  _file: File,
  _apiKey: string
): Promise<ReceiptData> {
  return {
    items: [
      { name: 'Mock Item 1', cost: 10.00 },
      { name: 'Mock Item 2', cost: 15.00 }
    ],
    subtotal: 25.00,
    total: 30.00,
    tipIncludedInTotal: false,
    tip: 5.00
  };
}

