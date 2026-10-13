import { describe, expect, it } from 'vitest';
import { formatList, smsUrl } from '../src/lib/shareList';
import { normalizeState } from '../src/lib/store';

describe('sharing a shopping list', () => {
  const list = {
    id: 'a',
    name: 'Veckohandling',
    items: [
      { id: '1', name: 'Mjölk', quantity: 2, unit: 'st', done: false },
      { id: '2', name: 'Bananer', quantity: 1, unit: 'kg', done: false },
      { id: '3', name: 'Bröd', quantity: 1, unit: 'st', done: true },
    ],
  };

  it('lists only items not yet bought', () => {
    expect(formatList(list)).toBe('🛒 Veckohandling\n\n• Mjölk (2 st)\n• Bananer (1 kg)\n\nSkickat från MatStatus');
  });

  it('returns null for an empty list', () => {
    expect(formatList({ ...list, items: [] })).toBeNull();
  });

  it('builds an sms: link with the body encoded', () => {
    expect(smsUrl('Mjölk & ägg', false)).toBe('sms:?body=Mj%C3%B6lk%20%26%20%C3%A4gg');
    expect(smsUrl('x', true)).toBe('sms:&body=x');
  });
});

describe('normalizeState', () => {
  it('migrates the old single shopping list', () => {
    const s = normalizeState({ items: [], shopping: [{ id: '1', name: 'Ost', quantity: 1, unit: 'st', done: false }] });
    expect(s.lists).toHaveLength(1);
    expect(s.lists[0].items[0].name).toBe('Ost');
    expect(s.activeListId).toBe(s.lists[0].id);
  });
});

import { parseEntry } from '../src/lib/shoppingEntry';

describe('parseEntry', () => {
  it.each([
    ['mjölk', 'mjölk', 1],
    ['2 mjölk', 'mjölk', 2],
    ['3st ägg', 'ägg', 3],
    ['bananer x4', 'bananer', 4],
    ['yoghurt 2 st', 'yoghurt', 2],
    ['mjölk 3%', 'mjölk 3%', 1],
  ])('%s', (raw, name, quantity) => {
    expect(parseEntry(raw)).toEqual({ name, quantity });
  });
});
