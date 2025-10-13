# Code Best Practices Refactoring

## Problem

The codebase violates several coding best practices defined in user rules:

1. **Top-down organization**: `App.tsx` has helper functions scattered throughout instead of organized top-down
2. **Single-purpose/modularity**: `App.tsx` is a 916-line monolith mixing UI, state management, business logic, and utilities
3. **Purpose statements**: Files lack purpose statements explaining their high-level function
4. **Comments**: Old commented-out requirements should be removed

## Current Violations

### App.tsx (916 lines)
- Lines 6-17: Old commented-out requirements
- Lines 39-86: Helper functions at top (not following top-down)
- Lines 87-879: Main `App()` component with 10+ useState hooks
- Mixes concerns:
  - State management (useState hooks)
  - Business logic (debt calculation, URL encoding)
  - Receipt upload coordination
  - Settings management
  - Venmo URL generation
  - UI rendering (items, modals, QR codes)
- Helper functions scattered: `setItem()`, `removeItem()`, `addItem()` in middle
- Utility class and function at bottom: `QRCodeErrorBoundary`, `safeEval()`

### receiptProcessor.ts (165 lines)
- No file-level purpose statement
- Otherwise well-structured and single-purposed ✅

### receiptProcessor.test.ts (181 lines)
- No file-level purpose statement
- Good inline comments for tests ✅

## Solution: Modular Architecture

### 1. Extract Business Logic Modules

Create focused modules for business logic:

**`src/utils/debtCalculation.ts`** - Debt calculation logic
- Purpose: Calculate user's portion of bill based on items, tax, and tip
- Functions:
  - `calculateDebt(items, subtotal, total, tip, tipIsRate, tipIncludedInTotal)`
  - Helper: `calculateMySubtotal(items)`
  - Helper: `calculateMyRatio(mySubtotal, subtotal)`

**`src/utils/venmoUrl.ts`** - Venmo URL generation
- Purpose: Generate Venmo payment URLs for mobile and desktop
- Functions:
  - `getVenmoUrl(amount, note, recipient?)`
  - Helper: `isMobileDevice()`

**`src/utils/shareUrl.ts`** - Share URL encoding/decoding
- Purpose: Encode and decode form state for sharing via URL
- Functions:
  - `encodeFormState(formState)`
  - `decodeFormState(encoded)`

### 2. Extract Custom Hooks

Create focused hooks for state management:

**`src/hooks/useFormState.ts`** - Form state management
- Purpose: Manage all form state and provide setter functions
- Returns: `{ items, setItems, subtotal, setSubtotal, ..., setItem, removeItem, addItem }`

**`src/hooks/useReceiptUpload.ts`** - Receipt upload coordination
- Purpose: Handle receipt upload, processing, and error states
- Returns: `{ isProcessing, error, handleUpload, handleUploadClick }`

**`src/hooks/useApiKeyManagement.ts`** - API key management
- Purpose: Manage API key storage and UI state
- Returns: `{ apiKey, showModal, setShowModal, saveKey, updateKey, deleteKey }`

**`src/hooks/useSettings.ts`** - Settings management
- Purpose: Manage settings modal and beta features
- Returns: `{ showModal, betaFeaturesEnabled, openSettings, closeSettings, toggleBetaFeatures }`

### 3. Extract UI Components

Create focused components:

**`src/components/ItemCard.tsx`**
- Purpose: Render a single item card with cost, split, and portion controls
- Props: `{ item, index, maxSplit, onChange, onRemove }`

**`src/components/ItemsList.tsx`**
- Purpose: Render list of item cards with add button
- Props: `{ items, onItemChange, onItemRemove, onItemAdd, receiptUploadEnabled }`

**`src/components/BillDetails.tsx`**
- Purpose: Render subtotal, total, and tip inputs
- Props: `{ subtotal, total, tip, tipIsRate, tipIncludedInTotal, onSubtotalChange, onTotalChange, onTipChange }`

**`src/components/ResultSection.tsx`**
- Purpose: Render debt amount and Venmo payment button
- Props: `{ debt, isPayingMe, onIsPayingMeChange }`

**`src/components/QRCodeSection.tsx`**
- Purpose: Render collapsible QR code with share buttons
- Props: `{ shareUrl, onCopyLink, onShareLink, linkCopied }`

**`src/components/ApiKeyModal.tsx`**
- Purpose: Render modal for API key input
- Props: `{ show, onClose, onSave }`

**`src/components/SettingsModal.tsx`**
- Purpose: Render settings modal with beta features and API key management
- Props: `{ show, onClose, betaFeaturesEnabled, onToggleBetaFeatures, ... }`

**`src/components/QRCodeErrorBoundary.tsx`**
- Purpose: Error boundary for QR code generation failures
- Props: `{ children, onError }`

### 4. Reorganize App.tsx (Top-Down)

New structure for `App.tsx`:

```tsx
// Purpose statement at top

import statements

// Main component (top-level logic only)
function App() {
  // 1. Load state from URL
  // 2. Initialize custom hooks
  // 3. Calculate derived values (debt)
  // 4. Render UI using components
  
  return (
    <div className="app-container">
      <Header onOpenSettings={openSettings} />
      <ItemsList ... />
      <BillDetails ... />
      <ResultSection ... />
      <QRCodeSection ... />
      <Footer />
      <ApiKeyModal ... />
      <SettingsModal ... />
    </div>
  );
}

// Helper components below (if needed)
function Header({ onOpenSettings }) { ... }
function Footer() { ... }

// Utility functions below (if any remain)
```

