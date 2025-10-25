// Manage all form state for bill splitting.
// Handles items, subtotal, total, tip configuration, and loading state from URL on mount.

import { useState, useEffect } from 'react';
import type { Item, FormState, ReceiptData } from '../types';
import { emptyItem } from '../utils/itemHelpers';
import { decodeFormState } from '../utils/shareUrl';

export function useFormState() {
  const [items, setItems] = useState<Partial<Item>[]>([emptyItem()]);
  const [subtotal, setSubtotal] = useState<number>();
  const [total, setTotal] = useState<number>();
  const [tip, setTip] = useState<number | undefined>(20);
  const [tipIsRate, setTipIsRate] = useState<boolean>(true);
  const [tipIncludedInTotal, setTipIncludedInTotal] = useState<boolean>(false);
  const [venmoUsername, setVenmoUsername] = useState<string>();

  // Load state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    
    if (data) {
      const decoded = decodeFormState(data);
      if (decoded) {
        setItems(decoded.items.map(item => ({
          ...item,
          id: item.id || crypto.randomUUID()
        })));
        setSubtotal(decoded.subtotal);
        setTotal(decoded.total);
        setTip(decoded.tip);
        setTipIsRate(decoded.tipIsRate);
        setTipIncludedInTotal(decoded.tipIncludedInTotal);
        setVenmoUsername(decoded.venmoUsername);
      }
    }
  }, []);

  const setItem = (index: number, item: Partial<Item>) => {
    setItems(items => {
      const newItems = items.slice();
      newItems[index] = {...items[index], ...item};
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems(items => {
      const newItems = items.slice();
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const addItem = () => {
    setItems(items => [...items, emptyItem()]);
  };

  const populateFormFromReceipt = (data: ReceiptData) => {
    const newItems: Partial<Item>[] = data.items.map((item) => ({
      name: item.name,
      cost: item.cost,
      portionsPaying: 1,
      totalPortions: 1,
      id: crypto.randomUUID()
    }));
    
    setItems(newItems);
    
    if (data.subtotal) {
      setSubtotal(data.subtotal);
    }
    if (data.total) {
      setTotal(data.total);
    }
    
    if (data.tipIncludedInTotal) {
      setTip(0);
      setTipIncludedInTotal(true);
    } else if (data.tip) {
      setTip(data.tip);
      setTipIsRate(false);
      setTipIncludedInTotal(false);
    } else {
      setTipIncludedInTotal(false);
    }
    
    console.log('Form populated successfully');
  };

  const getFormState = (): FormState => ({
    items,
    subtotal,
    total,
    tip,
    tipIsRate,
    tipIncludedInTotal,
    venmoUsername
  });

  return {
    items,
    setItems,
    subtotal,
    setSubtotal,
    total,
    setTotal,
    tip,
    setTip,
    tipIsRate,
    setTipIsRate,
    tipIncludedInTotal,
    setTipIncludedInTotal,
    venmoUsername,
    setVenmoUsername,
    setItem,
    removeItem,
    addItem,
    populateFormFromReceipt,
    getFormState
  };
}

