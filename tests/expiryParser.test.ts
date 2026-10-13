import { describe, expect, it } from 'vitest';
import { parseExpiryDate } from '../src/lib/expiryParser';

const now = new Date(2026, 9, 13); // 13 okt 2026

describe('parseExpiryDate', () => {
  it.each([
    ['BÄST FÖRE 2026-10-20', '2026-10-20'],
    ['Bäst före: 20.10.2026', '2026-10-20'],
    ['bäst före 20/10/26', '2026-10-20'],
    ['Sista förbrukningsdag 18 okt 2026', '2026-10-18'],
    ['BF 261020', '2026-10-20'],
    ['Bäst före 25.10', '2026-10-25'],
    ['best before 15 nov', '2026-11-15'],
    ['Bäst före 2O26-1O-2O', '2026-10-20'],
  ])('%s → %s', (text, expected) => {
    expect(parseExpiryDate(text, now)).toBe(expected);
  });

  it('prefers the date after the keyword over the packing date', () => {
    expect(parseExpiryDate('Förpackad 2026-10-10\nBäst före 2026-10-24', now)).toBe('2026-10-24');
  });

  it('falls back to the latest date when no keyword is found', () => {
    expect(parseExpiryDate('2026-10-10   2026-11-02', now)).toBe('2026-11-02');
  });

  it('returns null when no date exists', () => {
    expect(parseExpiryDate('Mjölk 3% Arla', now)).toBeNull();
  });
});
