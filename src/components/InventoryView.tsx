import { useMemo, useState } from 'react';
import type { AppStore } from '../lib/store';
import { LOCATIONS, type FoodItem, type Location } from '../lib/types';
import { daysUntil, describeExpiry, expiryStatus, type ExpiryStatus } from '../lib/dates';
import Icon from './Icon';

const GROUPS: { id: 'expired' | 'soon' | 'ok'; title: string }[] = [
  { id: 'expired', title: 'Utgånget' },
  { id: 'soon', title: 'Ät snart' },
  { id: 'ok', title: 'I lager' },
];

function groupOf(status: ExpiryStatus): 'expired' | 'soon' | 'ok' {
  if (status === 'expired') return 'expired';
  if (status === 'ok') return 'ok';
  return 'soon';
}

function DaysBadge({ iso, status }: { iso: string; status: ExpiryStatus }) {
  const d = daysUntil(iso);
  let big: string;
  let small: string;
  if (d < 0) { big = String(-d); small = -d === 1 ? 'dag sen' : 'dgr sen'; }
  else if (d === 0) { big = '!'; small = 'idag'; }
  else if (d < 100) { big = String(d); small = d === 1 ? 'dag' : 'dagar'; }
  else { big = String(Math.round(d / 30)); small = 'mån'; }
  return (
    <span className={`days days-${status}`}>
      <strong>{big}</strong>
      <small>{small}</small>
    </span>
  );
}

export default function InventoryView({ app, onEdit }: { app: AppStore; onEdit: (item: FoodItem) => void }) {
  const { items, settings } = app.state;
  const [filter, setFilter] = useState<Location | 'alla'>('alla');
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () =>
      items
        .filter((i) => filter === 'alla' || i.location === filter)
        .filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
    [items, filter, query],
  );

  const counts = useMemo(() => {
    const c = { expired: 0, soon: 0 };
    for (const i of items) {
      const g = groupOf(expiryStatus(i.expiresAt, settings.warnDays));
      if (g !== 'ok') c[g]++;
    }
    return c;
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
          <span>ät snart</span>
        </div>
        <div className={`stat ${counts.expired ? 'bad' : ''}`}>
          <strong>{counts.expired}</strong>
          <span>utgångna</span>
        </div>
      </section>

      <label className="search">
        <Icon name="search" size={18} />
        <input placeholder="Sök bland dina varor" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      <div className="chips">
        <button className={filter === 'alla' ? 'on' : ''} onClick={() => setFilter('alla')}>
          Alla <span className="count">{items.length}</span>
        </button>
        {LOCATIONS.map((l) => (
          <button key={l.id} className={filter === l.id ? 'on' : ''} onClick={() => setFilter(l.id)}>
            <Icon name={l.icon} size={16} /> {l.label} <span className="count">{items.filter((i) => i.location === l.id).length}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <div className="empty-art"><Icon name="fridge" size={40} /></div>
          <h3>{items.length === 0 ? 'Kylen är tom' : 'Inga träffar'}</h3>
          <p className="muted">
            {items.length === 0 ? <>Tryck på <b>+</b> för att lägga in ett kvitto eller en vara.</> : 'Prova ett annat filter eller sökord.'}
          </p>
        </div>
      ) : (
        GROUPS.map((g) => {
          const rows = visible.filter((i) => groupOf(expiryStatus(i.expiresAt, settings.warnDays)) === g.id);
          if (rows.length === 0) return null;
          return (
            <section key={g.id} className="group">
              <h2 className={`group-title group-${g.id}`}>{g.title} <span>{rows.length}</span></h2>
              <ul className="list">
                {rows.map((item) => {
                  const status = expiryStatus(item.expiresAt, settings.warnDays);
                  const loc = LOCATIONS.find((l) => l.id === item.location)!;
                  return (
                    <li key={item.id} className="card">
                      <button className="card-main" onClick={() => onEdit(item)}>
                        <DaysBadge iso={item.expiresAt} status={status} />
                        <span className="card-text">
                          <span className="card-title">{item.name}</span>
                          <span className="card-sub">
                            <Icon name={loc.icon} size={14} /> {loc.label} · {item.quantity} {item.unit}
                            {item.opened && <em className="tag">öppnad</em>}
                          </span>
                          <span className="card-exp">
                            {describeExpiry(item.expiresAt)}
                            {item.expirySource === 'estimated' && <em className="tag ghost" title="Uppskattat datum – tryck för att ändra">ca</em>}
                          </span>
                        </span>
                      </button>
                      <div className="card-actions">
                        <button aria-label="Använd en" title="Använd en" onClick={() => decrement(item)}>
                          <Icon name="minus" size={18} />
                        </button>
                        <button aria-label="Slut – lägg på inköpslistan" title="Slut – lägg på inköpslistan" onClick={() => app.removeItem(item.id, true)}>
                          <Icon name="cart" size={18} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
