# Session Creator UX Redesign

## Overview

Redesign the session creator flow to be more intuitive and validation-focused, similar to calculator mode's approach. The goal is to make it clearer that the session creator is setting up the bill for others to use, with emphasis on verifying accuracy before sharing.

## Current Problems

1. **Unclear purpose**: Session creator immediately sees the full form with checkboxes and "paying for" selectors, which are irrelevant to their use case (they're setting up for everyone, not calculating what they owe)
2. **No validation step**: No clear opportunity to verify receipt scanning accuracy before moving forward
3. **Mixed concerns**: QR code/sharing is mixed in with item entry, making the flow feel cluttered
4. **Wrong UI elements**: Checkboxes for "what you ate" don't make sense when you're the one setting up the bill for everyone

## Proposed Solution

Create a linear, wizard-like flow for session creators that mirrors calculator mode's clarity:

1. **Choice Screen**: Upload receipt vs manual entry (like CalculatorChoicePage)
2. **Item Verification**: Display all items with prices and split selectors (split between only, no paying for)
3. **Bill Details Confirmation**: Verify subtotal, total, tip
4. **Sharing Screen**: QR code + link sharing as the final step

## User Flow

### Step 1: Entry Method Choice

Similar to calculator mode, but for creators:

```
┌─────────────────────────────────────┐
│  How would you like to enter the    │
│  bill information?                  │
│                                     │
│  ┌───────────┐  ┌──────────────┐  │
│  │ 📸 Upload │  │ ✏️ Manual    │  │
│  │  Receipt  │  │   Entry      │  │
│  └───────────┘  └──────────────┘  │
└─────────────────────────────────────┘
```

### Step 2: Item Verification

**Key changes from current form:**
- NO checkboxes (all items shown, no selection needed)
- Only "split between" selector, NOT "paying for" selector
- Clear "verification" framing
- Editable prices and names
- Can add/remove items

```
┌─────────────────────────────────────┐
│  Verify Items (Step 1 of 3)        │
│  Check that all items are correct   │
│                                     │
│  Item 1                             │
│  ┌─────────────┬──────────────────┐│
│  │ Burger      │ $15.00  Split: 2 ││
│  └─────────────┴──────────────────┘│
│                                     │
│  Item 2                             │
│  ┌─────────────┬──────────────────┐│
│  │ Fries       │ $8.00   Split: 3 ││
│  └─────────────┴──────────────────┘│
│                                     │
│  [+ Add Item]                       │
│                                     │
│  [Next]                             │
└─────────────────────────────────────┘
```

### Step 3: Bill Details Confirmation

Use existing BillDetails component:

```
┌─────────────────────────────────────┐
│  Confirm Bill Details (Step 2 of 3) │
│                                     │
│  Subtotal: $50.00                   │
│  Total: $58.00                      │
│  Tip: 20% or $10.00                 │
│                                     │
│  [Back] [Next]                      │
└─────────────────────────────────────┘
```

### Step 4: Sharing

Final step - just QR code and sharing:

```
┌─────────────────────────────────────┐
│  Share with Friends (Step 3 of 3)   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      [QR CODE]              │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Copy Link]  [Share Link]          │
│                                     │
│  Friends scan this QR code or click │
│  the link to select what they ate   │
│  and calculate what they owe you    │
│                                     │
│  [Back] [Done]                      │
└─────────────────────────────────────┘
```

## Component Architecture Changes

### New Component: `SessionCreatorWizard`

A new wizard component specifically for session creators that manages the 3-step flow.

**Props:**
- `initialItems`: Pre-populated items from receipt scan (optional)
- `initialSubtotal`, `initialTotal`, `initialTip`, etc.: Bill details from receipt

**Internal state:**
- `currentStep`: 1, 2, or 3
- `items`: Array of items with names, costs, split counts
- `subtotal`, `total`, `tip`, `tipIsRate`, `tipIncludedInTotal`: Bill details

**Responsibilities:**
1. Step navigation
2. Item management (add, remove, edit)
3. Bill details management
4. Share URL generation

### New Component: `SplitSelector` (Single Selector)

Extract the individual "split between" selector from `SplitControls`.

**Purpose:** 
Currently `SplitControls` renders both "Split?" and "Paying for" selectors together. We need a component for just a single selector that can be used independently.

**Props:**
```tsx
interface SplitSelectorProps {
  label: string; // "Split?" or "Paying for"
  value: number; // Current portion value
  maxValue?: number; // Maximum portions for this selector
  maxSplit?: number; // Maximum value shown in dropdown before "...more"
  onChange: (value: number) => void;
  justMeText?: string; // Text for value=1, defaults to "Just me"
  multipleText?: (n: number) => string; // Text for value>1, defaults to "${n} people"
}
```

**Usage examples:**
```tsx
// In SessionCreatorWizard (only split between):
<SplitSelector
  label="Split?"
  value={item.totalPortions}
  onChange={(n) => updateItemSplit(item.id, n)}
/>

// In current form (both selectors, using SplitControls):
<SplitControls
  totalPortions={item.totalPortions}
  portionsPaying={item.portionsPaying}
  onTotalPortionsChange={...}
  onPortionsPayingChange={...}
/>

// In FriendWizard split config step:
<SplitSelector
  label="Split?"
  value={totalPortions}
  onChange={onTotalPortionsChange}
/>
<SplitSelector
  label="Paying for"
  value={portionsPaying}
  maxValue={totalPortions}
  onChange={onPortionsPayingChange}
/>
```

### Modified Component: `SplitControls`

**Refactor to use `SplitSelector` internally:**
```tsx
export function SplitControls(props: SplitControlsProps) {
  return (
    <>
      <SplitSelector
        label="Split?"
        value={props.totalPortions}
        maxSplit={props.maxSplit}
        onChange={props.onTotalPortionsChange}
      />
      <SplitSelector
        label="Paying for"
        value={props.portionsPaying}
        maxValue={Math.abs(props.totalPortions)}
        onChange={props.onPortionsPayingChange}
      />
    </>
  );
}
```

### Existing Component to Reuse: `BillDetails`

**Location:** `src/components/BillDetails.tsx`

This component already exists and is used in both App.tsx and FriendWizard. It handles:
- Subtotal input
- Total input  
- Tip input (with percent/flat amount toggle)
- Tip included notice

We'll reuse this exact component in SessionCreatorWizard Step 2 without any modifications needed.

### Modified Component: `ShareSection`

Extract and simplify for use in wizard:

**New prop:**
- `showAsStep?: boolean` - If true, render as a wizard step with "Back" button and step indicator

**Changes:**
- Remove collapsible behavior when `showAsStep={true}`
- Always show QR code and buttons when in step mode
- Add step indicator at top
- Add back button in wizard mode

## File Changes

### New Files

1. **`src/components/SessionCreatorWizard.tsx`**
   - Main wizard component for session creators
   - Manages 3-step flow
   - Item verification step
   - Bill details step
   - Sharing step

2. **`src/components/SplitSelector.tsx`**
   - Single split selector component
   - Handles dropdown with "...more" option
   - Handles custom input mode
   - Reusable across different contexts

3. **`src/components/CreatorChoicePage.tsx`**
   - Similar to CalculatorChoicePage but for session creators
   - Receipt upload vs manual entry choice
   - Different copy/messaging for creator context

### Modified Files

1. **`src/App.tsx`**
   - Add route for session creator wizard
   - Handle receipt upload → wizard redirect (similar to calculator mode)
   - Conditional rendering for creator mode:
     - If just entering creator mode: show CreatorChoicePage
     - If uploaded receipt: show SessionCreatorWizard with pre-filled data
     - If manual entry selected: show SessionCreatorWizard with empty state

2. **`src/components/BillDetails.tsx`**
   - No changes needed! This component already exists and is perfectly suited for reuse
   - Already used in: App.tsx (creator form), FriendWizard (calculator mode)
   - Will also be used in: SessionCreatorWizard Step 2

3. **`src/components/SplitControls.tsx`**
   - Refactor to use SplitSelector internally
   - Keep same props and behavior (backwards compatible)
   - No changes needed to existing usage

4. **`src/components/ShareSection.tsx`**
   - Add optional `showAsStep` prop
   - Conditional rendering for wizard step mode vs collapsible mode
   - Add back button and step indicator when in wizard mode

4. **`src/hooks/useReceiptUpload.ts`**
   - Add `onCreatorUploadSuccess` callback
   - Handle redirect to wizard with pre-filled data

## URL Parameter Strategy

### Creator Mode URLs

1. **Creator landing** (choice screen):
   ```
   ?mode=creator
   ```

2. **Creator wizard with data** (after receipt upload or from manual entry):
   ```
   ?mode=creator-wizard&data=<encoded>
   ```

3. **Share URLs** (for friends):
   ```
   ?data=<encoded>
   ```
   (No mode parameter - friends go straight to FriendWizard)

### Mode Detection Logic

```tsx
const mode = React.useMemo(() => {
  const params = new URLSearchParams(window.location.search);
  
  // Friend mode: has data but no mode/calculator param
  if (params.has('data') && !params.has('mode') && params.get('calculator') !== 'true') {
    return 'friend';
  }
  
  // Calculator wizard: has data and calculator=true
  if (params.has('data') && params.get('calculator') === 'true') {
    return 'calculator-wizard';
  }
  
  // Creator wizard: has mode=creator-wizard or (mode=creator and has data)
  if (params.get('mode') === 'creator-wizard' || 
      (params.get('mode') === 'creator' && params.has('data'))) {
    return 'creator-wizard';
  }
  
  // Check explicit mode parameter
  const modeParam = params.get('mode');
  if (modeParam === 'creator' || modeParam === 'calculator') {
    return modeParam;
  }
  
  // Default to landing
  return 'landing';
}, []);
```

## Implementation Checklist

### Phase 1: Extract SplitSelector Component

- [ ] Create `src/components/SplitSelector.tsx`
- [ ] Implement single selector with all features:
  - [ ] Dropdown with standard options (1-8)
  - [ ] "...more" option that switches to input mode
  - [ ] Custom input mode with validation
  - [ ] Proper props interface
- [ ] Write unit tests for SplitSelector
- [ ] Refactor `SplitControls` to use `SplitSelector` internally
- [ ] Verify existing functionality still works (run app, test current form)

### Phase 2: Create CreatorChoicePage

- [ ] Create `src/components/CreatorChoicePage.tsx`
- [ ] Design similar to CalculatorChoicePage
- [ ] Update copy to reflect creator context
- [ ] Add styles for creator-choice-container
- [ ] Wire up to App.tsx for `?mode=creator`
- [ ] Test receipt upload path
- [ ] Test manual entry path

### Phase 3: Build SessionCreatorWizard - Items Step

- [ ] Create `src/components/SessionCreatorWizard.tsx`
- [ ] Set up wizard structure with step state
- [ ] Implement Step 1 (Item Verification):
  - [ ] Display all items (no checkboxes)
  - [ ] Editable item names and prices
  - [ ] Add SplitSelector for each item (split between only)
  - [ ] Add/remove item functionality
  - [ ] Next button navigation
- [ ] Add styles for wizard container and item verification
- [ ] Test with pre-filled data from receipt upload
- [ ] Test with empty state (manual entry)

### Phase 4: Build SessionCreatorWizard - Bill Details Step

- [ ] Implement Step 2 (Bill Details):
  - [ ] Import and use existing BillDetails component (no modifications needed!)
  - [ ] Step indicator showing "Step 2 of 3"
  - [ ] Back and Next navigation
  - [ ] State management for bill details (subtotal, total, tip, tipIsRate)
  - [ ] Pass state and setters to BillDetails as props
- [ ] Test navigation between steps
- [ ] Test bill details editing
- [ ] Verify that edited values persist when navigating back/forward

### Phase 5: Build SessionCreatorWizard - Sharing Step

- [ ] Modify ShareSection to support wizard mode:
  - [ ] Add `showAsStep` prop
  - [ ] Add step indicator when in step mode
  - [ ] Add back button in step mode
  - [ ] Remove collapsible behavior in step mode
- [ ] Implement Step 3 in wizard:
  - [ ] Use ShareSection with showAsStep={true}
  - [ ] Generate share URL from wizard state
  - [ ] Done button to exit wizard
- [ ] Test sharing functionality
- [ ] Test QR code generation with wizard data

### Phase 6: Wire Up to App.tsx

- [ ] Add receipt upload handling for creator mode:
  - [ ] Redirect to creator-wizard with data after upload
  - [ ] Similar to calculator mode redirect logic
- [ ] Add manual entry handling:
  - [ ] Navigate to creator-wizard with empty state
- [ ] Update mode detection logic:
  - [ ] Handle creator-wizard mode
  - [ ] Distinguish from friend mode correctly
- [ ] Conditional rendering for creator modes:
  - [ ] CreatorChoicePage for `?mode=creator`
  - [ ] SessionCreatorWizard for `?mode=creator-wizard`
- [ ] Test all navigation paths

### Phase 7: URL Parameter Management

- [ ] Implement creator-wizard URL encoding
- [ ] Ensure share URLs don't include mode parameter
- [ ] Test URL generation from wizard state
- [ ] Test direct navigation to wizard with data
- [ ] Verify mode detection for all URL combinations

### Phase 8: Polish & Testing

- [ ] Mobile responsive design for all new components
- [ ] Consistent styling with existing theme
- [ ] Loading states for receipt upload
- [ ] Error handling for invalid data
- [ ] Empty state handling in wizard
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Cross-browser testing
- [ ] End-to-end flow testing:
  - [ ] Receipt upload → verify → share
  - [ ] Manual entry → fill out → share
  - [ ] Friend receives share URL → calculates debt
- [ ] Performance optimization (if needed)

## Success Criteria

1. **Clear separation of concerns**: Session creator flow is distinct from calculator and friend flows
2. **Intuitive UX**: Linear wizard makes it obvious what to do at each step
3. **Validation focused**: Item verification step makes it clear this is about checking accuracy
4. **Proper UI for use case**: No checkboxes or "paying for" selectors in creator flow
5. **Reusable components**: SplitSelector can be used independently in multiple contexts
6. **Backwards compatible**: Existing functionality (calculator, friend flows) still works
7. **Mobile-first**: All new screens work well on mobile devices
8. **URL structure**: Clean URLs with proper mode detection
9. **Share URLs**: Friends receive clean URLs without creator mode parameters

## Design Notes

### Why Remove Checkboxes?

Checkboxes imply selection/filtering, which is what friends do. Session creators are **verifying all items**, not selecting what they ate. Showing all items without checkboxes makes this clearer.

### Why Remove "Paying For" Selector?

The "paying for" selector is only relevant when calculating individual debt. Session creators are setting up the split configuration for everyone, so they only need to specify how many ways each item is split, not who's paying for how many portions.

### Why Wizard Format?

The wizard format:
1. **Reduces cognitive load** - one task per screen
2. **Provides clear progress** - step indicator shows where you are
3. **Matches mental model** - creator is setting up, then sharing (linear process)
4. **Consistent with other flows** - calculator and friend flows use wizards
5. **Encourages validation** - step-by-step review before sharing

### Why Separate CreatorChoicePage?

Even though it's similar to CalculatorChoicePage, the copy and context are different:
- **Creator**: "How would you like to **enter** the bill?" (implies setting up for others)
- **Calculator**: "How would you like to **enter** the receipt?" (implies calculating for self)

Having separate components allows for:
1. Different messaging/copy
2. Different styling if needed
3. Different behaviors (e.g., what happens after upload)
4. Clearer code organization

## Future Enhancements

### Possible additions (not in initial scope):

1. **Item categories**: Group items by course (appetizers, mains, desserts)
2. **Bulk operations**: "Split all items 3 ways" button
3. **Item images**: Show receipt line item images for verification
4. **Receipt editing**: Draw on receipt to mark corrections
5. **Multi-page receipts**: Support for uploading multiple receipt images
6. **Default splits**: Remember common split configurations per user
7. **Item templates**: Save common items/prices for future reuse
8. **Export**: Download bill data as CSV/JSON
9. **Edit after sharing**: Generate edit link to modify bill after sharing
10. **Real-time collaboration**: Multiple people can edit the bill simultaneously

## Testing Strategy

### Unit Tests

- SplitSelector component (all modes: dropdown, custom input, edge cases)
- SessionCreatorWizard state management
- URL parameter parsing and mode detection
- Share URL generation

### Integration Tests

- Full creator flow (upload → verify → share)
- Creator → friend handoff (share URL → friend receives correct data)
- Navigation between wizard steps
- Data persistence between steps

### E2E Tests

- Mobile receipt upload flow
- Desktop manual entry flow
- QR code scanning and navigation
- Venmo integration (opens Venmo app/website correctly)

### Manual Testing Checklist

- [ ] Upload various receipt types (clear, blurry, multi-page)
- [ ] Test on various mobile devices (iOS, Android)
- [ ] Test on various browsers (Safari, Chrome, Firefox)
- [ ] Test with varying bill sizes (2 items vs 50 items)
- [ ] Test error cases (upload failure, invalid data, network errors)
- [ ] Test accessibility (screen reader, keyboard navigation)
- [ ] Test share URL on various platforms (SMS, WhatsApp, email)
- [ ] Test QR code scanning with various QR readers
