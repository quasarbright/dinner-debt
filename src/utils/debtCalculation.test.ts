// Unit tests for debt calculation logic.
// Tests various scenarios including split items, tips, tax, and edge cases.

import { calculateDebt } from './debtCalculation';
import type { Item } from '../types';

describe('calculateDebt', () => {
  describe('basic calculations', () => {
    it('should calculate debt for single item, no splitting', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // $10 item + $1 tax + $2.20 tip (20% of $11 total) = $13.20
      expect(debt).toBeCloseTo(13.20, 2);
    });

    it('should calculate debt for multiple items, no splitting', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 },
        { cost: 15, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 25, total: 27.5, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // $25 items + $2.50 tax + $5.50 tip (20% of $27.50) = $33.00
      expect(debt).toBeCloseTo(33.00, 2);
    });

    it('should calculate debt with flat tip', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 5, tipIsRate: false, tipIncludedInTotal: false });
      
      // $10 item + $1 tax + $5 flat tip = $16.00
      expect(debt).toBeCloseTo(16.00, 2);
    });

    it('should calculate debt with tip included in total', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 13, tip: 0, tipIsRate: true, tipIncludedInTotal: true });
      
      // $10 item + $3 (tax + included tip) = $13.00
      expect(debt).toBeCloseTo(13.00, 2);
    });
  });

  describe('split items', () => {
    it('should split item cost evenly between 2 people', () => {
      const items: Partial<Item>[] = [
        { cost: 20, portionsPaying: 1, totalPortions: 2 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 20, total: 22, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // $10 (half of $20) + $1 tax (half of $2) + $2.20 tip (half of $4.40) = $13.20
      expect(debt).toBeCloseTo(13.20, 2);
    });

    it('should split item cost evenly between 3 people', () => {
      const items: Partial<Item>[] = [
        { cost: 30, portionsPaying: 1, totalPortions: 3 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 30, total: 33, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // $10 (1/3 of $30) + $1 tax (1/3 of $3) + $2.20 tip (1/3 of $6.60) = $13.20
      expect(debt).toBeCloseTo(13.20, 2);
    });

    it('should handle paying for multiple portions of a split item', () => {
      const items: Partial<Item>[] = [
        { cost: 30, portionsPaying: 2, totalPortions: 3 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 30, total: 33, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // $20 (2/3 of $30) + $2 tax (2/3 of $3) + $4.40 tip (2/3 of $6.60) = $26.40
      expect(debt).toBeCloseTo(26.40, 2);
    });

    it('should handle mix of split and non-split items', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 },
        { cost: 20, portionsPaying: 1, totalPortions: 2 },
        { cost: 15, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 45, total: 49.5, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // My subtotal: $10 + $10 (half of $20) + $15 = $35
      // My ratio: 35/45 = 0.7778
      // Tax + tip: $4.50 + $9.90 = $14.40
      // My fees: $14.40 * 0.7778 = $11.20
      // Total: $35 + $11.20 = $46.20
      expect(debt).toBeCloseTo(46.20, 2);
    });
  });

  describe('proportional fee distribution', () => {
    it('should distribute tax proportionally based on subtotal ratio', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 100, total: 110, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // My subtotal: $10, Total subtotal: $100, Ratio: 10%
      // Tax: $10, Tip: $22 (20% of $110), Total fees: $32
      // My fees: $32 * 0.10 = $3.20
      // My debt: $10 + $3.20 = $13.20
      expect(debt).toBeCloseTo(13.20, 2);
    });

    it('should distribute fees when paying 75% of the bill', () => {
      const items: Partial<Item>[] = [
        { cost: 30, portionsPaying: 3, totalPortions: 4 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 40, total: 44, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // My subtotal: $22.50 (3/4 of $30)
      // Total subtotal: $40 (but only $30 is in items, assume others ate $10)
      // Actually, my ratio is 22.5/40 = 0.5625
      // Wait, the subtotal is total bill subtotal, not just my items
      // My items: $22.50, Bill subtotal: $40, My ratio: 22.5/40 = 0.5625
      // Tax + tip: $4 + $8.80 = $12.80
      // My fees: $12.80 * 0.5625 = $7.20
      // Total: $22.50 + $7.20 = $29.70
      expect(debt).toBeCloseTo(29.70, 2);
    });
  });

  describe('edge cases - missing values', () => {
    it('should handle missing subtotal by using sum of items', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 },
        { cost: 15, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: undefined, total: 27.5, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Subtotal defaults to sum of my items: $25
      // Tax: $2.50, Tip: $5.50 (20% of $27.50)
      // Total: $25 + $2.50 + $5.50 = $33.00
      expect(debt).toBeCloseTo(33.00, 2);
    });

    it('should handle missing total by using subtotal', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: undefined, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Total defaults to subtotal for tip calculation
      // Tax: $0 (total - subtotal), Tip: $2 (20% of $10)
      // Total: $10 + $0 + $2 = $12.00
      expect(debt).toBeCloseTo(12.00, 2);
    });

    it('should handle missing both subtotal and total', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: undefined, total: undefined, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Both default to sum of my items: $10
      // Tax: $0, Tip: $2 (20% of $10)
      // Total: $10 + $2 = $12.00
      expect(debt).toBeCloseTo(12.00, 2);
    });

    it('should handle missing cost values', () => {
      const items: Partial<Item>[] = [
        { cost: undefined, portionsPaying: 1, totalPortions: 1 },
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Item with undefined cost counts as $0
      // My subtotal: $10
      expect(debt).toBeCloseTo(13.20, 2);
    });

    it('should handle missing portion values', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: undefined, totalPortions: undefined }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Defaults to paying 1 of 1
      expect(debt).toBeCloseTo(13.20, 2);
    });
  });

  describe('edge cases - zero and empty values', () => {
    it('should return 0 for empty items array', () => {
      const items: Partial<Item>[] = [];
      
      const debt = calculateDebt({ items, subtotal: 0, total: 0, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      expect(debt).toBe(0);
    });

    it('should return 0 when subtotal and mySubtotal are both 0', () => {
      const items: Partial<Item>[] = [
        { cost: 0, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 0, total: 0, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      expect(debt).toBe(0);
    });

    it('should handle zero tip', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 1 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 0, tipIsRate: true, tipIncludedInTotal: false });
      
      // $10 + $1 tax + $0 tip = $11.00
      expect(debt).toBeCloseTo(11.00, 2);
    });

    it('should handle totalPortions of 0 (should default to 1)', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 1, totalPortions: 0 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // totalPortions 0 should be treated as 1 (Math.max)
      expect(debt).toBeCloseTo(13.20, 2);
    });
  });

  describe('edge cases - negative and absolute values', () => {
    it('should handle negative totalPortions (custom input mode)', () => {
      const items: Partial<Item>[] = [
        { cost: 20, portionsPaying: 1, totalPortions: -3 }
      ];
      
      const debt = calculateDebt({ items, subtotal: 20, total: 22, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Negative totalPortions should use absolute value
      // 1/3 of $20 = $6.666...
      // Tax: 1/3 of $2 = $0.666...
      // Tip: 1/3 of $4.40 = $1.466...
      // Total: $6.666... + $0.666... + $1.466... = $8.80
      expect(debt).toBeCloseTo(8.80, 2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle complex multi-person meal with various splits', () => {
      // Scenario: 4 people, I ordered:
      // - $12 appetizer split 4 ways
      // - $18 entree just for me
      // - $30 dessert split 2 ways
      const items: Partial<Item>[] = [
        { cost: 12, portionsPaying: 1, totalPortions: 4 },  // $3
        { cost: 18, portionsPaying: 1, totalPortions: 1 },  // $18
        { cost: 30, portionsPaying: 1, totalPortions: 2 }   // $15
      ];
      
      // My subtotal: $3 + $18 + $15 = $36
      // Bill subtotal: $100, Bill total: $115 (includes tax)
      // 18% tip on $115
      const debt = calculateDebt({ items, subtotal: 100, total: 115, tip: 18, tipIsRate: true, tipIncludedInTotal: false });
      
      // My subtotal: $36
      // My ratio: 36/100 = 0.36
      // Tax + tip: $15 + $20.70 = $35.70
      // My fees: $35.70 * 0.36 = $12.852
      // Total: $36 + $12.852 = $48.852
      expect(debt).toBeCloseTo(48.85, 2);
    });

    it('should handle scenario where I pay for someone else entirely', () => {
      const items: Partial<Item>[] = [
        { cost: 10, portionsPaying: 2, totalPortions: 2 }  // Paying for both portions
      ];
      
      const debt = calculateDebt({ items, subtotal: 10, total: 11, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // Paying for full item
      expect(debt).toBeCloseTo(13.20, 2);
    });

    it('should calculate correct debt when bill is split but not all items are', () => {
      // I ate a $15 entree, shared a $20 appetizer with 1 other person
      // Bill has other items I didn't eat
      const items: Partial<Item>[] = [
        { cost: 15, portionsPaying: 1, totalPortions: 1 },  // $15
        { cost: 20, portionsPaying: 1, totalPortions: 2 }   // $10
      ];
      
      // My subtotal: $25
      // Bill subtotal: $80 (others ordered $55 more)
      // Bill total: $92 (includes $12 tax)
      // 20% tip
      const debt = calculateDebt({ items, subtotal: 80, total: 92, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // My subtotal: $25
      // My ratio: 25/80 = 0.3125
      // Tax + tip: $12 + $18.40 = $30.40
      // My fees: $30.40 * 0.3125 = $9.50
      // Total: $25 + $9.50 = $34.50
      expect(debt).toBeCloseTo(34.50, 2);
    });
  });

  describe('real-world receipt scenarios', () => {
    it('should match typical restaurant bill calculation', () => {
      // Real scenario: ordered $23 entree + $3 side, split $12 appetizer 3 ways
      const items: Partial<Item>[] = [
        { cost: 23, portionsPaying: 1, totalPortions: 1 },
        { cost: 3, portionsPaying: 1, totalPortions: 1 },
        { cost: 12, portionsPaying: 1, totalPortions: 3 }
      ];
      
      // My subtotal: $30
      // Bill: subtotal $67, total $75.50 (8.5% tax), 20% tip
      const debt = calculateDebt({ items, subtotal: 67, total: 75.50, tip: 20, tipIsRate: true, tipIncludedInTotal: false });
      
      // My subtotal: $30
      // My ratio: 30/67 = 0.4478
      // Tax + tip: $8.50 + $15.10 = $23.60
      // My fees: $23.60 * 0.4478 = $10.57
      // Total: $30 + $10.57 = $40.57
      expect(debt).toBeCloseTo(40.57, 2);
    });
  });
});

