import { useEffect, useState } from 'react';
import { useAppState } from './lib/store';
import { rescheduleNotifications, showWebSummaryIfDue } from './lib/notifications';
import { listenForSharedReceipts } from './lib/shareReceiver';
import type { ReceiptFile } from './lib/receiptFile';
import type { FoodItem } from './lib/types';
import InventoryView from './components/InventoryView';
import ShoppingView from './components/ShoppingView';
import SettingsView from './components/SettingsView';
import ItemForm from './components/ItemForm';
import ReceiptScan from './components/ReceiptScan';
import Icon, { type IconName } from './components/Icon';

type Tab = 'hemma' | 'inkop' | 'installningar';
type Modal = { kind: 'new' } | { kind: 'edit'; item: FoodItem } | { kind: 'receipt'; file?: ReceiptFile } | null;

const TABS: { id: Tab; label: string; icon: IconName; title: string }[] = [
  { id: 'hemma', label: 'Hemma', icon: 'home', title: 'Hemma' },
  { id: 'inkop', label: 'Inköp', icon: 'cart', title: 'Inköpslistor' },
  { id: 'installningar', label: 'Inställningar', icon: 'settings', title: 'Inställningar' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'God morgon';
  if (h < 17) return 'Hej';
  return 'God kväll';
}

function todayLabel(): string {
  const s = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function App() {
  const app = useAppState();
  const { state } = app;
  const [tab, setTab] = useState<Tab>('hemma');
  const [modal, setModal] = useState<Modal>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    rescheduleNotifications(state.items, state.settings);
    showWebSummaryIfDue(state.items, state.settings);
  }, [state.items, state.settings]);

  useEffect(
    () =>
      listenForSharedReceipts((file) => {
        setTab('hemma');
        setModal({ kind: 'receipt', file });
      }),
    [],
  );

  const openShopping = state.lists.reduce((n, l) => n + l.items.filter((i) => !i.done).length, 0);
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="app">
      <header className={`topbar ${tab === 'hemma' ? 'tall' : ''}`}>
        {tab === 'hemma' ? (
          <>
            <p className="eyebrow">{todayLabel()}</p>
            <h1>{greeting()}!</h1>
          </>
        ) : (
          <h1>{current.title}</h1>
        )}
      </header>

      <main className={`content ${tab === 'hemma' ? 'overlap' : ''}`}>
        {tab === 'hemma' && <InventoryView app={app} onEdit={(item) => setModal({ kind: 'edit', item })} />}
        {tab === 'inkop' && <ShoppingView app={app} />}
        {tab === 'installningar' && <SettingsView app={app} />}
      </main>

      {tab === 'hemma' && (
        <>
          {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
          <div className="fab-wrap">
            {menuOpen && (
              <div className="fab-menu">
                <button onClick={() => { setMenuOpen(false); setModal({ kind: 'receipt' }); }}>
                  <Icon name="receipt" /> Lägg in kvitto
                </button>
                <button onClick={() => { setMenuOpen(false); setModal({ kind: 'new' }); }}>
                  <Icon name="pencil" /> Lägg till vara
                </button>
              </div>
            )}
            <button className={`fab ${menuOpen ? 'open' : ''}`} aria-label="Lägg till" onClick={() => setMenuOpen((o) => !o)}>
              <Icon name="plus" size={28} />
            </button>
          </div>
        </>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); setMenuOpen(false); }}>
            <span className="tab-icon">
              <Icon name={t.icon} />
              {t.id === 'inkop' && openShopping > 0 && <b className="badge">{openShopping}</b>}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {modal?.kind === 'new' && (
        <ItemForm onClose={() => setModal(null)} onSave={(item) => { app.addItems([item]); setModal(null); }} />
      )}
      {modal?.kind === 'edit' && (
        <ItemForm
          initial={modal.item}
          onClose={() => setModal(null)}
          onSave={(item) => { app.updateItem(modal.item.id, item); setModal(null); }}
          onDelete={(toShopping) => { app.removeItem(modal.item.id, toShopping); setModal(null); }}
        />
      )}
      {modal?.kind === 'receipt' && (
        <ReceiptScan initialFile={modal.file} onClose={() => setModal(null)} onSave={(items) => { app.addItems(items); setModal(null); }} />
      )}
    </div>
  );
}
