/**
 * Turns OCR text from a Swedish grocery receipt (ICA, Coop, Willys, Lidl, Hemköp …)
 * into candidate food items. OCR output is noisy, so the parser is lenient and
 * the result is always shown to the user for confirmation before saving.
 */
export interface ReceiptLine {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
}

const PRICE_AT_END = /^(.*?[A-Za-zÅÄÖåäöÉé].*?)\s+(-?\d{1,5}[.,]\d{2})\s*(?:kr)?\s*[A-Z*]?$/;

// "2 st * 12,90", "2st x 12.90", "3 ST*14,95"
const QTY_LINE = /^(\d{1,3})\s*(?:st|x)?\s*[*x×]\s*\d+[.,]\d{2}/i;
// "0,512 kg * 39,90 kr/kg"
const WEIGHT_LINE = /^(\d+[.,]\d{1,3})\s*kg\s*[*x×@]/i;

/** Lines that are never products. Checked against the lower-cased line. */
const NOISE = [
  'totalt', 'total', 'summa', 'att betala', 'moms', 'netto', 'brutto', 'kort', 'betalat', 'betalning',
  'kontant', 'växel', 'vaxel', 'rabatt', 'erhållen', 'erhallen', 'pant', 'bonus', 'medlem', 'poäng', 'poang',
  'kvitto', 'org nr', 'orgnr', 'org.nr', 'kassa', 'kassör', 'kassor', 'tel', 'www', 'tack', 'välkommen',
  'valkommen', 'öppet', 'oppet', 'swish', 'visa', 'mastercard', 'debit', 'ref', 'term', 'butik',
  'avrundning', 'öresavrundning', 'spara', 'sparat', 'återköp', 'aterkop', 'kundnr', 'personal',
  'plastkasse', 'bärkasse', 'barkasse', 'kasse', 'mottaget', 'antal varor', 'datum', 'tid ',
];

/** Once one of these appears, the item list is over. */
const END_MARKERS = ['totalt', 'summa', 'att betala', 'total '];

function isNoise(line: string): boolean {
  const l = line.toLowerCase();
  return NOISE.some((w) => l.includes(w));
}

function cleanName(raw: string): string {
  let n = raw
    .replace(/^[*#\-+.\s]+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[|_]+/g, ' ')
    .trim();
  // Drop article numbers some stores print in front of the name.
  n = n.replace(/^\d{4,}\s+/, '');
  // Title-case shouting receipts: "MJÖLK 3% 1,5L" -> "Mjölk 3% 1,5l"
  if (n === n.toUpperCase()) {
    n = n.charAt(0) + n.slice(1).toLowerCase();
  }
  return n.trim();
}

function parsePrice(p: string): number {
  return Number(p.replace(',', '.'));
}

export function parseReceipt(text: string): ReceiptLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ReceiptLine[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (items.length > 0 && END_MARKERS.some((m) => lower.startsWith(m))) break;

    const qty = line.match(QTY_LINE);
    if (qty && items.length > 0) {
      items[items.length - 1].quantity = Number(qty[1]);
      continue;
    }
    const weight = line.match(WEIGHT_LINE);
    if (weight && items.length > 0) {
      const last = items[items.length - 1];
      last.quantity = Number(weight[1].replace(',', '.'));
      last.unit = 'kg';
      continue;
    }

    const m = line.match(PRICE_AT_END);
    if (!m) continue;
    if (isNoise(line)) continue;

    const price = parsePrice(m[2]);
    // Negative amounts are discounts/refunds, not products.
    if (price < 0) continue;

    const name = cleanName(m[1]);
    const letters = name.replace(/[^A-Za-zÅÄÖåäöÉé]/g, '');
    if (letters.length < 3) continue;

    // "2st Mjölk" style quantity prefix
    let quantity = 1;
    let finalName = name;
    const prefix = name.match(/^(\d{1,2})\s*(?:st|x)\s+(.+)$/i);
    if (prefix) {
      quantity = Number(prefix[1]);
      finalName = prefix[2];
    }

    items.push({ name: finalName, quantity, unit: 'st', price });
  }

  return mergeDuplicates(items);
}

function mergeDuplicates(items: ReceiptLine[]): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  for (const it of items) {
    const existing = out.find((o) => o.name.toLowerCase() === it.name.toLowerCase() && o.unit === it.unit);
    if (existing && it.unit === 'st') {
      existing.quantity += it.quantity;
      existing.price = (existing.price ?? 0) + (it.price ?? 0);
    } else {
      out.push({ ...it });
    }
  }
  return out;
}
