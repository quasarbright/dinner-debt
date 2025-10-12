# Friend UX Improvements

## Problem

Friends receiving the QR code/link need a dead-simple experience: see items, remove what they didn't eat, pay. Current UX is confusing with unnecessary features and unclear guidance.

## Solution: Auto-detect User Type & Simplify

### 1. Detect Friend vs Session Creator

- **Friend indicator**: URL has `?data=` parameter → this is a friend
- **Session creator**: No data parameter → this is the person creating the split

### 2. Friend-Specific UI Changes

**Hide unnecessary features for friends:**

- QR code section (entire section)
- Receipt upload button
- "Add Item" button (or make it subtle/collapsed)

**Pre-fill & clarify payment recipient:**

- Store payee name in shared state (default: "Mike Delmonaco")
- For friends: Pre-select "Yes" and show clearly "You are paying: [Name]"
- Consider hiding the radio buttons entirely for friends

**Add clear instructions:**

- Show prominent help text at top for friends: 
- "Remove items you didn't eat, then pay with Venmo below"
- Make this impossible to miss (highlighted box, good contrast)

### 3. Make Item Removal More Obvious

**Improve item removal UX:**

- Make remove button (×) larger and more prominent
- Consider adding visual feedback (item fades out when removed)
- Alternative: Add checkboxes for "I ate this" with all checked by default
- Show running total that updates as items are removed

### 4. Simplify Split Controls

**For friends, simplify the split controls:**

- Most friends won't change "paying for" - consider auto-hiding this field
- Only show if "Split" is > 1 person
- Keep "Split?" visible since multiple people might share an item

### 5. Prominent Payment Button

**Make Venmo button unmissable:**

- Move result section higher (right after items)
- Make button larger and more visually distinct
- Consider sticky button at bottom on mobile

## Files to Modify

**`src/App.tsx`** (Lines 87-677):

- Add `isFriend` state derived from URL params (line ~109)
- Update `FormState` interface to include `payeeName?: string` (line 29-37)
- Conditionally hide QR section for friends (line 579-628)
- Conditionally hide receipt upload for friends (line 415-430)
- Pre-select `isPayingMe` for friends (line ~127)
- Add friend instructions section (after line 305)
- Simplify payment recipient section for friends (line 535-560)

**`src/App.css`** (Lines 40-549):

- Add `.friend-instructions` styles for prominent help text
- Add `.friend-mode .qr-section { display: none; }`
- Enhance `.btn-remove` to be more prominent
- Add `.sticky-payment-button` for mobile
- Add visual feedback styles for item removal

## To-dos

- [ ] Add isFriend detection based on URL data parameter and add payeeName to FormState
- [ ] Add prominent friend instructions section with clear guidance
- [ ] Conditionally hide QR code, receipt upload, and minimize Add Item button for friends
- [ ] Pre-select payment recipient for friends and make it clearer who they're paying
- [ ] Make item removal more obvious with better button styling and visual feedback
- [ ] Make Venmo button more prominent and consider sticky positioning on mobile

