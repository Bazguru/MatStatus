import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { normalizeState, type AppStore } from '../lib/store';
import { requestPermission } from '../lib/notifications';
import Icon from './Icon';

export default function SettingsView({ app }: { app: AppStore }) {
  const { settings } = app.state;
  const [msg, setMsg] = useState<string | null>(null);

  const enable = async (on: boolean) => {
    if (on) {
      const ok = await requestPermission();
      if (!ok) {
        setMsg('Notiser är blockerade. Tillåt dem i telefonens inställningar.');
        return;
      }
    }
    setMsg(null);
    app.updateSettings({ notificationsEnabled: on });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(app.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matstatus-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.items)) throw new Error();
        const next = normalizeState(data);
        app.replaceAll(next);
        setMsg(`Importerade ${next.items.length} varor och ${next.lists.length} listor.`);
      } catch {
        setMsg('Filen kunde inte läsas.');
      }
    };
    input.click();
  };

  return (
    <div className="settings">
      <section className="panel">
        <h3><Icon name="bell" size={20} /> Påminnelser</h3>
        <label className="switch-row">
          <span>
            Daglig påminnelse
            <small className="muted">Om varor som snart går ut</small>
          </span>
          <input type="checkbox" className="switch" checked={settings.notificationsEnabled} onChange={(e) => enable(e.target.checked)} />
        </label>
        <div className="row">
          <label className="grow">
            Tid
            <input type="time" value={settings.notifyTime} onChange={(e) => app.updateSettings({ notifyTime: e.target.value || '08:00' })} />
          </label>
          <label className="grow">
            Dagar innan
            <input type="number" min="0" max="14" value={settings.warnDays} onChange={(e) => app.updateSettings({ warnDays: Math.max(0, Number(e.target.value)) })} />
          </label>
        </div>
        {!Capacitor.isNativePlatform() && (
          <p className="muted">I webbläsaren visas påminnelsen när appen öppnas. I Android-appen kommer den även när appen är stängd.</p>
        )}
      </section>

      <section className="panel">
        <h3><Icon name="download" size={20} /> Säkerhetskopia</h3>
        <p className="muted">Allt sparas på telefonen. Exportera för backup eller för att flytta mellan telefon och webb.</p>
        <div className="row">
          <button className="secondary grow" onClick={exportData}><Icon name="download" size={18} /> Exportera</button>
          <button className="secondary grow" onClick={importData}><Icon name="upload" size={18} /> Importera</button>
        </div>
      </section>

      {msg && <p className="notice">{msg}</p>}
      <p className="muted center">MatStatus 0.2.0</p>
    </div>
  );
}
