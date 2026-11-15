/*
 * Talks to the TripArro website's REST API (/api/…) with the website's own sign-in session.
 * The phone keeps the website's cookies (people stay signed in) and shares them with in-app web pages.
 * Every write carries the CSRF token from /api/session. No secrets live in the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { J, bool, num, obj, str, text } from './json';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string | null, public errors: Record<string, string> = {}) {
    super(message);
  }
}

/** A file to upload in a multipart request (a local file:// uri from the camera / photo picker). */
export type Upload = { field: string; uri: string; name?: string; type?: string };

export type User = { id: number; name: string; email: string; role: string; initials: string; dashboard: string | null; wallet: number | null; reward: J | null };
export type Session = {
  user: User | null; csrf: string; brand: string;
  supportPhone: string | null; supportWhatsapp: string | null; supportEmail: string | null; supportHours: string | null;
  ai: boolean; payments: boolean; loginToBook: boolean; links: J; offerPopup: J | null; welcome: J | null; raw: J;
};

const DEFAULT_SITE = (Constants.expoConfig?.extra as any)?.siteUrl || 'https://triparro.com';
const VERSION = Constants.expoConfig?.version || '3.0';
export const userAgent = `TripArroApp/${VERSION} (${Platform.OS} ${Platform.Version}; react-native) EdenGardenApp/3.0`;

type Listener = (s: Session | null) => void;

class ApiClient {
  base = DEFAULT_SITE;
  session: Session | null = null;
  private listeners = new Set<Listener>();
  private ready: Promise<void>;

  constructor() {
    this.ready = AsyncStorage.getItem('base_url').then((v) => { if (v) this.base = v.replace(/\/+$/, ''); }).catch(() => {});
  }