### 5. Add Purpose Statements

Add purpose statements to all files:

- `src/App.tsx`: "Main application component for Dinner Debt bill splitting app. Coordinates state, business logic, and UI components."
- `src/receiptProcessor.ts`: "Processes receipt images using OpenRouter Vision API to extract items, totals, and tip information."
- `src/receiptProcessor.test.ts`: "Unit tests for receipt processing functionality, testing various receipt formats and edge cases."
- All new modules: Add appropriate purpose statements

### 6. Clean Up Comments

- Remove old commented-out requirements (lines 6-17 in App.tsx)
- Remove TODO comments that are already implemented
- Keep only useful comments (edge case explanations, justifications)

## Files to Create

### Business Logic
- `src/utils/debtCalculation.ts`
- `src/utils/venmoUrl.ts`
- `src/utils/shareUrl.ts`

### Custom Hooks
- `src/hooks/useFormState.ts`
- `src/hooks/useReceiptUpload.ts`
- `src/hooks/useApiKeyManagement.ts`
- `src/hooks/useSettings.ts`

### UI Components
- `src/components/ItemCard.tsx`
- `src/components/ItemsList.tsx`
- `src/components/BillDetails.tsx`
- `src/components/ResultSection.tsx`
- `src/components/QRCodeSection.tsx`
- `src/components/ApiKeyModal.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/QRCodeErrorBoundary.tsx`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`

### Types
- `src/types/index.ts` - Centralize interfaces (Item, FormState, ReceiptData)

## Files to Modify

- `src/App.tsx` - Reduce from 916 lines to ~150 lines, reorganize top-down
- `src/App.css` - Consider splitting into component-specific CSS modules
- `src/receiptProcessor.ts` - Add purpose statement
- `src/receiptProcessor.test.ts` - Add purpose statement

## To-dos

### Phase 1: Extract Types and Utilities ✅ COMPLETE
- [x] Create `src/types/index.ts` with Item, FormState interfaces
- [x] Create `src/utils/debtCalculation.ts` with debt calculation logic
- [x] Create `src/utils/venmoUrl.ts` with Venmo URL generation
- [x] Create `src/utils/shareUrl.ts` with URL encoding/decoding
- [x] Add purpose statements to all utility modules

### Phase 2: Extract Custom Hooks ✅ COMPLETE
- [x] Create `src/hooks/useFormState.ts` for form state management
- [x] Create `src/hooks/useReceiptUpload.ts` for receipt upload coordination
- [x] Create `src/hooks/useApiKeyManagement.ts` for API key management
- [x] Create `src/hooks/useSettings.ts` for settings management
- [x] Create `src/hooks/useShareLink.ts` for QR code and sharing
- [x] Add purpose statements to all hooks

**Phase 1 & 2 Results:**
- App.tsx reduced from 916 lines to 655 lines (28.5% reduction)
- All business logic extracted to utility modules
- All state management extracted to custom hooks
- All files have purpose statements
- No linter errors
- All tests pass
- Build compiles successfully

### Phase 3: Extract UI Components
- [ ] Create `src/components/QRCodeErrorBoundary.tsx`
- [ ] Create `src/components/Header.tsx` and `src/components/Footer.tsx`
- [ ] Create `src/components/ItemCard.tsx`
- [ ] Create `src/components/ItemsList.tsx`
- [ ] Create `src/components/BillDetails.tsx`
- [ ] Create `src/components/ResultSection.tsx`
- [ ] Create `src/components/QRCodeSection.tsx`
- [ ] Create `src/components/ApiKeyModal.tsx`
- [ ] Create `src/components/SettingsModal.tsx`
- [ ] Add purpose statements to all components

### Phase 4: Refactor App.tsx
- [ ] Remove old commented-out code (lines 6-17)
- [ ] Import new utilities, hooks, and components
- [ ] Replace inline logic with utility functions
- [ ] Replace useState management with custom hooks
- [ ] Replace inline JSX with components
- [ ] Reorganize to follow top-down structure
- [ ] Add file-level purpose statement
- [ ] Verify app still works correctly

### Phase 5: Add Purpose Statements
- [ ] Add purpose statement to `src/receiptProcessor.ts`
- [ ] Add purpose statement to `src/receiptProcessor.test.ts`
- [ ] Verify all new files have purpose statements

### Phase 6: Testing and Validation
- [ ] Run existing tests to ensure no regressions
- [ ] Test app manually (all features)
- [ ] Check linter for any issues
- [ ] Review all files for remaining violations

## Success Criteria

1. ✅ All files have clear purpose statements
2. ✅ App.tsx is < 200 lines and follows top-down organization
3. ✅ Business logic is extracted into single-purposed utility modules
4. ✅ State management is extracted into focused custom hooks
5. ✅ UI is broken into reusable, single-purposed components
6. ✅ No old commented-out code remains
7. ✅ All existing functionality still works
8. ✅ All existing tests still pass

## Notes

- This is a significant refactor but won't change functionality
- Prioritize extracting utilities and hooks first (easier to test)
- Components can be extracted incrementally
- Keep git commits granular (one logical change per commit)
- Run tests after each phase to catch regressions early

