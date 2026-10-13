import { useMemo, useState } from 'react';
import type { useAppState } from '../lib/store';
import { LOCATIONS, type FoodItem, type Location } from '../lib/types';
import { describeExpiry, expiryStatus } from '../lib/dates';

type App = ReturnType<typeof useAppState>;

export default function InventoryView({ app, onEdit }: { app: App; onEdit: (item: FoodItem) => void }) {
  const { items, settings } = app.state;
  const [filter, setFilter] = useState<Location | 'alla'>('alla');
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () =>
      items
        .filter((i) => filter === 'alla' || i.location === filter)
        .filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
    [items, filter, query],
  );

  const counts = useMemo(() => {
    let expired = 0;
    let soon = 0;
    for (const i of items) {
      const s = expiryStatus(i.expiresAt, settings.warnDays);
      if (s === 'expired') expired++;
      else if (s === 'today' || s === 'soon') soon++;
    }
    return { expired, soon };
  }, [items, settings.warnDays]);

  const decrement = (item: FoodItem) => {
    if (item.quantity > 1) app.updateItem(item.id, { quantity: Math.round((item.quantity - 1) * 100) / 100 });
    else app.removeItem(item.id, true);
  };

  return (
    <>
      <section className="summary">
        <div className="stat">
          <strong>{items.length}</strong>
          <span>varor hemma</span>
        </div>
        <div className={`stat ${counts.soon ? 'warn' : ''}`}>
          <strong>{counts.soon}</strong>
          <span>går ut snart</span>
        </div>
        <div className={`stat ${counts.expired ? 'bad' : ''}`}>
          <strong>{counts.expired}</strong>
          <span>utgångna</span>
        </div>
      </section>

      <input className="search" placeholder="Sök vara…" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="chips">
        <button className={filter === 'alla' ? 'on' : ''} onClick={() => setFilter('alla')}>Alla</button>
        {LOCATIONS.map((l) => (
          <button key={l.id} className={filter === l.id ? 'on' : ''} onClick={() => setFilter(l.id)}>
            {l.icon} {l.label} ({items.filter((i) => i.location === l.id).length})
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <p>Inga varor här ännu.</p>
          <p className="muted">Tryck på <b>+</b> för att skanna ett kvitto eller lägga till en vara.</p>
        </div>
      ) : (
        <ul className="list">
          {sorted.map((item) => {
            const status = expiryStatus(item.expiresAt, settings.warnDays);
            const loc = LOCATIONS.find((l) => l.id === item.location)!;
            return (
              <li key={item.id} className={`card status-${status}`}>
                <button className="card-main" onClick={() => onEdit(item)}>
                  <span className="card-title">
                    {loc.icon} {item.name}
                    {item.opened && <em className="tag">öppnad</em>}
                  </span>
                  <span className="card-sub">
                    {item.quantity} {item.unit} · {item.category}
                  </span>
                  <span className="card-exp">
                    {describeExpiry(item.expiresAt)}
                    {item.expirySource === 'estimated' && <em className="tag ghost" title="Uppskattat datum – tryck för att ändra">ca</em>}
                  </span>
                </button>
                <div className="card-actions">
                  <button title="Använd en" onClick={() => decrement(item)}>−1</button>
                  <button title="Slut – lägg på inköpslistan" onClick={() => app.removeItem(item.id, true)}>Slut</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