  onSession(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  private setSession(s: Session | null) { this.session = s; this.listeners.forEach((l) => l(s)); }

  /** The website address (Account → About → Server can change it, e.g. for a test site). */
  async setBase(url: string) {
    this.base = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('base_url', this.base);
    this.setSession(null);
  }

  url(path: string) { return /^https?:/.test(path) ? path : this.base + '/' + path.replace(/^\/+/, ''); }

  /* ---------- Session ---------- */
  async refreshSession(): Promise<Session> {
    const j = await this.get('session');
    const u = obj(j, 'user'); const s = obj(j, 'support') || {}; const f = obj(j, 'features') || {};
    const session: Session = {
      user: u ? { id: Number(u.id), name: text(u, 'name'), email: text(u, 'email'), role: text(u, 'role', 'guest'), initials: text(u, 'initials', '?'),
        dashboard: str(u, 'dashboard'), wallet: num(u, 'wallet'), reward: obj(u, 'wallet_reward') } : null,
      csrf: text(j, 'csrf'), brand: text(obj(j, 'brand'), 'name', 'TripArro'),
      supportPhone: str(s, 'phone'), supportWhatsapp: str(s, 'whatsapp'), supportEmail: str(s, 'email'), supportHours: str(s, 'hours'),
      ai: bool(f, 'ai'), payments: bool(f, 'payments'), loginToBook: bool(f, 'login_to_book'),
      links: obj(j, 'links') || {}, offerPopup: obj(j, 'offer_popup'), welcome: obj(j, 'welcome'), raw: j,
    };
    this.setSession(session);
    return session;
  }

  private async csrf() { return this.session?.csrf || (await this.refreshSession()).csrf; }

  /* ---------- Requests ---------- */
  async get(path: string, query: Record<string, any> = {}): Promise<J> {
    return this.send(this.withQuery(this.url('api/' + path), query), { method: 'GET' });
  }
  async getSite(path: string, query: Record<string, any> = {}): Promise<J> {
    return this.send(this.withQuery(this.url(path), query), { method: 'GET' });
  }
  async post(path: string, body: Record<string, any> = {}): Promise<J> {
    return this.withCsrf((t) => this.send(this.url('api/' + path), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': t }, body: JSON.stringify(clean(body)) }));
  }
  /** POST to a website address (not under /api/) that answers JSON to the app: sign-in, sign-up, codes, password reset. */
  async postSite(path: string, body: Record<string, any>): Promise<J> {
    return this.withCsrf((t) => this.send(this.url(path), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': t }, body: JSON.stringify(clean(body)) }));
  }
  async postMultipart(path: string, fields: [string, string][], files: Upload[]): Promise<J> { return this.multipart(this.url('api/' + path), fields, files); }
  async postSiteMultipart(path: string, fields: [string, string][], files: Upload[]): Promise<J> { return this.multipart(this.url(path), fields, files); }

  private multipart(url: string, fields: [string, string][], files: Upload[]) {
    return this.withCsrf((t) => {
      const fd = new FormData();
      fields.forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append(f.field, { uri: f.uri, name: f.name || f.uri.split('/').pop() || 'photo.jpg', type: f.type || 'image/jpeg' } as any));
      return this.send(url, { method: 'POST', headers: { 'X-CSRF-TOKEN': t }, body: fd });
    });
  }

  private withQuery(url: string, query: Record<string, any>) {
    const parts: string[] = [];
    Object.entries(query).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (Array.isArray(v)) v.forEach((x) => parts.push(encodeURIComponent(k + '[]') + '=' + encodeURIComponent(String(x))));
      else if (typeof v === 'boolean') { if (v) parts.push(encodeURIComponent(k) + '=1'); }
      else if (String(v) !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    });
    return parts.length ? url + (url.includes('?') ? '&' : '?') + parts.join('&') : url;
  }

  private async withCsrf(run: (token: string) => Promise<J>): Promise<J> {
    try { return await run(await this.csrf()); } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 419) throw e;
      await this.refreshSession();   // the session expired: new token, try once more
      return run(await this.csrf());
    }
  }

  private async send(url: string, init: RequestInit): Promise<J> {
    await this.ready;
    let r: Response;
    try {
      r = await fetch(url, { ...init, credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': userAgent, ...(init.headers as any) } });
    } catch {
      throw new ApiError(0, 'No connection. Check your internet and try again.', 'offline');
    }
    const raw = await r.text();
    let j: J | null = null;
    if (raw.trimStart().startsWith('{')) { try { j = JSON.parse(raw); } catch { j = null; } }
    if (r.ok && j) return j;
    // sent to the sign-in page (redirects are followed by the phone): not signed in
    if (r.ok && /\/login(\?|$)/.test(r.url || '')) throw new ApiError(401, 'Please sign in first.', 'login_required');
    if (r.ok) throw new ApiError(r.status, 'This needs the latest TripArro website.', 'not_json');
    const errs: Record<string, string> = {};
    const e = obj(j, 'errors');
    if (e) Object.keys(e).forEach((k) => { errs[k] = Array.isArray(e[k]) ? String(e[k][0]) : String(e[k]); });
    const msg = str(j, 'message') || ({ 401: 'Please sign in first.', 403: 'This is not available for your account.', 404: 'Not found.', 419: 'Your session expired.', 429: 'Too many tries — please wait a minute.' } as Record<number, string>)[r.status]
      || `Something went wrong (${r.status}). Please try again.`;
    throw new ApiError(r.status, msg, str(j, 'code'), errs);
  }

  /* ---------- Sign in / out ---------- */
  /** Sign in from the app's own screen (the website answers JSON to the app). */
  async signIn(email: string, password: string): Promise<User> {
    await this.postSite('login', { email: email.trim(), password, remember: 1 });
    const s = await this.refreshSession();
    if (!s.user) throw new ApiError(401, 'Incorrect email or password.');
    return s.user;
  }

  /** Downloads a private file (invoice PDF, diary video) with the signed-in session into the phone's cache. */
  async download(link: string, name: string): Promise<string> {
    await this.ready;
    const FS = require('expo-file-system/legacy');
    let r: Response;
    try { r = await fetch(this.url(link), { credentials: 'include', headers: { 'User-Agent': userAgent } }); } catch { throw new ApiError(0, 'No connection. Check your internet and try again.', 'offline'); }
    if (!r.ok) throw new ApiError(r.status, r.status === 404 ? 'This file was not found.' : r.status === 403 || r.status === 401 ? 'Please sign in to open this file.' : `Could not download the file (${r.status}).`);
    if (/\/login(\?|$)/.test(r.url || '')) throw new ApiError(401, 'Please sign in to open this file.', 'login_required');
    const blob = await r.blob();
    const b64: string = await new Promise((ok, bad) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => bad(new Error('read')); f.readAsDataURL(blob); });
    const file = FS.cacheDirectory + name.replace(/[^\w.-]/g, '_');
    await FS.writeAsStringAsync(file, b64, { encoding: FS.EncodingType.Base64 });
    return file;
  }

  async logout() {
    try { await fetch(this.url('logout'), { credentials: 'include', headers: { 'User-Agent': userAgent } }); } catch {}
    try { await this.refreshSession(); } catch { this.setSession(null); }
  }

  /**
   * A private booking link from an email or notification (…/booking/REF?t=…): opening it once lets this app's session
   * see that booking, the same as on the website. Only for links to this website.
   */
  async primeLink(link: string) {
    try {
      const u = new URL(link); const b = new URL(this.base);
      if (u.host !== b.host || !u.searchParams.get('t')) return;
      await fetch(link, { credentials: 'include', headers: { Accept: 'text/html', 'User-Agent': userAgent } });
    } catch {}
  }
}

/** Drops null / undefined values (the website treats a missing field as "not given"). */
function clean(b: Record<string, any>) {
  const o: Record<string, any> = {};
  Object.entries(b).forEach(([k, v]) => { if (v !== null && v !== undefined) o[k] = v; });
  return o;
}

export const Api = new ApiClient();

/** A message for people from any error. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong — please try again.';
}
