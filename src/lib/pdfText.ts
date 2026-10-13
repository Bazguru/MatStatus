/**
 * Rebuilds the visual lines of a PDF page from pdf.js text items. Digital
 * receipts (Kivra, ICA, Coop) are laid out as tables where each cell is a
 * separate text item, so items sharing a baseline are joined left-to-right
 * into one line that the receipt parser can read.
 */
export interface PositionedText {
  str: string;
  x: number;
  y: number;
}

export function itemsToLines(items: PositionedText[], tolerance = 3): string[] {
  const rows: { y: number; parts: PositionedText[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
    if (row) row.parts.push(item);
    else rows.push({ y: item.y, parts: [item] });
  }
  // PDF y grows upwards, so the top line has the largest y.
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) =>
    r.parts
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str.trim())
      .join('   '),
  );
}
