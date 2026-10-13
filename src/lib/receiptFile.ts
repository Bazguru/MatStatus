import { itemsToLines, type PositionedText } from './pdfText';
import { recognizeText } from './ocr';

/** A receipt the user attached or shared into the app. */
export interface ReceiptFile {
  name?: string;
  mimeType: string;
  /** base64 without the data: prefix (files), or plain text for text/plain shares. */
  data: string;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function loadPdf(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs.getDocument({ data: bytes }).promise;
}

/**
 * Text from a PDF. Digital receipts carry a text layer, which is exact; a
 * scanned PDF without one is rendered to an image and run through OCR.
 */
async function pdfToText(bytes: Uint8Array, onProgress?: (p: number) => void): Promise<string> {
  const pdf = await loadPdf(bytes);
  const lines: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items: PositionedText[] = [];
    for (const it of content.items) {
      if ('str' in it) items.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
    }
    lines.push(...itemsToLines(items));
  }
  if (lines.join('').replace(/\s/g, '').length > 20) return lines.join('\n');

  // No text layer – OCR each page.
  const texts: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
    texts.push(await recognizeText(canvas.toDataURL('image/png'), (p) => onProgress?.((n - 1 + p) / pdf.numPages)));
  }
  return texts.join('\n');
}

export async function receiptFileToText(file: ReceiptFile, onProgress?: (p: number) => void): Promise<string> {
  const type = file.mimeType.toLowerCase();
  if (type.startsWith('text/')) return file.data;
  if (type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
    return pdfToText(base64ToBytes(file.data), onProgress);
  }
  if (type.startsWith('image/')) {
    return recognizeText(`data:${type};base64,${file.data}`, onProgress);
  }
  throw new Error(`Filtypen ${file.mimeType} stöds inte`);
}

/** Let the user pick a PDF or image (Kivra download, screenshot, photo). */
export function pickReceiptFile(): Promise<ReceiptFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*,.pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', data: url.slice(url.indexOf(',') + 1) });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
