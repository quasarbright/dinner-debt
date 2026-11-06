// Convert the app's form state into the bill stored in a session.

import type { FormState } from '../types';
import { itemKeys } from '../utils/itemKeys';
import type { SessionBill } from './types';

export function sessionBillFromForm(form: FormState): SessionBill {
  const keys = itemKeys(form.items);
  return {
    items: form.items.map((item, i) => ({
      key: keys[i],
      name: item.name,
      cost: item.cost ?? 0,
      totalPortions: Math.max(1, Math.abs(item.totalPortions ?? 1)),
    })),
    subtotal: form.subtotal,
    total: form.total,
    tip: form.tip,
    tipIsRate: form.tipIsRate,
    tipIncludedInTotal: form.tipIncludedInTotal,
    venmoUsername: form.venmoUsername,
  };
}
