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

const ICA_DIGITAL = `Beskrivning   Artikelnummer   Pris   Mängd   Summa(SEK)
Cornichon   2239093   18,85   1,00 st   18,85
Dip Tex Mex Style   1129858   27,90   1,00 st   27,90
Garlic Salsa   1519342   21,65   1,00 st   21,65
Kebabsås Het   2150968   28,30   1,00 st   28,30
Nacho Chips Origi   2126537   12,20   1,00 st   12,20
Pappkasse små 32L   2676622   4,00   1,00 st   4,00
Standmjölk 3% ESL   1520783   16,50   2,00 st   33,00
Tortilla Original   2043890   15,10   1,00 st   15,10
Betalat   161,00
Moms %   Moms   Netto   Brutto
6,00   8,89   148,11   157,00
25,00   0,80   3,20   4,00
Erhållen rabatt   0,00
Avrundning   0,00
Kort   161,00
Betalningsinformation`;

describe('parseReceipt – digital table receipts', () => {
  it('drops article numbers and reads the quantity column', () => {
    const items = parseReceipt(ICA_DIGITAL);
    expect(items.map((i) => i.name)).toEqual([
      'Cornichon', 'Dip Tex Mex Style', 'Garlic Salsa', 'Kebabsås Het', 'Nacho Chips Origi', 'Standmjölk 3% ESL', 'Tortilla Original',
    ]);
    expect(items.find((i) => i.name.startsWith('Standmjölk'))).toMatchObject({ quantity: 2, unit: 'st', price: 33 });
  });

  it('handles tab-separated text and weighed goods', () => {
    const items = parseReceipt('Bananer\t1234567\t24,90\t0,812 kg\t20,22');
    expect(items[0]).toMatchObject({ name: 'Bananer', quantity: 0.812, unit: 'kg' });
  });

  it('strips a trailing article number from plain lines', () => {
    expect(parseReceipt('Gurka 2239093   14,90')[0].name).toBe('Gurka');
  });
});

// Real Tesseract output for the ICA receipt above – decimal commas get lost.
const ICA_OCR = `Beskrivning Artikelnummer Pris Mängd  Summa(SEK)
Cornichon 2239093 18,85 1,00 st 18,85
Dip Tex Mex Style 1129858 2790 1,00 st 27,9
Garlic Salsa 1519342 2165 1.00st 2165
Kebabsås Het 2150068 2830 1.00st 2830
Nacho Chips Origi 2126537 1220 1.00st 12,20
Pappkasse små 321. 2676622 4,00 1,00 st 4,00
Standmjölk 3% ESL 1520783 16.50 200st 33,00
Tortilla Original 2043890 15,10 1.00st 15,10
Betalat 161,00
Moms % Moms Netto Brutto
600 889 148,11 157,00`;

describe('parseReceipt – noisy OCR of a digital receipt', () => {
  it('recovers names, quantities and totals', () => {
    const items = parseReceipt(ICA_OCR);
    expect(items).toHaveLength(7);
    expect(items.find((i) => i.name === 'Garlic Salsa')).toMatchObject({ quantity: 1, price: 21.65 });
    expect(items.find((i) => i.name.startsWith('Standmjölk'))).toMatchObject({ quantity: 2, price: 33 });
  });
});
