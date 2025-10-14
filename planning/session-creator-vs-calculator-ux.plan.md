# Session Creator vs Calculator UX Branching

## Problem

Currently, the home page shows the same interface for two different use cases:

1. **Session creator**: User is paying the bill and wants friends to pay them back (needs QR code/sharing)
2. **Calculator**: User just wants to calculate what they owe someone (doesn't need sharing features)

There's no way to distinguish between these use cases, resulting in unnecessary UI complexity for calculators.

## Solution

Add a landing page that prompts users to choose their flow, with the choice encoded in URL parameters for direct navigation.

### User Flow

1. **Landing page** (no mode param):

   - Show two prominent options:
     - "Split bill with friends" → navigates to `?mode=creator`
     - "Calculate what I owe" → navigates to `?mode=calculator`
   - Clean, simple choice - no modal, just the page itself

2. **Session creator mode** (`?mode=creator`):

   - Show full interface (current behavior)
   - Include QR code section, share buttons, all features
   - Show "Are you paying Mike Delmonaco?" question

3. **Calculator mode** (`?mode=calculator`):

   - if receipt upload enabled, prompt for receipt upload vs manual entry. otherwise, just go straight to manual entry
   - after receipt upload, immediately send them through the friend flow with that information. literally send them to the url with the data of the receipt, but with a special calculator mode flag. the only difference is in the friend wizard, when calculator mode is enabled, the prices on step 1 should be inputs instead of static text. And in calculator mode, there should be a new step in the wizard before the item selection, where the user can confirm the subtotal, total, and tip (just use the current bill details section. extract it into a shared component). There should be something like "Confirm billing information" at the top like how we have "What did you eat?" for the friend wizard.
   - if they do manual entry, just give them the full interface (current behavior) except no qr code/sharing

4. **Friend mode** (has `?data=` param):

   - Existing FriendWizard behavior (unchanged)

### URL Parameter Logic

Mode detection priority:

1. If `?data=` is present:
   - If `?calculator=true` is also present → Calculator mode with FriendWizard (modified)
   - Else → Friend mode (show FriendWizard normally)
2. Else if `?mode=creator` → Session creator mode (full form)
3. Else if `?mode=calculator` → Calculator landing (receipt upload vs manual entry choice)
4. Else → Show landing page with choice

### Key Technical Points

- Don't persist mode choice in localStorage (user chooses each time)
- Share URLs should NOT include `?mode=` param (only `?data=`)
- Landing page should be simple and fast to navigate

## Files to Modify

### `src/App.tsx`

**New state:**

- Add `mode` state variable: `'landing' | 'creator' | 'calculator' | 'friend'`
- Derive mode from URL params in initialization

**Mode detection logic** (around lines 79-83):

```tsx
const mode = React.useMemo(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('data')) {
    return params.get('calculator') === 'true' ? 'calculator-wizard' : 'friend';
  }
  const modeParam = params.get('mode');
  if (modeParam === 'creator' || modeParam === 'calculator') return modeParam;
  return 'landing';
}, []);
```

**Additional state:**
- `isCalculatorMode`: boolean flag to track if we're in calculator wizard mode (for FriendWizard modifications)

**Conditional rendering** (around lines 92-426):

- If `mode === 'landing'`: Render landing page component
- If `mode === 'friend'`: Render FriendWizard (existing)
- If `mode === 'calculator-wizard'`: Render FriendWizard with `isCalculatorMode={true}` prop
- If `mode === 'creator'`: Render full form (existing)
- If `mode === 'calculator'`: Render calculator choice page (receipt upload vs manual entry)

**Landing page component** (new, within App.tsx or extracted):

```tsx
function LandingPage() {
  return (
    <div className="landing-container">
      <h2>What would you like to do?</h2>
      <div className="landing-options">
        <button 
          className="landing-option-button"
          onClick={() => window.location.href = '?mode=creator'}
        >
          <div className="option-icon">👥</div>
          <div className="option-title">Split bill with friends</div>
          <div className="option-description">
            You're paying and want others to pay you back
          </div>
        </button>
        
        <button 
          className="landing-option-button"
          onClick={() => window.location.href = '?mode=calculator'}
        >
          <div className="option-icon">🧮</div>
          <div className="option-title">Calculate what I owe</div>
          <div className="option-description">
            Figure out your portion of the bill
          </div>
        </button>
      </div>
    </div>
  );
}
```

**Calculator choice page** (new, for `?mode=calculator`):

```tsx
function CalculatorChoicePage({ 
  receiptUploadEnabled,
  onReceiptUploadClick,
  onManualEntryClick,
  isProcessingReceipt,
  receiptError 
}) {
  if (!receiptUploadEnabled) {
    // No receipt upload, go straight to manual entry
    onManualEntryClick();
    return null;
  }
  
  return (
    <div className="calculator-choice-container">
      <h2>How would you like to enter the receipt info?</h2>
      <div className="calculator-options">
        <button 
          className="calculator-option-button"
          onClick={onReceiptUploadClick}
          disabled={isProcessingReceipt}
        >
          <div className="option-icon">📸</div>
          <div className="option-title">
            {isProcessingReceipt ? 'Processing...' : 'Upload Receipt'}
          </div>
          <div className="option-description">
            Scan your receipt photo
          </div>
        </button>
        
        <button 
          className="calculator-option-button"
          onClick={onManualEntryClick}
        >
          <div className="option-icon">✏️</div>
          <div className="option-title">Manual Entry</div>
          <div className="option-description">
            Type in the details yourself
          </div>
        </button>
      </div>
      {receiptError && (
        <div className="error-message">{receiptError}</div>
      )}
    </div>
  );
}
```

**Calculator mode implementation:**

1. **Calculator choice page** (`?mode=calculator`):
   - If receipt upload enabled: show choice between receipt upload vs manual entry
   - If receipt upload disabled: immediately navigate to manual entry mode
   - After receipt upload success: navigate to `?data=<encoded>&calculator=true`
   - Manual entry button: set internal state to show full form without QR/sharing

2. **Calculator manual entry mode** (internal state, no URL change):
   - Show full form (existing behavior)
   - Hide QR code section (lines 358-424)

3. **Calculator wizard mode** (`?data=<encoded>&calculator=true`):
   - FriendWizard receives `isCalculatorMode={true}` prop
   - Modified FriendWizard behavior when `isCalculatorMode=true`:
     - Add new Step 0: "Confirm billing information" (before item selection)
       - Extract BillDetails section into shared component
       - Show subtotal, total, tip inputs (editable)
       - "Next" button to proceed to Step 1
     - Step 1 modifications: Item prices become editable inputs (not static text)
     - Steps 2-3 remain the same

### `src/App.css`

**New landing page styles:**

```css
.landing-container {
  /* Center content, clean layout */
}

.landing-options {
  /* Two-column grid on desktop, stack on mobile */
}

.landing-option-button {
  /* Large, clickable cards with hover states */
  /* Icon, title, description layout */
}

.option-icon {
  /* Large emoji/icon at top */
}

.option-title {
  /* Bold, prominent title */
}

.option-description {
  /* Smaller explanatory text */
}
```

**Calculator choice page styles:**

```css
.calculator-choice-container {
  /* Similar to landing-container */
}

.calculator-options {
  /* Two-column grid on desktop, stack on mobile */
}

.calculator-option-button {
  /* Similar to landing-option-button */
}
```

**Mobile-first responsive design:**

- Stack options vertically on mobile
- Large touch targets
- Clear visual hierarchy

### `src/components/FriendWizard.tsx`

**New prop:**
- `isCalculatorMode?: boolean` - flag to enable calculator-specific modifications

**Changes when `isCalculatorMode={true}`:**

1. **Add Step 0 (Bill Details Confirmation)**:
   - Insert before existing Step 1
   - Use extracted BillDetails component
   - Show "Confirm billing information" heading
   - Allow editing of subtotal, total, tip
   - Update step numbering: now "Step 1 of 4" instead of "Step 1 of 3"

2. **Step 1 (Item Selection) modifications**:
   - Item costs become editable inputs instead of static text
   - Keep checkbox functionality
   - Update running total when costs are edited
   - Now labeled "Step 2 of 4"

3. **Steps 2-3 remain the same** (now labeled Step 3 and 4 of 4)

### `src/components/BillDetails.tsx` (new shared component)

Extract bill details section (subtotal, total, tip inputs) from App.tsx into reusable component.

**Props:**
- `subtotal: number`
- `total: number`
- `tip: number`
- `tipIsRate: boolean`
- `tipIncludedInTotal: boolean`
- `onSubtotalChange: (value: number) => void`
- `onTotalChange: (value: number) => void`
- `onTipChange: (value: number) => void`
- `onTipIsRateChange: (value: boolean) => void`

This component will be used in:
1. App.tsx (existing full form)
2. FriendWizard Step 0 (calculator mode only)

### `src/hooks/useShareLink.ts`

**No changes needed** - already generates clean URLs with only `?data=` param, doesn't propagate mode param to friends ✓

## Implementation Todos

### Phase 1: Mode Detection & URL Handling

- Update mode detection logic to handle `?calculator=true` flag alongside `?data=`
- Derive mode state: 'landing' | 'creator' | 'calculator' | 'calculator-wizard' | 'friend'
- Add internal state for tracking manual entry mode (no URL change)
- Test URL parameter parsing for all combinations

### Phase 2: Landing Page

- Create LandingPage component with two option buttons
- Add navigation to `?mode=creator` and `?mode=calculator`
- Style landing page (mobile-first)
- Add icons, titles, descriptions for each option

### Phase 3: Extract BillDetails Component

- Create new `src/components/BillDetails.tsx`
- Extract bill details section from App.tsx (subtotal, total, tip inputs)
- Define props interface
- Replace inline bill details in App.tsx with new component
- Test that existing functionality still works

### Phase 4: Calculator Choice Page

- Create CalculatorChoicePage component
- Add receipt upload vs manual entry buttons
- Handle receipt upload flow: after success, navigate to `?data=<encoded>&calculator=true`
- Handle manual entry: set internal state to show full form
- Add styles for calculator choice page
- Test both paths

### Phase 5: Calculator Manual Entry Mode

- Show full form when manual entry is selected
- Hide QR code section (lines 358-424)
- Keep "Are you paying Mike Delmonaco?" section visible
- Ensure Venmo button works correctly based on user selection
- Test end-to-end flow

### Phase 6: Modify FriendWizard for Calculator Mode

- Add `isCalculatorMode` prop to FriendWizard
- Add new Step 0: "Confirm billing information"
  - Use BillDetails component
  - Make fields editable
  - Add "Next" button
- Modify Step 1: Make item prices editable inputs
  - Add onChange handlers for cost updates
  - Update running total calculation
- Update step numbering throughout (now 1-4 instead of 1-3)
- Keep Mike Delmonaco payee section visible in final step
- Test calculator wizard flow end-to-end

### Phase 7: Conditional Rendering in App.tsx

- Update conditional rendering to handle all 5 modes
- Pass `isCalculatorMode` prop to FriendWizard when appropriate
- Ensure proper mode transitions
- Test all mode switches

### Phase 8: Testing & Polish

- Test landing page navigation
- Test calculator choice page (both options)
- Test calculator manual entry mode (full form without QR/sharing)
- Test calculator wizard mode (receipt upload → modified wizard)
- Test session creator mode (unchanged behavior)
- Test friend mode (unchanged behavior)
- Test URL navigation (direct links to each mode)
- Test calculator flag propagation (`?data=...&calculator=true`)
- Verify share URLs from creator mode don't include calculator flag
- Test on mobile devices
- Test with and without receipt upload enabled

## Success Criteria

1. Landing page clearly presents two options (creator vs calculator)
2. URL params correctly encode modes:
   - `?mode=creator` for session creator
   - `?mode=calculator` for calculator landing
   - `?data=<encoded>&calculator=true` for calculator wizard
   - `?data=<encoded>` for friend mode
3. Direct navigation to specific modes works
4. Calculator choice page shows receipt upload vs manual entry options
5. Calculator manual entry mode hides QR code but keeps Mike Delmonaco question
6. Calculator wizard mode:
   - Has editable bill details step (Step 0)
   - Has editable item prices (Step 1)
   - Maintains all other wizard functionality (Steps 2-3)
   - Keeps Mike Delmonaco payee question visible in final step
7. Session creator mode shows all features (unchanged behavior)
8. Friend mode works as before (unchanged)
9. Share URLs from creator mode remain clean (only `?data=` param, no calculator flag)
10. BillDetails component is successfully extracted and reused
11. Mobile-friendly responsive design across all modes