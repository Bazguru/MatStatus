import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { ReceiptFile } from './receiptFile';

/** Native side: android/app/src/main/java/se/matstatus/app/ShareReceiverPlugin.java */
interface ShareReceiverPlugin {
  consume(): Promise<{ file?: ReceiptFile }>;
  addListener(event: 'fileShared', cb: (file: ReceiptFile) => void): Promise<PluginListenerHandle>;
}

const ShareReceiver = registerPlugin<ShareReceiverPlugin>('ShareReceiver');

/**
 * Calls `onFile` when a receipt is shared to MatStatus from another app
 * (e.g. Kivra → Dela → MatStatus), both on cold start and while running.
 */
export function listenForSharedReceipts(onFile: (file: ReceiptFile) => void): () => void {
  if (Capacitor.getPlatform() !== 'android') return () => {};
  let handle: PluginListenerHandle | undefined;
  let stopped = false;
  ShareReceiver.addListener('fileShared', () => {
    // The event only signals; consume() hands over the file exactly once.
    ShareReceiver.consume().then((r) => r.file && onFile(r.file));
  }).then((h) => {
    if (stopped) h.remove();
    else handle = h;
  });
  ShareReceiver.consume().then((r) => r.file && onFile(r.file)).catch(() => {});
  return () => {
    stopped = true;
    handle?.remove();
  };
}
