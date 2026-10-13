import { useState } from 'react';
import { LOCATIONS, type ExpirySource, type FoodItem, type Location } from '../lib/types';
import { CATEGORIES, estimateExpiry, matchRule, ruleForCategory } from '../lib/shelfLife';
import { today } from '../lib/dates';
import ExpiryScanButton from './ExpiryScanButton';
import Icon from './Icon';

type Draft = Omit<FoodItem, 'id'>;

interface Props {
  initial?: FoodItem;
  onSave: (item: Draft) => void;
  onClose: () => void;
  onDelete?: (addToShopping: boolean) => void;
}

const UNITS = ['st', 'förp', 'kg', 'g', 'l', 'dl'];

function blank(): Draft {
  const rule = matchRule('');
  return {
    name: '',
    quantity: 1,
    unit: 'st',
    location: rule.defaultLocation,
    category: rule.category,
    addedAt: today(),
    expiresAt: estimateExpiry(rule, rule.defaultLocation, today()),
    expirySource: 'estimated',
    opened: false,
  };
}

export default function ItemForm({ initial, onSave, onClose, onDelete }: Props) {
  const [d, setD] = useState<Draft>(() => (initial ? { ...initial } : blank()));
  const [categoryTouched, setCategoryTouched] = useState(!!initial);
  const [locationTouched, setLocationTouched] = useState(!!initial);

  /** Re-estimate the date as long as the user hasn't entered a real one. */
  const reestimate = (next: Draft): Draft => {
    if (next.expirySource !== 'estimated') return next;
    const from = next.opened ? today() : next.addedAt;
    return { ...next, expiresAt: estimateExpiry(ruleForCategory(next.category), next.location, from, next.opened) };
  };

  const setName = (name: string) => {
    let next = { ...d, name };
    if (!initial) {
      const rule = matchRule(name);
      if (!categoryTouched) next.category = rule.category;
      if (!locationTouched) next.location = rule.defaultLocation;
    }
    setD(reestimate(next));
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => reestimate({ ...prev, [key]: value }));

  const setExpiry = (iso: string, source: ExpirySource) => setD((prev) => ({ ...prev, expiresAt: iso, expirySource: source }));

  const useEstimate = () =>
    setD((prev) => reestimate({ ...prev, expirySource: 'estimated' }));

  const valid = d.name.trim().length > 0 && d.quantity > 0 && !!d.expiresAt;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ ...d, name: d.name.trim() });
        }}
      >
        <div className="grabber" />
        <header className="modal-head">
          <h2>{initial ? 'Ändra vara' : 'Ny vara'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng"><Icon name="close" /></button>
        </header>

        <label>
          Namn
          <input autoFocus={!initial} value={d.name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Mjölk 1,5 l" />
        </label>

        <div className="row">
          <label className="grow">
            Antal
            <input type="number" inputMode="decimal" min="0" step="any" value={d.quantity} onChange={(e) => set('quantity', Number(e.target.value))} />
          </label>
          <label>
            Enhet
            <select value={d.unit} onChange={(e) => set('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="seg">
          <legend>Plats</legend>
          {LOCATIONS.map((l) => (
            <button
              type="button"
              key={l.id}
              className={d.location === l.id ? 'on' : ''}
              onClick={() => { setLocationTouched(true); set('location', l.id as Location); }}
            >
              <Icon name={l.icon} size={18} /> {l.label}
            </button>
          ))}
        </fieldset>

        <label>
          Kategori
          <select value={d.category} onChange={(e) => { setCategoryTouched(true); set('category', e.target.value); }}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label className="check">
          <input type="checkbox" checked={d.opened} onChange={(e) => set('opened', e.target.checked)} />
          Öppnad förpackning
        </label>

        <label>
          Bäst före
          <div className="row">
            <input className="grow" type="date" value={d.expiresAt} onChange={(e) => setExpiry(e.target.value, 'manual')} />
            <ExpiryScanButton onDate={(iso) => setExpiry(iso, 'scanned')} />
          </div>
          <small className="muted">
            {d.expirySource === 'estimated' && 'Uppskattat utifrån varutyp och plats. Fota eller skriv in datumet på förpackningen för exakt datum.'}
            {d.expirySource === 'scanned' && 'Avläst från förpackningen – kontrollera att det stämmer. '}
            {d.expirySource === 'manual' && 'Inmatat datum. '}
            {d.expirySource !== 'estimated' && <button type="button" className="link" onClick={useEstimate}>Använd uppskattning</button>}
          </small>
        </label>

        <footer className="modal-foot">
          {onDelete && (
            <div className="row">
              <button type="button" className="secondary" onClick={() => onDelete(true)}><Icon name="cart" size={18} /> Slut – handla</button>
              <button type="button" className="danger" onClick={() => onDelete(false)}><Icon name="trash" size={18} /> Kasta</button>
            </div>
          )}
          <button type="submit" className="primary" disabled={!valid}>Spara</button>
        </footer>
      </form>
    </div>
  );
}
