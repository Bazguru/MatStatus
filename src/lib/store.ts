import { useCallback, useEffect, useState } from 'react';
import type { AppState, FoodItem, Settings, ShoppingItem, ShoppingList } from './types';

const KEY = 'matstatus:v1';

export const DEFAULT_SETTINGS: Settings = {
  notifyTime: '08:00',
  warnDays: 2,
  notificationsEnabled: true,
};

const DEFAULT_LIST_ID = 'default';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyState(): AppState {
  return {
    items: [],
    lists: [{ id: DEFAULT_LIST_ID, name: 'Inköpslista', items: [] }],
    activeListId: DEFAULT_LIST_ID,
    settings: DEFAULT_SETTINGS,
  };
}

/**
 * Accepts saved state and imported backups from any app version. Version
 * 0.1 had a single `shopping` array instead of named lists.
 */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = raw as Partial<AppState> & { shopping?: ShoppingItem[] };
  let lists = Array.isArray(parsed.lists) ? parsed.lists : null;
  if (!lists || lists.length === 0) {
    lists = [{ ...base.lists[0], items: Array.isArray(parsed.shopping) ? parsed.shopping : [] }];
  }
  const activeListId = lists.some((l) => l.id === parsed.activeListId) ? parsed.activeListId! : lists[0].id;
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    lists,
    activeListId,
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable – keep running in memory.
  }
}

function mapList(s: AppState, listId: string, fn: (l: ShoppingList) => ShoppingList): AppState {
  return { ...s, lists: s.lists.map((l) => (l.id === listId ? fn(l) : l)) };
}

function addToList(list: ShoppingList, entry: Omit<ShoppingItem, 'id' | 'done'>): ShoppingList {
  const existing = list.items.find((x) => !x.done && x.name.toLowerCase() === entry.name.toLowerCase());
  if (existing) return list;
  return { ...list, items: [...list.items, { ...entry, id: uid(), done: false }] };
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

  /** Remove an item; optionally put it on the active shopping list. */
  const removeItem = useCallback((id: string, addToShopping: boolean) => {
    setState((s) => {
      const item = s.items.find((i) => i.id === id);
      const next = { ...s, items: s.items.filter((i) => i.id !== id) };
      if (!item || !addToShopping) return next;
      return mapList(next, s.activeListId, (l) =>
        addToList(l, { name: item.name, quantity: 1, unit: item.unit, fromItem: item.id }),
      );
    });
  }, []);

  const addShopping = useCallback((listId: string, name: string, quantity = 1, unit = 'st') => {
    setState((s) => mapList(s, listId, (l) => addToList(l, { name, quantity, unit })));
  }, []);

  const updateShopping = useCallback((listId: string, id: string, patch: Partial<ShoppingItem>) => {
    setState((s) => mapList(s, listId, (l) => ({ ...l, items: l.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })));
  }, []);

  const removeShopping = useCallback((listId: string, id: string) => {
    setState((s) => mapList(s, listId, (l) => ({ ...l, items: l.items.filter((i) => i.id !== id) })));
  }, []);

  const clearDoneShopping = useCallback((listId: string) => {
    setState((s) => mapList(s, listId, (l) => ({ ...l, items: l.items.filter((i) => !i.done) })));
  }, []);

  const createList = useCallback((name: string) => {
    const id = uid();
    setState((s) => ({ ...s, lists: [...s.lists, { id, name, items: [] }], activeListId: id }));
    return id;
  }, []);

  const renameList = useCallback((listId: string, name: string) => {
    setState((s) => mapList(s, listId, (l) => ({ ...l, name })));
  }, []);

  /** Deletes a list; the last remaining list is emptied instead. */
  const deleteList = useCallback((listId: string) => {
    setState((s) => {
      if (s.lists.length <= 1) return mapList(s, listId, (l) => ({ ...l, items: [] }));
      const lists = s.lists.filter((l) => l.id !== listId);
      return { ...s, lists, activeListId: s.activeListId === listId ? lists[0].id : s.activeListId };
    });
  }, []);

  const setActiveList = useCallback((listId: string) => {
    setState((s) => ({ ...s, activeListId: listId }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback((next: AppState) => setState(next), []);

  return {
    state,
    addItems,
    updateItem,
    removeItem,
    addShopping,
    updateShopping,
    removeShopping,
    clearDoneShopping,
    createList,
    renameList,
    deleteList,
    setActiveList,
    updateSettings,
    replaceAll,
  };
}

export type AppStore = ReturnType<typeof useAppState>;
