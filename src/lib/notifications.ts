import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { FoodItem, Settings } from './types';
import { addDays, daysUntil, fromIso, today } from './dates';

const isNative = () => Capacitor.isNativePlatform();

export async function requestPermission(): Promise<boolean> {
  if (isNative()) {
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

function atTime(iso: string, hhmm: string): Date {
  const d = fromIso(iso);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function summaryFor(items: FoodItem[], day: string, warnDays: number): string | null {
  const expired = items.filter((i) => daysUntil(i.expiresAt, day) < 0);
  const soon = items.filter((i) => {
    const d = daysUntil(i.expiresAt, day);
    return d >= 0 && d <= warnDays;
  });
  if (expired.length === 0 && soon.length === 0) return null;
  const parts: string[] = [];
  if (soon.length) parts.push(`Snart utgånget: ${soon.map((i) => i.name).join(', ')}`);
  if (expired.length) parts.push(`Utgånget: ${expired.map((i) => i.name).join(', ')}`);
  return parts.join('. ');
}

/**
 * Plans one summary notification per day for the coming two weeks, based on
 * the current inventory. Called whenever the inventory or settings change, so
 * the schedule always reflects what is actually in the fridge.
 */
export async function rescheduleNotifications(items: FoodItem[], settings: Settings): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    if (!settings.notificationsEnabled || items.length === 0) return;

    const now = new Date();
    const start = today();
    const notifications = [];
    for (let i = 0; i < 14; i++) {
      const day = addDays(start, i);
      const at = atTime(day, settings.notifyTime);
      if (at <= now) continue;
      const body = summaryFor(items, day, settings.warnDays);
      if (!body) continue;
      notifications.push({
        id: 1000 + i,
        title: 'MatStatus – kolla kylen',
        body,
        schedule: { at, allowWhileIdle: true },
      });
    }
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.warn('Kunde inte schemalägga notiser', err);
  }
}

/** On the web there is no background scheduler; show today's summary once per day while the app is open. */
export function showWebSummaryIfDue(items: FoodItem[], settings: Settings): void {
  if (isNative() || !settings.notificationsEnabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const key = 'matstatus:lastWebNotice';
  const day = today();
  try {
    if (localStorage.getItem(key) === day) return;
    const body = summaryFor(items, day, settings.warnDays);
    if (!body) return;
    new Notification('MatStatus – kolla kylen', { body });
    localStorage.setItem(key, day);
  } catch {
    // ignore
  }
}
