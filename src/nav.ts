/*
 * Screen addresses — the same as the native app ("property/stay/12", "group/5", "booking/AB12?paid=1"), so links from
 * the website, notifications and AI answers open the right screen. navigate("…") parses an address into a screen + params.
 */
import { createNavigationContainerRef, StackActions, CommonActions } from '@react-navigation/native';
import { Api } from './core/api';

export const ROUTES = [
  'explore', 'pets', 'chargers', 'planner', 'tripplans', 'groups', 'group/{id}', 'tickets?msg={msg}', 'groupchat/{id}', 'groupjoin/{code}', 'tripplan/{id}',
  'wallet', 'notifyprefs', 'triprun/{id}', 'myplaces', 'placeedit/{id}', 'trips', 'ai', 'account', 'login', 'signup', 'profile', 'notifications', 'mypets',
  'saved', 'reserve', 'property/{kind}/{id}', 'booking/{ref}?paid={paid}&failed={failed}&refund={refund}', 'petlisting/{id}',
  'petbooking/{ref}?paid={paid}&failed={failed}&refund={refund}', 'petform/{id}', 'page/{slug}', 'delete-account', 'become-host', 'become-pet-host', 'hostkyc',
  'hosting', 'bookguest?property={property}', 'site?path={path}&title={title}', 'hostcheckin/{id}', 'hostchats', 'hostchat/{id}', 'messages', 'chatt/{token}', 'place/{id}',
  'checkin?url={url}', 'chat/{kind}/{id}', 'pdf?url={url}&title={title}', 'photo?url={url}&title={title}', 'video?url={url}', 'petreceipt/{ref}', 'pay',
] as const;
export type RouteName = (typeof ROUTES)[number];
export const TABS = ['explore', 'pets', 'trips', 'ai', 'account'] as const;

type Compiled = { name: RouteName; segs: string[]; query: string[] };
const COMPILED: Compiled[] = ROUTES.map((r) => {
  const [path, q] = r.split('?');
  return { name: r, segs: path.split('/'), query: q ? q.split('&').map((x) => x.split('=')[0]) : [] };
});

