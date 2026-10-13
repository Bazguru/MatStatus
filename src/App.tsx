import { useEffect, useState } from 'react';
import { useAppState } from './lib/store';
import { rescheduleNotifications, showWebSummaryIfDue } from './lib/notifications';
import type { FoodItem } from './lib/types';
import InventoryView from './components/InventoryView';
import ShoppingView from './components/ShoppingView';
import SettingsView from './components/SettingsView';
import ItemForm from './components/ItemForm';
import ReceiptScan from './components/ReceiptScan';

type Tab = 'hemma' | 'inkop' | 'installningar';
type Modal = { kind: 'new' } | { kind: 'edit'; item: FoodItem } | { kind: 'receipt' } | null;

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

  const openShopping = state.shopping.filter((s) => !s.done).length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>MatStatus</h1>
      </header>

      <main className="content">
        {tab === 'hemma' && <InventoryView app={app} onEdit={(item) => setModal({ kind: 'edit', item })} />}
        {tab === 'inkop' && <ShoppingView app={app} />}
        {tab === 'installningar' && <SettingsView app={app} />}
      </main>

      {tab === 'hemma' && (
        <div className="fab-wrap">
          {menuOpen && (
            <div className="fab-menu">
              <button onClick={() => { setMenuOpen(false); setModal({ kind: 'receipt' }); }}>🧾 Skanna kvitto</button>
              <button onClick={() => { setMenuOpen(false); setModal({ kind: 'new' }); }}>✏️ Lägg till vara</button>
            </div>
          )}
          <button className="fab" aria-label="Lägg till" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? '×' : '+'}
          </button>
        </div>
      )}

      <nav className="tabbar">
        <button className={tab === 'hemma' ? 'active' : ''} onClick={() => setTab('hemma')}>
          <span>🏠</span>Hemma
        </button>
        <button className={tab === 'inkop' ? 'active' : ''} onClick={() => setTab('inkop')}>
          <span>🛒</span>Inköp{openShopping > 0 && <b className="badge">{openShopping}</b>}
        </button>
        <button className={tab === 'installningar' ? 'active' : ''} onClick={() => setTab('installningar')}>
          <span>⚙️</span>Inställningar
        </button>
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
        <ReceiptScan onClose={() => setModal(null)} onSave={(items) => { app.addItems(items); setModal(null); }} />
      )}
    </div>
  );
}
