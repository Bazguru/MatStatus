import { describe, expect, it } from 'vitest';
import { itemsToLines } from '../src/lib/pdfText';
import { parseReceipt } from '../src/lib/receiptParser';
// Real pdf.js text items extracted from a Kivra-style ICA receipt PDF.
import items from './fixtures/kivra-pdf-items.json';

describe('PDF receipts', () => {
  it('rebuilds table rows from positioned text', () => {
    const lines = itemsToLines(items);
    expect(lines).toContain('Standmjölk 3% ESL   1520783   16,50   2,00 st   33,00');
  });

  it('parses a Kivra PDF end to end', () => {
    const parsed = parseReceipt(itemsToLines(items).join('\n'));
    expect(parsed.map((p) => [p.name, p.quantity])).toEqual([
      ['Cornichon', 1], ['Dip Tex Mex Style', 1], ['Garlic Salsa', 1], ['Kebabsås Het', 1],
      ['Nacho Chips Origi', 1], ['Standmjölk 3% ESL', 2], ['Tortilla Original', 1],
    ]);
  });
});
