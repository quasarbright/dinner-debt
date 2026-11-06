// Content-based keys for bill items.
// Item ids are regenerated whenever a share link is decoded, so the host and
// friends can't agree on them. Instead every device derives the same key from
// the item's name and cost, plus an occurrence number so that two identical
// lines ("Beer $7" twice) still get distinct keys.

import type { Item } from '../types';

function normalizeName(name: string | undefined): string {
  return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function costInCents(cost: number | undefined): number {
  return Math.round((cost ?? 0) * 100);
}

// Returns one key per item, in the same order as the items.
export function itemKeys(items: Partial<Item>[]): string[] {
  const seen = new Map<string, number>();
  return items.map(item => {
    const base = `${normalizeName(item.name)}|${costInCents(item.cost)}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    return `${base}|${occurrence}`;
  });
}
