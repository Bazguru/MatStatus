/** "2 mjölk", "mjölk x2", "mjölk 2st" → { name: 'mjölk', quantity: 2 } */
export function parseEntry(raw: string): { name: string; quantity: number } {
  const t = raw.trim().replace(/\s+/g, ' ');
  let m = t.match(/^(\d{1,3})\s*(?:st|x)?\s+(.+)$/i);
  if (m) return { name: m[2], quantity: Number(m[1]) };
  m = t.match(/^(.+?)\s*(?:x\s*(\d{1,3})|(\d{1,3})\s*st)$/i);
  if (m) return { name: m[1], quantity: Number(m[2] ?? m[3]) };
  return { name: t, quantity: 1 };
}
