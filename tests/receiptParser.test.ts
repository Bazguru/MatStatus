import { describe, expect, it } from 'vitest';
import { parseReceipt } from '../src/lib/receiptParser';

const ICA = `ICA Supermarket City
Org nr 556123-4567
Kvitto 2026-10-12 17:42
MJÖLK 3% 1,5L            17,95
*KYCKLINGFILÉ 900G        89,00
BANAN                     21,35
0,812 kg * 26,29 kr/kg
YOGHURT NATURELL          24,90
2 st * 24,90
Pant                       2,00
Rabatt yoghurt           -10,00
Plastkasse                 3,00
Totalt                   180,20
Kort                     180,20
Moms 12%                  19,31`;

describe('parseReceipt', () => {
  it('extracts food items and skips noise', () => {
    const items = parseReceipt(ICA);
    expect(items.map((i) => i.name)).toEqual(['Mjölk 3% 1,5l', 'Kycklingfilé 900g', 'Banan', 'Yoghurt naturell']);
  });

  it('reads quantity and weight lines', () => {
    const items = parseReceipt(ICA);
    expect(items.find((i) => i.name === 'Banan')).toMatchObject({ quantity: 0.812, unit: 'kg' });
    expect(items.find((i) => i.name.startsWith('Yoghurt'))?.quantity).toBe(2);
  });

  it('stops at the total', () => {
    const items = parseReceipt('Ost 31,90\nTOTALT 31,90\nLimpa 25,00');
    expect(items.map((i) => i.name)).toEqual(['Ost']);
  });

  it('merges repeated lines', () => {
    const items = parseReceipt('Gurka 14,90\nGurka 14,90');
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });
});
