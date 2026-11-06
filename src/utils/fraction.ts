// Exact rational numbers stored as integer numerator/denominator pairs.
// Used for "how much of an item is paid" so that, e.g., three 1/3 payments
// add up to exactly 1 instead of 0.9999999.

export interface Fraction {
  num: number;
  den: number;
}

export const ZERO: Fraction = { num: 0, den: 1 };
export const ONE: Fraction = { num: 1, den: 1 };

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Build a fraction in lowest terms with a positive denominator.
export function fraction(num: number, den: number): Fraction {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || den === 0) {
    throw new RangeError(`Invalid fraction ${num}/${den}`);
  }
  const sign = den < 0 ? -1 : 1;
  const g = gcd(num, den) || 1;
  return { num: (sign * num) / g, den: (sign * den) / g };
}

export function add(a: Fraction, b: Fraction): Fraction {
  return fraction(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  return fraction(a.num * b.den - b.num * a.den, a.den * b.den);
}

// Negative if a < b, zero if equal, positive if a > b.
export function compare(a: Fraction, b: Fraction): number {
  return a.num * b.den - b.num * a.den;
}

export function min(a: Fraction, b: Fraction): Fraction {
  return compare(a, b) <= 0 ? a : b;
}

export function max(a: Fraction, b: Fraction): Fraction {
  return compare(a, b) >= 0 ? a : b;
}

// Only for display and money math at the edges; never store the result.
export function toNumber(f: Fraction): number {
  return f.num / f.den;
}

// Parse untrusted data (e.g. from Firestore) into a fraction in [0, 1].
// Returns null for anything that isn't a pair of sane integers.
export function parseUnitFraction(value: unknown, maxDen = 1000): Fraction | null {
  if (typeof value !== 'object' || value === null) return null;
  const { num, den } = value as Record<string, unknown>;
  if (typeof num !== 'number' || typeof den !== 'number') return null;
  if (!Number.isInteger(num) || !Number.isInteger(den)) return null;
  if (den < 1 || den > maxDen || num < 0 || num > den) return null;
  return fraction(num, den);
}
