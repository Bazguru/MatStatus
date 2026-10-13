import { useState } from 'react';
import { pickPhoto, recognizeText } from '../lib/ocr';
import { parseExpiryDate } from '../lib/expiryParser';

/** Photographs the "bäst före" label and reports the date found. */
export default function ExpiryScanButton({ onDate, compact }: { onDate: (iso: string) => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const scan = async () => {
    setMsg(null);
    const photo = await pickPhoto();
    if (!photo) return;
    setBusy(true);
    try {
      const text = await recognizeText(photo);
      const date = parseExpiryDate(text);
      if (date) {
        onDate(date);
        setMsg(null);
      } else {
        setMsg('Hittade inget datum – försök närmare eller skriv in det.');
      }
    } catch {
      setMsg('Kunde inte läsa bilden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="scan-date">
      <button type="button" className="secondary" onClick={scan} disabled={busy} title="Fota bäst före-datumet">
        {busy ? '⏳' : '📷'}{compact ? '' : busy ? ' Läser…' : ' Fota datum'}
      </button>
      {msg && <small className="error">{msg}</small>}
    </span>
  );
}
