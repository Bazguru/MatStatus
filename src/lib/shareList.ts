import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import type { ShoppingList } from './types';

/** Plain-text version of a list, for SMS and other messaging apps. */
export function formatList(list: ShoppingList): string | null {
  const open = list.items.filter((i) => !i.done);
  if (open.length === 0) return null;
  const lines = open.map((i) => {
    const qty = i.quantity > 1 || i.unit !== 'st' ? ` (${i.quantity} ${i.unit})` : '';
    return `• ${i.name}${qty}`;
  });
  return `🛒 ${list.name}\n\n${lines.join('\n')}\n\nSkickat från MatStatus`;
}

/** Opens the SMS app with the list filled in; the user picks the recipient. */
export function smsUrl(text: string, ios = /iPad|iPhone|iPod/.test(navigator.userAgent)): string {
  // iOS uses "&body=", everyone else "?body=".
  return `sms:${ios ? '&' : '?'}body=${encodeURIComponent(text)}`;
}

export function sendAsSms(text: string): void {
  // A link click is handed to Android's SMS app by the Capacitor WebView.
  const a = document.createElement('a');
  a.href = smsUrl(text);
  a.click();
}

/** System share sheet (SMS, WhatsApp, Messenger, mail …); copies to the clipboard where sharing is unavailable. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: 'Dela inköpslistan' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (err) {
    // The user closing the share sheet is not an error.
    if (err instanceof Error && /cancel|abort/i.test(err.message + err.name)) return 'shared';
    return 'failed';
  }
}
