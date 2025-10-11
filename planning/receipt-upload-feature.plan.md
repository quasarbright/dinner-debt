# Receipt Upload Feature (Vision API)

## Overview

Add receipt photo upload functionality using OpenRouter Vision API (GPT-4o-mini or Claude with vision). The feature is behind a query string flag (`?receipt-upload-enabled`) and uses user-provided OpenRouter API key stored in localStorage.

## Implementation Steps

### 1. ~~Add Item Names to Data Model~~ ✅ COMPLETE

Item interface now includes optional `name` field.

### 2. ~~Replace Table with Card Layout~~ ✅ COMPLETE

Card-based layout implemented with:
- Item name at top (if present)
- Horizontal row with: Remove button, Cost input, Split dropdown, Paying for dropdown
- Labels above inputs

### 3. ~~Add Receipt Upload UI~~ ✅ COMPLETE

Upload button added with:
- File picker with camera on mobile (`capture="environment"`)
- Loading states
- Error message display

### 4. ~~Feature Flag with Query String~~ ✅ COMPLETE

Feature flag implemented with:
- Checks for `?receipt-upload-enabled` query parameter in URL
- Upload button only renders when parameter is present
- Button text shows "(beta)" label

### 5. ~~API Key Management~~ ✅ COMPLETE

API key management implemented with:
- Checks localStorage for `openrouter_api_key` on upload
- Shows modal if key not found
- Modal includes security warning about localStorage
- Saves key to localStorage for future sessions
- Enter key submits the form

### 6. Install and Setup Vercel AI SDK

- Install `ai` package (`npm install ai`)
- Setup for client-side usage with OpenRouter
- Configure with user's API key from localStorage

### 7. Implement Vision API Processing with Tool Calling

Use Vercel AI SDK's `generateText` with tools:

**Tools to provide:**
- `calculator`: Evaluates math expressions (e.g., "5.99 + 3.50 + 2.00")
  - Use safe expression evaluator (e.g., `math.js` or simple parser)
  - LLM can call this to verify item sums, check subtotal math, etc.

**Vision API Call:**
- Convert receipt image to base64
- Use `generateText()` with:
  - Model: `openrouter/anthropic/claude-3-haiku` or `openrouter/openai/gpt-4o-mini`
  - Image content in messages
  - Calculator tool available
  - System prompt requesting structured JSON:
    ```
    Extract items from this receipt. Use the calculator tool to verify your math.
    
    Return JSON with:
    - items: [{name: string, cost: number}, ...]
    - subtotal: number
    - total: number
    - tipIncludedInTotal: boolean
    - tip?: number (flat dollar amount, only if explicitly stated and not in total)
    
    Edge cases:
    - If gratuity/tip included in total: tipIncludedInTotal: true
    - If gratuity present but NOT in total (hand-written or checkbox): 
      set tip field, but total should be pre-tip printed total
    - If item shows "x2" or quantity: create separate duplicate items
    
    Use calculator tool to verify: sum(items) ≈ subtotal, subtotal + tax ≈ total
    ```
- Handle API errors gracefully with user-friendly messages

### 8. Populate Form from Parsed Data

After successful API response:
- Replace existing items with parsed items
- Create Item objects with names and costs
- Set default portions (portionsPaying: 1, totalPortions: 1)
- Pre-fill subtotal and total fields if extracted
- If `tipIncludedInTotal` is true, set tip to 0. Otherwise if `tip` present, set the tip to flat and that dollar amount.
- Show success message briefly

## Technical Details

- **API Key Storage:** localStorage (persists across sessions)
- **Security:** Acceptable for personal use, isolated per domain
- **Feature Flag:** `?receipt-upload-enabled` query parameter
- **Cost:** User pays their own OpenRouter credits (~$0.001-0.01 per receipt)
- **Error Handling:** Show errors in error message UI element
- **No Backend:** Pure client-side implementation

## Files to Modify

- `src/App.tsx` - Feature flag, API key management, OpenRouter API integration, form population
- `src/App.css` - Modal styling for API key input (if needed)

## To-dos

- [x] Add name field to Item interface
- [x] Create card-based layout
- [x] Add receipt upload button UI
- [x] Add query string feature flag check
- [x] Add API key modal/prompt
- [ ] Install Vercel AI SDK
- [ ] Implement OpenRouter Vision API call with tool calling
- [ ] Parse response and populate form

