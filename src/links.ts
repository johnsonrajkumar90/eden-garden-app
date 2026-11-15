/*
 * Links that open the app: website links (https://triparro.com/stays/12 …), Google sign-in coming back
 * (triparro-app://auth?code=…), Gmail ticket search coming back (triparro-app://tickets?found=…) and the app's own links.
 */
import { Api, errorText } from './core/api';
import { AppState } from './core/state';
import { APP_LINK_SCREENS, Nav, navRef } from './nav';

let lastHandled = '';
let pending: string | null = null;

function query(link: string) {
  try { return new URL(link.replace(/^triparro-app:\/\//, 'https://app/')).searchParams; } catch { return new URLSearchParams(); }
}

/** Opens a link on the right screen (waits until the screens are ready). */
export function handleIncomingLink(link: string | null | undefined) {
  if (!link || link === lastHandled) return;
  if (!navRef.isReady()) { pending = link; return; }
  lastHandled = link;
  if (link.startsWith('http')) { Api.primeLink(link).finally(() => Nav.openLink(link)); return; }
  if (link.startsWith('triparro-app://auth')) {   // back from Google sign-in in the browser
    const q = query(link);
    const code = q.get('code');
    if (!code) { AppState.set({ authMessage: q.get('error') || 'Google sign-in did not work — please try again.' }); Nav.navigate('login'); return; }
    (async () => {
      try {
        await Api.post('app-login', { code });
        await Api.refreshSession();
        Nav.fromHome('account');
      } catch (e) {
        AppState.set({ authMessage: errorText(e) });
        Nav.navigate('login');
      }
    })();
    return;
  }
  if (link.startsWith('triparro-app://tickets')) {   // back from Gmail: what was found (or why not)
    const q = query(link);
    const n = q.get('found') !== null ? parseInt(q.get('found') || '', 10) : null;
    const msg = q.get('error') || (n === null || Number.isNaN(n) ? '' : n === 0 ? 'No new tickets found in your Gmail. Gmail access has been given back.'
      : n === 1 ? "Found 1 ticket — keep it if it's yours. Gmail access has been given back." : `Found ${n} tickets — keep the ones that are yours. Gmail access has been given back.`);
    AppState.bump();
    Nav.navigate('tickets?msg=' + encodeURIComponent(msg));
    return;
  }
  if (link.startsWith('triparro-app://')) {   // the app's own links (notifications, sign in, sign up)
    const r = link.slice('triparro-app://'.length);
    if (APP_LINK_SCREENS.some((p) => r.startsWith(p))) Nav.navigate(r);
  }
}

/** Called once the screens are ready: opens a link that arrived while the app was starting. */
export function flushPendingLink() { const p = pending; pending = null; if (p) handleIncomingLink(p); }
