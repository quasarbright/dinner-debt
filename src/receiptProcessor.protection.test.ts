// Test to verify the receipt processor safety check works.
// This test verifies that the real implementation throws an error in test mode
// to prevent accidental API calls.

// NOTE: We deliberately DO NOT mock the receipt processor in this file
// to test the real implementation's safety check

import { processReceipt } from './receiptProcessor';

describe('Receipt Processor Safety Check', () => {
  it('should throw error when called in test environment without explicit permission', async () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.ALLOW_RECEIPT_API_CALLS).not.toBe('true');

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

    await expect(processReceipt(mockFile, 'fake-api-key')).rejects.toThrow(
      'Receipt processor cannot be called in test environment to prevent accidental API costs'
    );
  });
});

