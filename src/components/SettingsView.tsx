import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { useAppState } from '../lib/store';
import type { AppState } from '../lib/types';
import { requestPermission } from '../lib/notifications';

type App = ReturnType<typeof useAppState>;

export default function SettingsView({ app }: { app: App }) {
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
        const data = JSON.parse(await file.text()) as AppState;
        if (!Array.isArray(data.items) || !Array.isArray(data.shopping)) throw new Error();
        app.replaceAll({ ...data, settings: { ...settings, ...data.settings } });
        setMsg(`Importerade ${data.items.length} varor.`);
      } catch {
        setMsg('Filen kunde inte läsas.');
      }
    };
    input.click();
  };

  return (
    <div className="settings">
      <section className="panel">
        <h3>Notiser</h3>
        <label className="check">
          <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => enable(e.target.checked)} />
          Daglig påminnelse om varor som går ut
        </label>
        <label>
          Tid för påminnelse
          <input type="time" value={settings.notifyTime} onChange={(e) => app.updateSettings({ notifyTime: e.target.value || '08:00' })} />
        </label>
        <label>
          Varna antal dagar innan
          <input type="number" min="0" max="14" value={settings.warnDays} onChange={(e) => app.updateSettings({ warnDays: Math.max(0, Number(e.target.value)) })} />
        </label>
        {!Capacitor.isNativePlatform() && (
          <p className="muted">I webbläsaren visas påminnelsen när appen öppnas. I Android-appen kommer den även när appen är stängd.</p>
        )}
      </section>

      <section className="panel">
        <h3>Data</h3>
        <p className="muted">All data sparas lokalt på enheten. Exportera för backup eller för att flytta mellan telefon och webb.</p>
        <div className="row">
          <button className="secondary" onClick={exportData}>Exportera</button>
          <button className="secondary" onClick={importData}>Importera</button>
        </div>
      </section>

      {msg && <p className="error">{msg}</p>}
      <p className="muted center">MatStatus 0.1.0</p>
    </div>
  );
}
