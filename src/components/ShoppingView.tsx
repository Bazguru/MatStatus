import { useMemo, useState } from 'react';
import type { AppStore } from '../lib/store';
import { estimateExpiry, matchRule } from '../lib/shelfLife';
import { expiryStatus, today } from '../lib/dates';
import { formatList, sendAsSms, shareText } from '../lib/shareList';
import { parseEntry } from '../lib/shoppingEntry';
import Icon from './Icon';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ShoppingView({ app }: { app: AppStore }) {
  const { lists, activeListId, items: inventory, settings } = app.state;
  const list = lists.find((l) => l.id === activeListId) ?? lists[0];
  const [entry, setEntry] = useState('');
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const open = list.items.filter((s) => !s.done);
  const done = list.items.filter((s) => s.done);

  // Things at home that are about to run out of date and aren't on the list yet.
  const suggestions = useMemo(() => {
    const onList = new Set(list.items.filter((i) => !i.done).map((i) => i.name.toLowerCase()));
    const seen = new Set<string>();
    return inventory
      .filter((i) => expiryStatus(i.expiresAt, settings.warnDays) !== 'ok')
      .map((i) => i.name)
      .filter((n) => {
        const k = n.toLowerCase();
        if (onList.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 6);
  }, [inventory, list.items, settings.warnDays]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, quantity } = parseEntry(entry);
    if (!name) return;
    app.addShopping(list.id, capitalize(name), quantity);
    setEntry('');
  };

  const newList = () => {
    const name = window.prompt('Namn på den nya listan', 'Veckohandling');
    if (name?.trim()) app.createList(name.trim());
  };

  const rename = () => {
    setMenu(false);
    const name = window.prompt('Nytt namn', list.name);
    if (name?.trim()) app.renameList(list.id, name.trim());
  };

  const remove = () => {
    setMenu(false);
    const msg = lists.length > 1 ? `Ta bort listan "${list.name}"?` : `Tömma listan "${list.name}"?`;
    if (window.confirm(msg)) app.deleteList(list.id);
  };

  const sms = () => {
    const text = formatList(list);
    if (!text) return flash('Listan är tom');
    sendAsSms(text);
  };

  const share = async () => {
    const text = formatList(list);
    if (!text) return flash('Listan är tom');
    const result = await shareText(list.name, text);
    if (result === 'copied') flash('Listan är kopierad – klistra in den var du vill');
    if (result === 'failed') flash('Kunde inte dela listan');
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
    app.clearDoneShopping(list.id);
    flash(`${done.length} varor inlagda hemma`);
  };

  return (
    <>
      <div className="chips lists">
        {lists.map((l) => (
          <button key={l.id} className={l.id === list.id ? 'on' : ''} onClick={() => app.setActiveList(l.id)}>
            {l.name} <span className="count">{l.items.filter((i) => !i.done).length}</span>
          </button>
        ))}
        <button className="ghost" onClick={newList}>
          <Icon name="plus" size={16} /> Ny lista
        </button>
      </div>

      <section className="panel list-head">
        <div className="list-title">
          <div>
            <h2>{list.name}</h2>
            <p className="muted">{open.length === 0 ? 'Inget kvar att handla' : `${open.length} kvar att handla`}</p>
          </div>
          <div className="menu-wrap">
            <button className="icon-btn" aria-label="Fler val" onClick={() => setMenu((m) => !m)}>
              <Icon name="more" />
            </button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={rename}><Icon name="pencil" size={18} /> Byt namn</button>
                <button className="danger-text" onClick={remove}><Icon name="trash" size={18} /> {lists.length > 1 ? 'Ta bort lista' : 'Töm lista'}</button>
              </div>
            )}
          </div>
        </div>
        <div className="row">
          <button className="primary grow" onClick={sms} disabled={open.length === 0}>
            <Icon name="sms" size={20} /> Skicka SMS
          </button>
          <button className="secondary grow" onClick={share} disabled={open.length === 0}>
            <Icon name="share" size={20} /> Dela
          </button>
        </div>
      </section>

      <form className="add-row" onSubmit={add}>
        <input value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Lägg till, t.ex. 2 mjölk" enterKeyHint="done" />
        <button className="primary square" aria-label="Lägg till" disabled={!entry.trim()}>
          <Icon name="plus" />
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="suggest">
          <span className="muted">Går ut snart hemma:</span>
          {suggestions.map((s) => (
            <button key={s} onClick={() => app.addShopping(list.id, s)}>
              <Icon name="plus" size={14} /> {s}
            </button>
          ))}
        </div>
      )}

      {list.items.length === 0 && (
        <div className="empty">
          <div className="empty-art"><Icon name="basket" size={40} /></div>
          <h3>Listan är tom</h3>
          <p className="muted">Skriv vad du behöver ovan. Varor du markerar som slut hemma hamnar här automatiskt.</p>
        </div>
      )}

      <ul className="list">
        {open.map((s) => (
          <li key={s.id} className="shop">
            <button className="tick" aria-label={`Bocka av ${s.name}`} onClick={() => app.updateShopping(list.id, s.id, { done: true })} />
            <span className="shop-name">{s.name}</span>
            {(s.quantity > 1 || s.unit !== 'st') && <span className="qty-pill">{s.quantity} {s.unit}</span>}
            <button className="icon-btn subtle" aria-label={`Ta bort ${s.name}`} onClick={() => app.removeShopping(list.id, s.id)}>
              <Icon name="close" size={18} />
            </button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h2 className="group-title">I korgen <span>{done.length}</span></h2>
          <ul className="list">
            {done.map((s) => (
              <li key={s.id} className="shop done">
                <button className="tick on" aria-label={`Ångra ${s.name}`} onClick={() => app.updateShopping(list.id, s.id, { done: false })}>
                  <Icon name="check" size={16} />
                </button>
                <span className="shop-name">{s.name}</span>
              </li>
            ))}
          </ul>
          <div className="row stack-gap">
            <button className="primary grow" onClick={stockBought}><Icon name="home" size={20} /> Lägg in köpta hemma</button>
            <button className="secondary" onClick={() => app.clearDoneShopping(list.id)}>Rensa</button>
          </div>
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
