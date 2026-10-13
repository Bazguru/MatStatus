import { useState } from 'react';
import { LOCATIONS, type FoodItem, type Location } from '../lib/types';
import { pickPhoto, recognizeText } from '../lib/ocr';
import { parseReceipt } from '../lib/receiptParser';
import { estimateExpiry, matchRule } from '../lib/shelfLife';
import { today } from '../lib/dates';
import ExpiryScanButton from './ExpiryScanButton';

type Draft = Omit<FoodItem, 'id'> & { include: boolean; key: number };

interface Props {
  onSave: (items: Omit<FoodItem, 'id'>[]) => void;
  onClose: () => void;
}

function toDraft(name: string, quantity: number, unit: string, key: number): Draft {
  const rule = matchRule(name);
  const added = today();
  return {
    key,
    include: true,
    name,
    quantity,
    unit,
    location: rule.defaultLocation,
    category: rule.category,
    addedAt: added,
    expiresAt: estimateExpiry(rule, rule.defaultLocation, added),
    expirySource: 'estimated',
    opened: false,
  };
}

export default function ReceiptScan({ onSave, onClose }: Props) {
  const [stage, setStage] = useState<'start' | 'reading' | 'review'>('start');
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [rawText, setRawText] = useState('');

  const fromText = (text: string) => {
    setRawText(text);
    const parsed = parseReceipt(text);
    if (parsed.length === 0) {
      setError('Hittade inga varor på kvittot. Prova en skarpare bild med kvittot rakt och väl belyst.');
      setStage('start');
      return;
    }
    setRows(parsed.map((p, i) => toDraft(p.name, p.quantity, p.unit, i)));
    setStage('review');
  };

  const scan = async () => {
    setError(null);
    const photo = await pickPhoto();
    if (!photo) return;
    setStage('reading');
    setProgress(0);
    try {
      fromText(await recognizeText(photo, setProgress));
    } catch {
      setError('Kunde inte läsa kvittot. Första skanningen kräver internet för att hämta textigenkänningen.');
      setStage('start');
    }
  };

  const update = (key: number, patch: Partial<Draft>) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.location && next.expirySource === 'estimated') {
          next.expiresAt = estimateExpiry(matchRule(next.name), next.location, next.addedAt);
        }
        return next;
      }),
    );

  const addRow = () => setRows((rs) => [...rs, toDraft('', 1, 'st', Date.now())]);

  const chosen = rows.filter((r) => r.include && r.name.trim());

  const save = () =>
    onSave(chosen.map(({ include: _i, key: _k, ...item }) => ({ ...item, name: item.name.trim() })));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Skanna kvitto</h2>
          <button className="icon" onClick={onClose} aria-label="Stäng">×</button>
        </header>

        {stage === 'start' && (
          <>
            <p>Fota kvittot rakt uppifrån i bra ljus. Varorna läses av och får ett <b>uppskattat bäst före-datum</b> utifrån varutyp – du kan sedan fota datumet på förpackningar där det spelar roll (kött, fisk, mejeri).</p>
            <button className="primary big" onClick={scan}>📷 Fota / välj kvitto</button>
            {error && <p className="error">{error}</p>}
            <details>
              <summary>Klistra in kvittotext istället</summary>
              <p className="muted">Fungerar med digitala kvitton (t.ex. från ICA- eller Coop-appen).</p>
              <textarea rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={'MJÖLK 3% 1,5L   17,95\nKYCKLINGFILÉ 900G   89,00'} />
              <button className="secondary" disabled={!pasted.trim()} onClick={() => fromText(pasted)}>Tolka text</button>
            </details>
          </>
        )}

        {stage === 'reading' && (
          <div className="reading">
            <p>Läser kvittot… {Math.round(progress * 100)}%</p>
            <div className="bar"><div style={{ width: `${progress * 100}%` }} /></div>
          </div>
        )}

        {stage === 'review' && (
          <>
            <p className="muted">Kontrollera varorna. Bocka ur det som inte är mat. Datum markerade <em className="tag ghost">ca</em> är uppskattade.</p>
            <ul className="review">
              {rows.map((r) => (
                <li key={r.key} className={r.include ? '' : 'off'}>
                  <div className="row">
                    <input type="checkbox" checked={r.include} onChange={(e) => update(r.key, { include: e.target.checked })} aria-label="Ta med" />
                    <input className="grow" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Varunamn" />
                    <input className="qty" type="number" min="0" step="any" value={r.quantity} onChange={(e) => update(r.key, { quantity: Number(e.target.value) })} aria-label="Antal" />
                  </div>
                  <div className="row">
                    <select value={r.location} onChange={(e) => update(r.key, { location: e.target.value as Location })} aria-label="Plats">
                      {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.icon} {l.label}</option>)}
                    </select>
                    <input className="grow" type="date" value={r.expiresAt} onChange={(e) => update(r.key, { expiresAt: e.target.value, expirySource: 'manual' })} aria-label="Bäst före" />
                    {r.expirySource === 'estimated' && <em className="tag ghost">ca</em>}
                    <ExpiryScanButton compact onDate={(iso) => update(r.key, { expiresAt: iso, expirySource: 'scanned' })} />
                  </div>
                </li>
              ))}
            </ul>
            <button className="link" onClick={addRow}>+ Lägg till rad</button>
            {rawText && (
              <details>
                <summary>Visa avläst text</summary>
                <pre className="raw">{rawText}</pre>
              </details>
            )}
            <footer className="modal-foot">
              <button className="primary" disabled={chosen.length === 0} onClick={save}>
                Lägg in {chosen.length} varor
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
