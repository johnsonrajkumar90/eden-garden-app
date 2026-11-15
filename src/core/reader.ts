/*
 * Reading text on photos on the phone (Google ML Kit, on the device — nothing is sent anywhere to read it):
 * receipts, and guests' ID cards. For an Aadhaar card the photo itself is masked before it leaves the phone — the first
 * 8 digits of the number (and of a VID) are blacked out, and so are QR codes, which can carry the full number.
 */
import TextRecognition from '@react-native-ml-kit/text-recognition';
import BarcodeScanning from '@react-native-ml-kit/barcode-scanning';
import { Skia, ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import { shrinkPhoto } from './files';

type Box = { left: number; top: number; width: number; height: number };
export type TextLine = { text: string; box: Box; words: { text: string; box: Box }[] };

/** The lines of text on a photo with their positions, or null when the phone can't read text. */
export async function readLines(uri: string): Promise<TextLine[] | null> {
  try {
    const r = await TextRecognition.recognize(uri);
    return r.blocks.flatMap((b) => b.lines.filter((l) => l.frame).map((l) => ({ text: l.text, box: l.frame!, words: (l.elements || []).filter((e) => e.frame).map((e) => ({ text: e.text, box: e.frame! })) })));
  } catch { return null; }
}

/**
 * The lines put back into rows as printed (a bill's item names and prices are read as separate columns):
 * lines whose middles are at the same height join up, left to right.
 */
export function rows(lines: TextLine[]): string {
  if (!lines.length) return '';
  const cy = (b: Box) => b.top + b.height / 2;
  const sorted = [...lines].sort((a, b) => cy(a.box) - cy(b.box));
  const out: TextLine[][] = [];
  for (const l of sorted) {
    const row = out[out.length - 1];
    const h = Math.max(8, l.box.height);
    if (row && Math.abs(row.reduce((s, x) => s + cy(x.box), 0) / row.length - cy(l.box)) < h * 0.55) row.push(l); else out.push([l]);
  }
  return out.map((r) => r.sort((a, b) => a.box.left - b.box.left).map((x) => x.text).join(' ')).join('\n');
}

export type IdRead = { type: string | null; number: string | null; name: string | null; photo: string; masked: boolean; read: boolean };

const aadhaarRx = /(?<!\d)(\d{4})\s?(\d{4})\s?(\d{4})(?!\d)/;
const vidRx = /(?<!\d)(\d{4})\s?(\d{4})\s?(\d{4})\s?(\d{4})(?!\d)/;
const panRx = /\b([A-Z]{5}\d{4}[A-Z])\b/;
const passportRx = /\b([A-Z]\d{7})\b/;
const voterRx = /\b([A-Z]{3}\d{7})\b/;
const dlRx = /\b([A-Z]{2}[ -]?\d{2}[ -]?\d{4}[ -]?\d{7}|[A-Z]{2}\d{13})\b/;

/** Reads a guest's ID card: the kind of ID, its number and the name; masks an Aadhaar card's photo. */
export async function readId(picked: { uri: string; width?: number; height?: number }): Promise<IdRead | null> {
  const small = await shrinkPhoto(picked, 2000);
  const lines = await readLines(small.uri);
  if (!lines) return { type: null, number: null, name: null, photo: small.uri, masked: false, read: false };
  const all = lines.map((l) => l.text).join('\n'); const up = all.toUpperCase();
  let type: string | null = null;
  if (/AADHAAR|आधार|UNIQUE IDENTIFICATION|GOVERNMENT OF INDIA|VID\s*:/.test(up) && aadhaarRx.test(all)) type = 'aadhaar';
  else if (up.includes('INCOME TAX') || up.includes('PERMANENT ACCOUNT') || (panRx.test(up) && up.includes('INDIA'))) type = 'pan';
  else if (up.includes('PASSPORT') || up.includes('P<IND') || up.includes('REPUBLIC OF INDIA')) type = 'passport';
  else if (up.includes('DRIVING LICEN')) type = 'dl';
  else if (up.includes('ELECTION COMMISSION') || up.includes('ELECTOR') || up.includes('EPIC')) type = 'voter';
  else if (aadhaarRx.test(all)) type = 'aadhaar';
  let number: string | null = null;
  if (type === 'aadhaar') { const l = lines.find((x) => !vidRx.test(x.text) && aadhaarRx.test(x.text)); const m = l ? aadhaarRx.exec(l.text) : null; number = m ? 'XXXX XXXX ' + m[3] : null; }
  else if (type === 'pan') number = panRx.exec(up)?.[1] || null;
  else if (type === 'passport') number = passportRx.exec(up)?.[1] || null;
  else if (type === 'voter') number = voterRx.exec(up)?.[1] || null;
  else if (type === 'dl') number = dlRx.exec(up)?.[1]?.replace(/[ -]/g, '') || null;
  const name = guessName(lines.map((l) => l.text), type);
  let masked = false; let photo = small.uri;
  if (type === 'aadhaar') {
    // black out the first 8 digits of every 12- / 16-digit number on the card, and the QR codes
    const boxes: Box[] = [];
    for (const l of lines) {
      // runs of 4-digit words side by side (1234 5678 9012): every group but the last is blacked out, using the words' own boxes
      const runs: { box: Box }[][] = []; let cur: { box: Box }[] = [];
      l.words.forEach((w) => { if (/^\d{4}$/.test(w.text)) cur.push(w); else { if (cur.length) runs.push(cur); cur = []; } });
      if (cur.length) runs.push(cur);
      const long = runs.filter((r) => r.length >= 3);
      if (long.length) {
        long.forEach((r) => r.slice(0, -1).forEach((w) => boxes.push(pad(w.box, 6))));
      } else {   // the number read as one word: estimate where its digits are from the line's box
        for (const rx of [vidRx, aadhaarRx]) {
          const g = new RegExp(rx.source, 'g'); let m: RegExpExecArray | null;
          while ((m = g.exec(l.text))) {
            const last = m[m.length - 1]; const keep = m.index + m[0].lastIndexOf(last);
            const w = l.box.width / Math.max(1, l.text.length);
            boxes.push({ left: l.box.left + m.index * w - 6, top: l.box.top - 6, width: (keep - m.index) * w - w * 0.35 + 6, height: l.box.height + 12 });
          }
        }
      }
    }
    try { (await BarcodeScanning.scan(small.uri)).forEach((b) => { if (b.frame) boxes.push(pad(b.frame, 12)); }); } catch {}
    if (boxes.length) { const out = await blackOut(small.uri, boxes); if (out) { photo = out; masked = true; } }
  }
  return { type, number, name, photo, masked, read: true };
}

const pad = (b: Box, p: number): Box => ({ left: b.left - p, top: b.top - p, width: b.width + 2 * p, height: b.height + 2 * p });

/** The name on the card: the line after a "Name" label, or on an Aadhaar card the line above the date of birth. */
function guessName(lines: string[], type: string | null): string | null {
  const ok = (s: string) => s.length >= 3 && s.length <= 60 && /^[A-Za-z .']+$/.test(s) && !/government|india|income|tax|department|male|female|dob|birth|address|father|signature|licen|union|republic|card/i.test(s);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(name|given name\(?s?\)?|holder'?s name)\s*[:/]?\s*$/i.test(l)) { const n = lines[i + 1]?.trim(); if (n && ok(n)) return n; }
    const m = /^\s*name\s*[:/]\s*(.+)$/i.exec(l); if (m && ok(m[1].trim())) return m[1].trim();
  }
  if (type === 'aadhaar') {
    const dob = lines.findIndex((x) => /DOB|Date of Birth|Year of Birth|जन्म/i.test(x));
    if (dob > 0) for (let j = dob - 1; j >= Math.max(0, dob - 3); j--) { const n = lines[j].trim(); if (ok(n)) return n; }
  }
  return null;
}

/** Paints solid black boxes over the photo; returns the new file, or null if it could not be done. */
async function blackOut(uri: string, boxes: Box[]): Promise<string | null> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(b64));
    if (!img) return null;
    const surface = Skia.Surface.MakeOffscreen(img.width(), img.height()) || Skia.Surface.Make(img.width(), img.height());
    if (!surface) return null;
    const c = surface.getCanvas();
    c.drawImage(img, 0, 0);
    const paint = Skia.Paint(); paint.setColor(Skia.Color('black'));
    boxes.forEach((b) => c.drawRect(Skia.XYWHRect(b.left, b.top, b.width, b.height), paint));
    surface.flush();
    const out = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 88);
    const file = (FileSystem.cacheDirectory || '') + `idscan-masked-${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(file, out, { encoding: FileSystem.EncodingType.Base64 });
    return file;
  } catch { return null; }
}
