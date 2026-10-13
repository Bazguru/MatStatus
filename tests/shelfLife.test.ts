import { describe, expect, it } from 'vitest';
import { estimateExpiry, matchRule } from '../src/lib/shelfLife';

describe('shelf life', () => {
  it('matches Swedish product names', () => {
    expect(matchRule('Mjölk 3% 1,5l').category).toBe('Mjölk & fil');
    expect(matchRule('Kycklingfilé 900g').category).toBe('Fågel');
    expect(matchRule('Köttfärs 12%').category).toBe('Kött');
    expect(matchRule('Okänd grej').category).toBe('Övrigt');
  });

  it('gives frozen goods a longer life and opened goods a shorter one', () => {
    const rule = matchRule('Köttfärs');
    expect(estimateExpiry(rule, 'kyl', '2026-10-13')).toBe('2026-10-17');
    expect(estimateExpiry(rule, 'frys', '2026-10-13')).toBe('2027-02-10');
    expect(estimateExpiry(matchRule('Mjölk'), 'kyl', '2026-10-13', true)).toBe('2026-10-17');
  });
});
