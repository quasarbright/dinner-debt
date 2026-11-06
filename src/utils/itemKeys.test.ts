import { itemKeys } from './itemKeys';

describe('itemKeys', () => {
  it('derives keys from normalized name and cost in cents', () => {
    expect(itemKeys([{ name: '  Spicy   Nachos ', cost: 12.5 }])).toEqual(['spicy nachos|1250|1']);
  });

  it('numbers identical items so they stay distinct', () => {
    expect(itemKeys([
      { name: 'Beer', cost: 7 },
      { name: 'Burger', cost: 15 },
      { name: 'beer', cost: 7 },
    ])).toEqual(['beer|700|1', 'burger|1500|1', 'beer|700|2']);
  });

  it('treats same name with different cost as different items', () => {
    expect(itemKeys([{ name: 'Beer', cost: 7 }, { name: 'Beer', cost: 8 }]))
      .toEqual(['beer|700|1', 'beer|800|1']);
  });

  it('is stable across ids and float noise', () => {
    const a = itemKeys([{ name: 'Fries', cost: 0.1 + 0.2, id: 'x' }]);
    const b = itemKeys([{ name: 'Fries', cost: 0.3, id: 'y' }]);
    expect(a).toEqual(b);
  });

  it('handles unnamed and costless items', () => {
    expect(itemKeys([{}, {}])).toEqual(['|0|1', '|0|2']);
  });
});
