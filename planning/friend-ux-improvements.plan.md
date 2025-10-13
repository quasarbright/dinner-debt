# Friend UX Improvements

## Problem

Friends receiving the QR code/link need a dead-simple experience. Current UX has several issues:
- **Overwhelming**: Friends see the same complex interface as the bill creator
- **Wrong interaction model**: X-ing out items you didn't eat is backwards when you typically eat 2-5 items out of 10-30 total
- **Too much at once**: Showing all controls simultaneously is cognitively heavy, especially for drunk/tired people
- **Unclear guidance**: Not obvious what they need to do

## Solution: Multi-Step Wizard for Friends

### 1. Detect Friend vs Session Creator

- **Friend indicator**: URL has `?data=` parameter → this is a friend
- **Session creator**: No data parameter → this is the person creating the split

### 2. Multi-Step Wizard Flow for Friends

Instead of a single overwhelming page, break the experience into 3 simple steps:

**Step 1: "What did you eat?"**
- Show simple checkbox list of all items with names and costs
- All items **unchecked by default** (check what you ate, not x out what you didn't)
- Display running total at bottom that updates as items are checked
- Big "Next" button to continue
- Progress indicator: "Step 1 of 3"

**Step 2: "Any shared items?"**
- Only show items that were checked in Step 1
- For EACH item (regardless of what session creator marked), show split controls:
  - "Was this shared?" (defaulting to creator's split setting if available)
  - If yes: "Split between how many people?" and "You're paying for how many?"
- This allows friends to:
  - Add splits to items the creator marked as unsplit (e.g., two friends shared something the creator didn't know about)
  - Override the creator's split settings if needed
- Default: Use creator's split settings, or "just me" if creator didn't split it
- Big "Next" button, "Back" to return to Step 1
- Progress indicator: "Step 2 of 3"

**Step 3: "Ready to pay?"**
- Show breakdown: items you ate, your subtotal, your share of tax/tip
- Total amount you owe (large, prominent)
- Show who you're paying based on `isPayingMe` field:
  - If true: "You are paying Mike Delmonaco"
  - If false: "Pay with Venmo" (recipient unspecified)
- Large Venmo button to complete payment
- "Back" button to return to Step 2
- Progress indicator: "Step 3 of 3"

### 3. Technical Approach

**State management:**
- Add `isFriend` derived from URL params (presence of `?data=`)
- FriendWizard component manages internal state:
  - `friendWizardStep` (1, 2, or 3)
  - `selectedItemIds` (Set of item IDs)
  - `friendSplitConfig` (Map of itemId -> split settings)
- For friends, only checked items count toward debt calculation

**Friend experience:**
- Render FriendWizard component instead of full form
- Bill details (subtotal, total, tip) are read-only (passed as props)
- Use existing `isPayingMe` field to determine payment recipient
- No QR code, receipt upload, or add item buttons shown

**Session creator experience:**
- Keep existing single-page interface
- No changes needed - continue using existing `isPayingMe` field
- Mike Delmonaco is the only special case for now (can be generalized later)

### 4. Benefits of This Approach

- **Less cognitive load**: One task per screen
- **Faster for most cases**: Checking 3 items faster than x-ing out 17
- **Mobile-friendly**: No overwhelming scrolling
- **Clear progress**: Friend knows where they are (step 2 of 3)
- **Matches mental model**: First think what you ate, then think about splits
- **Foolproof**: Hard to miss what you need to do at each step

## Files to Modify

**`src/App.tsx`**:

Key changes needed:

1. **Interface updates** (lines 29-37):
   - No changes to `FormState` needed (keep existing `isPayingMe` field)

2. **New state variables**:
   - `isFriend` - derived from URL params (has `?data=`)
   - `friendWizardStep` - tracks current step (1, 2, or 3) for friends (internal to wizard component)
   - `selectedItemIds` - Set of item IDs friend checked in step 1 (internal to wizard component)
   - `friendSplitConfig` - Map of itemId -> {portionsPaying, totalPortions} for friend's overrides (internal to wizard component)

3. **URL parameter handling** (lines 115-136):
   - Detect friend mode from URL params (presence of `?data=`)

4. **Conditional rendering**:
   - If `isFriend === true`, render `<FriendWizard>` component instead of full form
   - If `isFriend === false`, render existing form (no changes needed)

5. **New component to create**:
   - `FriendWizard` - Self-contained wizard component that:
     - Manages its own internal state (step, selectedItemIds, friendSplitConfig)
     - Renders progress indicator internally
     - Renders all 3 steps with conditional display based on current step
     - Receives props: items, subtotal, total, tip, tipIsRate, tipIncludedInTotal, isPayingMe
     - Handles navigation between steps
     - Calculates and displays debt based on selected items and friend's split config

6. **Debt calculation**:
   - Move debt calculation logic into a helper function that can be reused
   - For friends: only calculate debt for items in `selectedItemIds` with their `friendSplitConfig`
   - Friends can override split settings for any selected item (their `portionsPaying` and `totalPortions` are independent from creator's values)
   - Each friend effectively has their own copy of split settings for items they selected
   - Keep existing calculation for session creators

7. **Session creator**:
   - No changes needed - keep existing interface
   - Continue using existing `isPayingMe` field (Mike Delmonaco is the only special case for now)

**`src/App.css`**:

New styles needed:

1. **Wizard container styles**:
   - `.wizard-container` - Main wizard wrapper
   - `.wizard-step` - Individual step container
   - `.wizard-progress` - Progress indicator (Step 1 of 3)

2. **Step 1 styles**:
   - `.item-checkbox-list` - Checkbox list container
   - `.item-checkbox-item` - Individual checkbox item with name and price
   - `.running-total` - Sticky bottom total display

3. **Step 2 styles**:
   - `.split-config-list` - List of items to configure splits
   - `.split-config-item` - Individual item split controls
   - Simplified split controls (less complex than creator view)

4. **Step 3 styles**:
   - `.payment-summary` - Breakdown display
   - `.payment-amount` - Large, prominent total
   - `.payee-info` - Display who they're paying
   - `.venmo-button-large` - Extra large Venmo button

5. **Navigation styles**:
   - `.wizard-nav` - Navigation button container
   - `.btn-wizard-next` - Next/Continue button
   - `.btn-wizard-back` - Back button
   - Mobile-optimized touch targets

## Implementation To-dos

### Phase 1: Foundation
- [ ] Add `isFriend` detection based on URL `?data=` parameter in App.tsx
- [ ] Extract debt calculation logic into a reusable helper function
- [ ] Add conditional rendering: show FriendWizard if isFriend, otherwise show existing form

### Phase 2: Friend Wizard Component
- [ ] Create `FriendWizard` component with internal state:
  - `currentStep` (1, 2, or 3)
  - `selectedItemIds` (Set of item IDs)
  - `friendSplitConfig` (Map of itemId -> split settings)
- [ ] Add props interface for items, subtotal, total, tip, tipIsRate, tipIncludedInTotal, isPayingMe
- [ ] Implement step navigation (next/back)
- [ ] Add progress indicator that shows current step

### Phase 3: Wizard Step 1 - Item Selection
- [ ] Render checkbox list of all items with names and costs
- [ ] All items unchecked by default
- [ ] Track selected items in `selectedItemIds`
- [ ] Display running total at bottom that updates as items are checked
- [ ] Add "Next" button (disabled if no items selected)
- [ ] Style for mobile-first experience

### Phase 4: Wizard Step 2 - Split Configuration
- [ ] Show only items that were checked in Step 1
- [ ] For each item, show split controls
- [ ] Default to creator's split settings (totalPortions, portionsPaying)
- [ ] Allow friend to override splits (including adding splits to unsplit items)
- [ ] Store overrides in `friendSplitConfig`
- [ ] Add "Back" and "Next" navigation buttons

### Phase 5: Wizard Step 3 - Payment Summary
- [ ] Calculate debt using selectedItemIds and friendSplitConfig
- [ ] Display breakdown: list of selected items with prices
- [ ] Show subtotal, share of tax/tip, and total (large and prominent)
- [ ] Show payment info based on isPayingMe flag
- [ ] Add large Venmo button with pre-filled amount and recipient
- [ ] Add "Back" button to return to step 2

### Phase 6: Styling
- [ ] Add wizard container and step styles
- [ ] Style item checkbox list (step 1)
- [ ] Style split configuration controls (step 2)
- [ ] Style payment summary and Venmo button (step 3)
- [ ] Add navigation button styles
- [ ] Ensure mobile-first responsive design
- [ ] Test on various screen sizes

### Phase 7: Polish & Testing
- [ ] Test full friend flow on mobile device
- [ ] Test with various bill sizes and split scenarios
- [ ] Verify Venmo links work correctly (with/without recipient)
- [ ] Test edge cases (no items selected, all items split, etc.)
- [ ] Verify calculation accuracy matches existing behavior for session creator
- [ ] Test that friends can add splits to unsplit items

