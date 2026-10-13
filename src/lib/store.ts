import { useCallback, useEffect, useState } from 'react';
import type { AppState, FoodItem, Settings, ShoppingItem } from './types';

const KEY = 'matstatus:v1';

export const DEFAULT_SETTINGS: Settings = {
  notifyTime: '08:00',
  warnDays: 2,
  notificationsEnabled: true,
};

const EMPTY: AppState = { items: [], shopping: [], settings: DEFAULT_SETTINGS };

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      items: parsed.items ?? [],
      shopping: parsed.shopping ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return EMPTY;
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable – keep running in memory.
  }
}

/**
 * Single source of truth for the app. Persists to localStorage, which on
 * Android lives inside the app's WebView storage. Swapping this for a synced
 * backend (for the web version) only requires changing this module.
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => saveState(state), [state]);

  const addItems = useCallback((items: Omit<FoodItem, 'id'>[]) => {
    setState((s) => ({ ...s, items: [...s.items, ...items.map((i) => ({ ...i, id: uid() }))] }));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<FoodItem>) => {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  /** Remove an item; optionally put it on the shopping list. */
  const removeItem = useCallback((id: string, addToShopping: boolean) => {
    setState((s) => {
      const item = s.items.find((i) => i.id === id);
      const items = s.items.filter((i) => i.id !== id);
      if (!item || !addToShopping) return { ...s, items };
      const already = s.shopping.some((x) => !x.done && x.name.toLowerCase() === item.name.toLowerCase());
      const shopping = already
        ? s.shopping
        : [...s.shopping, { id: uid(), name: item.name, quantity: 1, unit: item.unit, done: false, fromItem: item.id }];
      return { ...s, items, shopping };
    });
  }, []);

  const addShopping = useCallback((name: string, quantity = 1, unit = 'st') => {
    setState((s) => ({ ...s, shopping: [...s.shopping, { id: uid(), name, quantity, unit, done: false }] }));
  }, []);

  const updateShopping = useCallback((id: string, patch: Partial<ShoppingItem>) => {
    setState((s) => ({ ...s, shopping: s.shopping.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  const clearDoneShopping = useCallback(() => {
    setState((s) => ({ ...s, shopping: s.shopping.filter((i) => !i.done) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback((next: AppState) => setState(next), []);

  return { state, addItems, updateItem, removeItem, addShopping, updateShopping, clearDoneShopping, updateSettings, replaceAll };
}
