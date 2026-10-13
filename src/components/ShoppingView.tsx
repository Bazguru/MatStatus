import { useState } from 'react';
import type { useAppState } from '../lib/store';
import { estimateExpiry, matchRule } from '../lib/shelfLife';
import { today } from '../lib/dates';

type App = ReturnType<typeof useAppState>;

export default function ShoppingView({ app }: { app: App }) {
  const { shopping } = app.state;
  const [name, setName] = useState('');

  const open = shopping.filter((s) => !s.done);
  const done = shopping.filter((s) => s.done);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    app.addShopping(n);
    setName('');
  };

  /** Bought items go straight into the inventory with estimated dates. */
  const stockBought = () => {
    const added = today();
    app.addItems(
      done.map((s) => {
        const rule = matchRule(s.name);
        return {
          name: s.name,
          quantity: s.quantity,
          unit: s.unit,
          location: rule.defaultLocation,
          category: rule.category,
          addedAt: added,
          expiresAt: estimateExpiry(rule, rule.defaultLocation, added),
          expirySource: 'estimated' as const,
          opened: false,
        };
      }),
    );
    app.clearDoneShopping();
  };

  return (
    <>
      <form className="add-row" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lägg till på listan…" />
        <button className="primary" disabled={!name.trim()}>Lägg till</button>
      </form>

      {shopping.length === 0 && (
        <div className="empty">
          <p>Inköpslistan är tom.</p>
          <p className="muted">När du markerar en vara som <b>Slut</b> hamnar den här automatiskt.</p>
        </div>
      )}

      <ul className="list">
        {open.map((s) => (
          <li key={s.id} className="shop">
            <label>
              <input type="checkbox" checked={false} onChange={() => app.updateShopping(s.id, { done: true })} />
              <span>{s.name}</span>
              {s.quantity > 1 && <small className="muted"> × {s.quantity}</small>}
            </label>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h3 className="section">Köpt ({done.length})</h3>
          <ul className="list">
            {done.map((s) => (
              <li key={s.id} className="shop done">
                <label>
                  <input type="checkbox" checked onChange={() => app.updateShopping(s.id, { done: false })} />
                  <span>{s.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="primary grow" onClick={stockBought}>Lägg in köpta hemma</button>
            <button className="secondary" onClick={app.clearDoneShopping}>Rensa</button>
          </div>
        </>
      )}
    </>
  );
}
