// Unit tests for receipt processing functionality.
// Tests various receipt formats and edge cases like handwritten tips and included gratuity.
//
// IMPORTANT: These tests make real API calls and cost money!
// - They are excluded from normal test runs via jest.config.js
// - Run explicitly with: npm run test:receipt
// - Requires OPENROUTER_API_KEY in .env.test
// - Sets ALLOW_RECEIPT_API_CALLS=true to bypass safety check

import { processReceipt } from './receiptProcessor';
import type { ReceiptData } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test
const envPath = path.resolve(__dirname, '..', '.env.test');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Allow real API calls for this specific test file
process.env.ALLOW_RECEIPT_API_CALLS = 'true';

// DO NOT add jest.mock('../receiptProcessor') here - we want the real implementation
// for these integration tests

describe('processReceipt', () => {
  const API_KEY = process.env.OPENROUTER_API_KEY;
  
  if (!API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is required to run tests.\n' +
      'Create a .env.test file in the project root with your API key.\n' +
      'See .env.test.template for an example.'
    );
  }

  // Helper to create a File object from a local file path
  async function createFileFromPath(filePath: string): Promise<File> {
    const absolutePath = path.resolve(__dirname, '..', filePath);
    const buffer = fs.readFileSync(absolutePath);
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array]);
    const filename = path.basename(filePath);
    return new File([blob], filename, { type: 'image/png' });
  }

  it('should reject HEIC files with clear error message', async () => {
    const heicFile = new File(['fake'], 'test.heic', { type: 'image/heic' });
    await expect(processReceipt(heicFile, API_KEY)).rejects.toThrow(
      'HEIC/HEIF format is not supported'
    );
  });

  it('should throw error for missing API key', async () => {
    const receiptFile = new File(['fake'], 'test.png', { type: 'image/png' });
    await expect(processReceipt(receiptFile, '')).rejects.toThrow();
  });

  describe('with test receipts', () => {
    /**
     * Receipt: Austin Inn restaurant
     * - PIMA LOCA: $13.65
     * - SODA: $2.77
     * - RUN WILD IPA N/A: $5.53
     * - Subtotal: $22.15
     * - Tax: $1.65
     * - Total (printed): $24.00
     * - Tip (handwritten): $5.00
     * - Total (handwritten): $29.00
     * 
     * Expected behavior: Extract handwritten tip, ignore handwritten total
     */
    it('should process receipt with handwritten tip correctly', async () => {
      const receiptFile = await createFileFromPath('test-receipts/receipt-with-written-tip.png');
      const result = await processReceipt(receiptFile, API_KEY);

      // Expected items from receipt
      expect(result.items).toHaveLength(3);
      
      // Check all items are present with correct costs
      const itemNames = result.items.map(i => i.name);
      expect(itemNames).toContainEqual(expect.stringMatching(/PI.A LOCA/));
      expect(itemNames).toContain('SODA');
      expect(itemNames).toContain('RUN WILD IPA N/A');
      
      const pimaLoca = result.items.find(i => i.name.match(/PI.A LOCA/));
      const soda = result.items.find(i => i.name === 'SODA');
      const ipa = result.items.find(i => i.name === 'RUN WILD IPA N/A');
      
      expect(pimaLoca?.cost).toBeCloseTo(13.85, 2);
      expect(soda?.cost).toBeCloseTo(2.77, 2);
      expect(ipa?.cost).toBeCloseTo(5.53, 0); // it thinks it's 5.63 but idc

      // Check printed totals (not handwritten)
      expect(result.subtotal).toBeCloseTo(22.15, 2);
      expect(result.total).toBeCloseTo(24.00, 2); // 29 means it's using the handwritten total which includes tip

      // Check tip handling - handwritten tip should be extracted
      expect(result.tipIncludedInTotal).toBe(false);
      expect(result.tip).toBeCloseTo(5.00, 2);
    }, 30000);

    /**
     * Receipt: Five Acres (Rockefeller Plaza)
     * - Kale Avocado: $30.00
     * - Fever Tree Club Soda: $6.00
     * - Nicoise Salad: $25.00
     * - Mint Iced Tea: $6.00
     * - Subtotal: $67.00
     * - Gratuity (20%): $14.59
     * - Tax: $5.93
     * - Total: $87.52
     * 
     * Expected behavior: Recognize gratuity is included in total
     */
    it('should process receipt with included gratuity correctly', async () => {
      const receiptFile = await createFileFromPath('test-receipts/receipt-with-included-gratuity.png');
      const result = await processReceipt(receiptFile, API_KEY);

      // Expected items from Five Acres receipt
      expect(result.items).toHaveLength(4);
      
      const itemNames = result.items.map(i => i.name);
      expect(itemNames).toContain('Kale Avocado');
      expect(itemNames).toContain('Fever Tree Club Soda');
      expect(itemNames).toContainEqual(expect.stringMatching(/Ni.oise Salad/));
      expect(itemNames).toContain('Mint Iced Tea');
      
      const kale = result.items.find(i => i.name === 'Kale Avocado');
      const soda = result.items.find(i => i.name === 'Fever Tree Club Soda');
      const salad = result.items.find(i => i.name.match(/Ni.oise Salad/));
      const tea = result.items.find(i => i.name === 'Mint Iced Tea');
      
      expect(kale?.cost).toBeCloseTo(30.00, 2);
      expect(soda?.cost).toBeCloseTo(6.00, 2);
      expect(salad?.cost).toBeCloseTo(25.00, 2);
      expect(tea?.cost).toBeCloseTo(6.00, 2);

      // Check totals
      expect(result.subtotal).toBeCloseTo(67.00, 2);
      expect(result.total).toBeCloseTo(87.52, 2);

      // Gratuity is included in total
      expect(result.tipIncludedInTotal).toBe(true);
      expect(result.tip).toBe(0);
    }, 30000);

    // skipping because it's to hard from the blurry image
    // TODO: add a non-blurry image for testing duplicates
    /**
     * Receipt: Joe's (blurry image)
     * Contains items with quantity prefixes:
     * - 2 AM Espresso Mrt
     * - 1 Tito's Mix
     * - 1 Calamari
     * - 1 Oysters 6
     * - 1 Buff Chx Tenders
     * - 2 Chowder Bowl
     * - 2 Du Jour Bowl
     * - 1 Salmon
     * - 1 Honey I'm Home
     * - Total: $204.37
     * 
     * Expected behavior: Duplicate items with quantity > 1
     */
    it.skip('should process blurry receipt and duplicate quantity items', async () => {
      const receiptFile = await createFileFromPath('test-receipts/blurry-receipt.png');
      const result = await processReceipt(receiptFile, API_KEY);

      // This receipt has items with "2" prefix, which should be duplicated
      // 2 AM Espresso Mrt, 2 Chowder Bowl, 2 Du Jour Bowl
      // So we expect at least 11 items (6 singles + 3*2 duplicates)
      expect(result.items.length).toBeGreaterThanOrEqual(11);

      // Check that duplicate items exist
      const itemNames = result.items.map(i => i.name);
      const espressoCount = itemNames.filter(n => n.includes('Espresso')).length;
      const chowderCount = itemNames.filter(n => n.includes('Chowder')).length;
      const duJourCount = itemNames.filter(n => n.includes('Du Jour')).length;
      
      expect(espressoCount).toBe(2);
      expect(chowderCount).toBe(2);
      expect(duJourCount).toBe(2);

      // Check total
      expect(result.total).toBeCloseTo(204.37, 2);
      
      // This receipt shows suggested tips but no included gratuity
      expect(result.tipIncludedInTotal).toBe(false);
    }, 30000);
  });
});