/** "property/stay/12" → { name: 'property/{kind}/{id}', params: { kind: 'stay', id: '12' } }. */
export function parseRoute(route: string): { name: RouteName; params: Record<string, string> } | null {
  const [path, qs] = route.split('?');
  const segs = path.split('/');
  const query: Record<string, string> = {};
  (qs || '').split('&').filter(Boolean).forEach((kv) => { const i = kv.indexOf('='); const k = i < 0 ? kv : kv.slice(0, i); query[k] = i < 0 ? '' : safeDecode(kv.slice(i + 1)); });
  for (const c of COMPILED) {
    if (c.segs.length !== segs.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    c.segs.forEach((s, i) => { if (s.startsWith('{')) params[s.slice(1, -1)] = safeDecode(segs[i]); else if (s !== segs[i]) ok = false; });
    if (!ok) continue;
    c.query.forEach((k) => { if (query[k] !== undefined) params[k] = query[k]; });
    return { name: c.name, params };
  }
  return null;
}
const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
export const enc = encodeURIComponent;

export const navRef = createNavigationContainerRef<any>();

export const Nav = {
  navigate(route: string) {
    const r = parseRoute(route);
    if (!r || !navRef.isReady()) return;
    const cur = navRef.getCurrentRoute();
    // tabs and single screens: don't stack copies (launchSingleTop)
    if (cur?.name === r.name && JSON.stringify(cur.params || {}) === JSON.stringify(r.params)) return;
    if ((TABS as readonly string[]).includes(r.name)) {
      if (r.name === 'explore') { Nav.home(); return; }
      navRef.dispatch(CommonActions.navigate({ name: r.name, params: r.params }));
      return;
    }
    navRef.dispatch(StackActions.push(r.name, r.params));
  },
  /** Replace the current screen (popUpTo … inclusive). */
  replace(route: string) {
    const r = parseRoute(route); if (!r || !navRef.isReady()) return;
    navRef.dispatch(StackActions.replace(r.name, r.params));
  },
  back() { if (navRef.isReady() && navRef.canGoBack()) navRef.goBack(); else Nav.home(); },
  /** Back to Explore (always at the bottom of the stack). */
  home() { if (!navRef.isReady()) return; navRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'explore' }] })); },
  /** Back to Explore, then this screen on top (popUpTo explore). */
  fromHome(route: string) { Nav.home(); setTimeout(() => Nav.navigate(route), 0); },
  current(): string { return navRef.isReady() ? (navRef.getCurrentRoute()?.name as string) || 'explore' : 'explore'; },
  openPdf(link: string, title: string) { Nav.navigate('pdf?url=' + enc(link) + '&title=' + enc(title)); },
  /** A page of the website inside the app. */
  openSite(path: string, title: string) { Nav.navigate('site?path=' + enc(path) + '&title=' + enc(title)); },
  /**
   * Opens a link from the website (deep link, notification, AI answer) on the matching screen of the app.
   * Everything stays in the app: pages without an app screen open the nearest one.
   */
  openLink(link: string) {
    let u: URL;
    try { u = new URL(link.startsWith('/') ? Api.url(link) : link); } catch { return; }
    const seg = u.pathname.split('/').filter(Boolean);
    const first = seg[0] || '';
    const q = (k: string) => u.searchParams.get(k) || '';
    const isInt = (s?: string) => !!s && /^\d+$/.test(s);
    if (seg.length >= 2 && first === 'stays' && isInt(seg[1])) return Nav.navigate(`property/stay/${seg[1]}`);
    if (seg.length >= 2 && first === 'resorts' && isInt(seg[1])) return Nav.navigate(`property/resort/${seg[1]}`);
    if (q('chat') && (first === 'stays' || first === 'resorts')) return Nav.navigate(`chatt/${q('chat')}`);
    if (['host', 'owner'].includes(first) && seg[1] === 'chats' && isInt(q('thread'))) return Nav.navigate(`hostchat/${q('thread')}`);
    if (seg.length >= 2 && (first === 'places' || first === 'place') && isInt(seg[1])) return Nav.navigate(`place/${seg[1]}`);
    if (seg.length >= 2 && first === 'pet-boarding' && isInt(seg[1])) return Nav.navigate(`petlisting/${seg[1]}`);
    if (seg.length === 3 && first === 'pet-booking' && seg[2] === 'receipt') return Nav.navigate(`petreceipt/${seg[1]}`);
    if (seg.length === 2 && first === 'pet-booking') return Nav.navigate(`petbooking/${seg[1]}`);
    if (seg.length === 2 && ['booking', 'pay', 'resort-booking', 'resort-pay'].includes(first)) return Nav.navigate(`booking/${seg[1]}`);
    if (seg.length === 2 && first === 'checkin') return Nav.navigate('checkin?url=' + enc(link));
    if (first === 'invoices' && u.pathname.endsWith('/pdf')) return Nav.openPdf(link, 'Invoice');
    if (u.pathname.endsWith('.pdf')) return Nav.openPdf(link, 'Document');
    if (first === 'pet-boarding' || first === 'pets') return Nav.navigate('pets');
    if (['trips', 'my-bookings', 'find-booking', 'me'].includes(first)) return Nav.navigate('trips');
    if (first === 'privacy-policy') return Nav.navigate('page/privacy');
    if (first === 'cancellation-policy') return Nav.navigate('page/cancellation');
    if (first === 'host-terms') return Nav.navigate('page/host-terms');
    if (first === 'become-a-host') return Nav.navigate('become-host');
    if (first === 'host-signup') return Nav.navigate('become-host');
    if (first === 'host' && seg[1] === 'kyc') return Nav.navigate('hostkyc');
    if (first === 'become-a-pet-host') return Nav.navigate('become-pet-host');
    if (first === 'delete-account') return Nav.navigate('delete-account');
    if (first === 'login') return Nav.navigate('login');
    if (first === 'signup') return Nav.navigate('signup');
    if (['host', 'owner', 'pet-host', 'referral', 'lister', 'admin'].includes(first)) return Nav.navigate('hosting');
    if (first === 'ai') return Nav.navigate('ai');
    if (seg.length === 2 && first === 'trip-group') return Nav.navigate(`groupjoin/${seg[1].toUpperCase()}`);
    Nav.home();
  },
};

/** The app's own links (triparro-app://…) that may open a screen directly. */
export const APP_LINK_SCREENS = ['notifications', 'login', 'signup', 'page/', 'site?', 'become-host', 'become-pet-host', 'hosting', 'delete-account', 'chat/', 'chatt/', 'hostchat/', 'groupchat/', 'group/', 'groups', 'messages', 'place/', 'checkin', 'petreceipt/'];

/** The current screen's address parts ("group/{id}" → { id: '5' }). */
import { useRoute } from '@react-navigation/native';
export function useParams(): Record<string, string> { return ((useRoute().params as any) || {}) as Record<string, string>; }
/** A whole number from the address ("12" → 12). */
export const intParam = (v?: string) => { const n = parseInt(v || '', 10); return Number.isNaN(n) ? 0 : n; };
