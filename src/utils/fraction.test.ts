import { add, compare, fraction, ONE, parseUnitFraction, subtract, ZERO } from './fraction';

describe('fraction', () => {
  it('reduces to lowest terms with a positive denominator', () => {
    expect(fraction(2, 4)).toEqual({ num: 1, den: 2 });
    expect(fraction(3, -6)).toEqual({ num: -1, den: 2 });
    expect(fraction(0, 5)).toEqual({ num: 0, den: 1 });
  });

  it('rejects non-integers and zero denominators', () => {
    expect(() => fraction(0.5, 1)).toThrow();
    expect(() => fraction(1, 0)).toThrow();
  });

  it('adds exactly: three thirds make exactly one', () => {
    const third = fraction(1, 3);
    const sum = add(add(third, third), third);
    expect(sum).toEqual(ONE);
    expect(compare(sum, ONE)).toBe(0);
  });

  it('adds and subtracts mixed denominators', () => {
    expect(add(fraction(1, 2), fraction(1, 3))).toEqual({ num: 5, den: 6 });
    expect(subtract(ONE, fraction(2, 3))).toEqual({ num: 1, den: 3 });
    expect(subtract(ZERO, ZERO)).toEqual(ZERO);
  });

  it('compares', () => {
    expect(compare(fraction(1, 2), fraction(2, 3))).toBeLessThan(0);
    expect(compare(fraction(4, 3), ONE)).toBeGreaterThan(0);
  });
});

describe('parseUnitFraction', () => {
  it('accepts integer pairs in [0, 1]', () => {
    expect(parseUnitFraction({ num: 2, den: 6 })).toEqual({ num: 1, den: 3 });
    expect(parseUnitFraction({ num: 1, den: 1 })).toEqual(ONE);
    expect(parseUnitFraction({ num: 0, den: 3 })).toEqual(ZERO);
  });

  it.each([
    null,
    0.5,
    'half',
    { num: 1 },
    { num: 0.5, den: 1 },
    { num: 1, den: 2.5 },
    { num: '1', den: 2 },
    { num: 3, den: 2 },
    { num: -1, den: 2 },
    { num: 1, den: 0 },
    { num: 1, den: 1_000_000 },
  ])('rejects %p', value => {
    expect(parseUnitFraction(value)).toBeNull();
  });
});
