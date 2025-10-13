# Test Mocks

This directory contains Jest mocks that are automatically used during testing.

## Receipt Processor Mock

**File:** `receiptProcessor.ts`

**Purpose:** Prevents accidental API calls to OpenRouter during component and integration tests, which would cost real money.

**How it works:**
- Jest automatically uses mocks in `__mocks__/` directories when you call `jest.mock()` for that module
- Add `jest.mock('../receiptProcessor')` at the top of any test file that imports the receipt processor
- The mock returns realistic-looking data without making any network requests
- See `hooks/useReceiptUpload.test.ts` for an example

**Testing the real receipt processor:**
- The real integration tests in `receiptProcessor.test.ts` explicitly set `ALLOW_RECEIPT_API_CALLS=true`
- This bypasses the safety check in the real implementation
- Run with: `npm run test:receipt` (costs money!)

## Multiple Layers of Protection

1. **Automatic Jest Mock** - Components importing `receiptProcessor` automatically get the mock
2. **Environment Check** - The real `processReceipt` function throws an error if called in test mode without explicit permission
3. **Test Exclusion** - Receipt tests are excluded from normal test runs via `jest.config.js`
4. **Separate Script** - Receipt tests must be run explicitly with `npm run test:receipt`

This ensures you can't accidentally spend money on API calls during normal development and testing!

