import { toIso } from './dates';

/**
 * Finds the "bäst före" / "sista förbrukningsdag" date in OCR text from a
 * photo of a package. Packages often print several dates (packed, frozen,
 * best before), so a date right after an expiry keyword wins; otherwise the
 * latest plausible date is assumed to be the expiry date.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, may: 5, jun: 6, jul: 7, aug: 8,
  sep: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

const KEYWORDS = [
  'bäst före', 'bast fore', 'bäst fore', 'bast före', 'sista förbrukningsdag', 'sista forbrukningsdag',
  'förbrukas senast', 'forbrukas senast', 'best before', 'use by', 'exp', 'bf', 'b.f', 'bbe', 'mhd', 'parasta ennen',
];

interface Found {
  date: Date;
  index: number;
}

function valid(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1) return null;
  return dt;
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/** Normalise common OCR confusions inside digit groups (O→0, l/I→1, S→5, B→8). */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/(?<=\d)[o](?=\d)|(?<=\d)[o]\b|\b[o](?=\d)/g, '0')
    .replace(/(?<=\d)[il|](?=\d)/g, '1');
}

export function findDates(rawText: string, now: Date = new Date()): Found[] {
  const text = normalise(rawText);
  const found: Found[] = [];
  const push = (date: Date | null, index: number) => {
    if (date) found.push({ date, index });
  };

  let m: RegExpExecArray | null;

  // 2026-10-20, 2026.10.20, 2026/10/20
  const isoRe = /\b(20\d{2})[-./ ](\d{1,2})[-./ ](\d{1,2})\b/g;
  while ((m = isoRe.exec(text))) push(valid(+m[1], +m[2], +m[3]), m.index);

  // 20.10.2026, 20/10/26, 20-10-26
  const dmyRe = /\b(\d{1,2})[-./ ](\d{1,2})[-./ ](\d{2}|20\d{2})\b/g;
  while ((m = dmyRe.exec(text))) push(valid(fullYear(+m[3]), +m[2], +m[1]), m.index);

  // 20 okt 2026, 20 okt 26, 20okt
  const monRe = /\b(\d{1,2})\s?(jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)[a-z]*\.?\s?(\d{2,4})?\b/g;
  while ((m = monRe.exec(text))) {
    const y = m[3] ? fullYear(+m[3]) : inferYear(MONTHS[m[2]], +m[1], now);
    push(valid(y, MONTHS[m[2]], +m[1]), m.index);
  }

  // 20261020 or 201026 (compact, common on stamped labels)
  const compactRe = /\b(\d{6}|\d{8})\b/g;
  while ((m = compactRe.exec(text))) {
    const s = m[1];
    if (s.length === 8) {
      push(valid(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8)) ?? valid(+s.slice(4, 8), +s.slice(2, 4), +s.slice(0, 2)), m.index);
    } else {
      // Swedish labels use YYMMDD; DDMMYY is common on imports.
      push(valid(fullYear(+s.slice(0, 2)), +s.slice(2, 4), +s.slice(4, 6)) ?? valid(fullYear(+s.slice(4, 6)), +s.slice(2, 4), +s.slice(0, 2)), m.index);
    }
  }

  // 20.10 / 20/10 without a year
  const dmRe = /\b(\d{1,2})[./](\d{1,2})\b(?![./]\d)/g;
  while ((m = dmRe.exec(text))) {
    const d = +m[1];
    const mo = +m[2];
    push(valid(inferYear(mo, d, now), mo, d), m.index);
  }

  return found.filter((f) => plausible(f.date, now));
}

/** Without a printed year, pick this year unless that date is long gone. */
function inferYear(month: number, day: number, now: Date): number {
  const y = now.getFullYear();
  const candidate = new Date(y, month - 1, day);
  const ageDays = (now.getTime() - candidate.getTime()) / 86400000;
  return ageDays > 60 ? y + 1 : y;
}

function plausible(d: Date, now: Date): boolean {
  const diffDays = (d.getTime() - now.getTime()) / 86400000;
  return diffDays > -365 && diffDays < 365 * 5;
}

/** Best guess for the expiry date as YYYY-MM-DD, or null if none found. */
export function parseExpiryDate(rawText: string, now: Date = new Date()): string | null {
  const found = findDates(rawText, now);
  if (found.length === 0) return null;

  const lower = normalise(rawText);
  const keywordPositions: number[] = [];
  for (const kw of KEYWORDS) {
    const re = new RegExp(`(^|[^a-zåäö])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) keywordPositions.push(m.index + m[1].length + kw.length);
  }

  if (keywordPositions.length > 0) {
    let best: Found | null = null;
    let bestDist = Infinity;
    for (const f of found) {
      for (const k of keywordPositions) {
        const dist = f.index - k;
        if (dist >= 0 && dist < 40 && dist < bestDist) {
          best = f;
          bestDist = dist;
        }
      }
    }
    if (best) return toIso(best.date);
  }

  const latest = found.reduce((a, b) => (b.date > a.date ? b : a));
  return toIso(latest.date);
}
