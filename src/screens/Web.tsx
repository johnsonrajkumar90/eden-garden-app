/*
 * A page of the website inside the app (dashboards, payments, invoices) with the app's own sign-in (cookies are shared
 * with the app). Payment: a page that posts the payment fields to the gateway at once (PayU, or the site's Razorpay page);
 * when the gateway sends the guest back to the website's booking page, the app's own booking screen opens instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, View } from 'react-native';
import { WebView as RNWebView, WebViewNavigation } from 'react-native-webview';
const WebView = RNWebView as any;
import { Api, userAgent } from '../core/api';
import { AppState, useAppState } from '../core/state';
import { PaymentForm } from '../core/state';
import { Brand } from '../theme';
import { BackBar } from '../ui/kit';
import { Nav, useParams } from '../nav';

/** Hosts whose links belong to their own apps (WhatsApp, Maps, social media, Google sign-in). */
const outsideHosts = ['wa.me', 'api.whatsapp.com', 'whatsapp.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'facebook.com', 'instagram.com', 'youtube.com', 'youtu.be',
  'twitter.com', 'x.com', 'linkedin.com', 'play.google.com', 'accounts.google.com', 'calendar.google.com', 'apps.apple.com'];

/** The website's address the gateway sends the guest back to → the app's own booking screen. */
export function appRouteFor(url: string): string | null {
  try {
    const u = new URL(url); const own = new URL(Api.base).host.replace(/^www\./, '');
    if (u.host.replace(/^www\./, '') !== own) return null;
    const seg = u.pathname.split('/').filter(Boolean);
    const q = u.search || '';
    if (seg.length === 2 && ['booking', 'pay', 'resort-booking', 'resort-pay'].includes(seg[0])) return 'booking/' + seg[1] + q;
    if (seg.length === 2 && seg[0] === 'pet-booking') return 'petbooking/' + seg[1] + q;
  } catch {}
  return null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function paymentHtml(p: PaymentForm) {
  const inputs = Object.entries(p.fields || {}).map(([k, v]) => `<input type=hidden name='${esc(k)}' value='${esc(String(v ?? ''))}'>`).join('');
  return `<!doctype html><html><head><meta name=viewport content='width=device-width'></head><body style='font-family:sans-serif;padding:24px;color:#4a5663'>`
    + `<p>Opening the secure payment page…</p><form id=f method=post action='${esc(p.action)}'>${inputs}</form><script>document.getElementById('f').submit()</script></body></html>`;
}

export function WebView2({ url, title, payment, onBack, onAppRoute }: { url: string | null; title: string; payment?: PaymentForm | null; onBack: () => void; onAppRoute: (r: string) => void }) {
  const ref = useRef<any>(null);
  const [pageTitle, setPageTitle] = useState(title);
  const [progress, setProgress] = useState(0);
  const [canBack, setCanBack] = useState(false);
  const routed = useRef(false);
  useEffect(() => {
    const s = BackHandler.addEventListener('hardwareBackPress', () => { if (canBack && !payment) ref.current?.goBack(); else onBack(); return true; });
    return () => s.remove();
  }, [canBack, payment]);

  const decide = (link: string): boolean => {   // true = load in the page
    if (!/^https?:/i.test(link)) { if (!link.startsWith('about:') && !link.startsWith('data:')) Linking.openURL(link).catch(() => {}); return link.startsWith('about:') || link.startsWith('data:'); }
    const r = appRouteFor(link);
    if (r) { if (!routed.current) { routed.current = true; onAppRoute(r); } return false; }
    try {
      const host = new URL(link).host;
      if (outsideHosts.some((h) => host === h || host.endsWith('.' + h)) || link.includes('google.com/maps')) { Linking.openURL(link).catch(() => {}); return false; }
    } catch {}
    return true;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <BackBar title={pageTitle} onBack={onBack} />
      {progress > 0 && progress < 1 ? <View style={{ height: 3, width: `${progress * 100}%`, backgroundColor: Brand.Coral }} /> : null}
      <WebView
        ref={ref}
        source={payment ? { html: paymentHtml(payment), baseUrl: Api.base + '/' } : { uri: Api.url(url || '/') }}
        originWhitelist={['*']}
        sharedCookiesEnabled thirdPartyCookiesEnabled javaScriptEnabled domStorageEnabled
        setSupportMultipleWindows={false} javaScriptCanOpenWindowsAutomatically
        applicationNameForUserAgent={userAgent}
        allowsBackForwardNavigationGestures mediaPlaybackRequiresUserAction={false}
        onShouldStartLoadWithRequest={(r: any) => decide(r.url)}
        onNavigationStateChange={(n: WebViewNavigation) => {
          setCanBack(n.canGoBack);
          if (n.title && !/^https?:/.test(n.title) && !n.loading) setPageTitle(n.title.split(' · ')[0].split(' | ')[0]);
          // a gateway's reply can reach the booking page through a redirect after a form post: catch it here too
          const r = appRouteFor(n.url);
          if (r && !routed.current) { routed.current = true; ref.current?.stopLoading(); onAppRoute(r); }
        }}
        onLoadProgress={(e: any) => setProgress(e.nativeEvent.progress)}
        onFileDownload={(e: any) => Linking.openURL(e.nativeEvent.downloadUrl).catch(() => {})}
        style={{ flex: 1 }}
      />
    </View>
  );
}

/** "site?path=…&title=…": a page of the website. */
export function SiteScreen() {
  const p = useParams();
  return <WebView2 url={p.path || '/'} title={p.title || 'TripArro'} onBack={Nav.back} onAppRoute={(r) => Nav.navigate(r)} />;
}

/** "pay": the payment page for the form the booking screen prepared. */
export function PayScreen() {
  const form = useAppState('payment');
  return (
    <WebView2 url={null} title={form?.title || 'Payment'} payment={form}
      onBack={() => {
        // left the payment page without paying: close the attempt so the wallet money comes back at once
        const t = form?.fields?.txnid;
        if (t) Api.post('payments/abandon', { txnid: String(t) }).catch(() => {}).finally(() => AppState.bump());
        AppState.set({ payment: null });
        Nav.back();
      }}
      onAppRoute={(r) => { AppState.set({ payment: null }); AppState.bump(); Nav.back(); setTimeout(() => Nav.navigate(r), 0); }} />
  );
}
