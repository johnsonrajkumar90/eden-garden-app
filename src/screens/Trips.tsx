// My trips (stays, resorts and pet services; group trips, tickets, route plans) and one booking's page.
import React, { useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, errorText } from '../core/api';
import { AppState, useAppState, useLoader, useSession } from '../core/state';
import { J, bool, int, num, obj, objs, str, text } from '../core/json';
import { Brand, RedBar } from '../theme';
import { BackBar, Card, EmptyBox, ErrorBox, Gap, Icon, KeyValue, LinkButton, Loading, Notice, OutlineButton, Photo, Pill, PriceTable, PrimaryButton, SectionTitle, StarPicker, Txt, dateTime, money, plural, prettyDate, shareLink, shortDate, st, today, TopBar } from '../ui/kit';
import { GatewayPicker, chosenGateway } from '../ui/gateway';
import { CheckRow, Field } from '../ui/inputs';
import { Dialog, dial } from '../ui/sheets';
import { Nav, enc, useParams } from '../nav';
import { GroupTripsList } from './Groups';
import { TicketsList } from './Tickets';

type Trip = { ref: string; pet: boolean; title: string; image: string | null; checkIn: string; checkOut: string; status: string; statusLabel: string; tone: string; sub: string };

export default function TripsScreen() {
  const session = useSession();
  const tick = useAppState('refreshTick');
  const [tab, setTab] = useState(5);   // opens on the trips you plan and share
  const l = useLoader(async () => {
    if (!session?.user) return null;
    const stays = await Api.get('bookings');
    const pets = await Api.get('pets/bookings').catch(() => ({}));
    return [stays, pets] as [J, J];
  }, [session?.user?.id, tick]);
  return (
    <View style={{ flex: 1 }}>
      <TopBar style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <Txt k="displaySmall" color="#fff">My trips</Txt>
        <Txt color="#FFE3E1" style={{ marginTop: 2 }}>Trips with family & friends, bookings and tickets</Txt>
      </TopBar>
      {!session?.user ? <EmptyBox title="Sign in to see your trips" text="Your stays, resorts and pet services bookings appear here." action="Sign in" icon="luggage" onAction={() => Nav.navigate('login')} />
        : <TripsList tab={tab} setTab={setTab} l={l} />}
    </View>
  );
}

function TripsList({ tab, setTab, l }: { tab: number; setTab: (n: number) => void; l: ReturnType<typeof useLoader<[J, J] | null>> }) {
  // chips in the order people use them: their named trips first, then bookings and tickets
  const tabs: [number, string][] = [[5, 'My trips'], [0, 'Upcoming'], [1, 'Staying now'], [2, 'Completed'], [3, 'Cancelled'], [6, 'Tickets']];
  let body: React.ReactNode;
  if (tab === 5) body = <GroupTripsList />;
  else if (tab === 6) body = <TicketsList />;
  else if (!l.data && l.loading) body = <Loading />;
  else if (!l.data) body = <ErrorBox message={l.error || 'Could not load your trips.'} onRetry={l.reload} />;
  else {
    const [stays, pets] = l.data;
    const now = today();
    const all: Trip[] = [];
    const mk = (b: J, pet: boolean): Trip => ({ ref: text(b, 'ref'), pet, title: text(obj(b, 'listing'), 'title'), image: str(obj(b, 'listing'), 'image'), checkIn: text(b, 'check_in'), checkOut: text(b, 'check_out'),
      status: text(b, 'status'), statusLabel: text(b, 'status_label'), tone: text(b, 'status_tone'),
      sub: pet ? 'Pet services · ' + plural(int(b, 'pets_count'), 'pet') : plural(int(b, 'nights'), 'night') + ' · ' + plural(int(b, 'guests'), 'guest') });
    [...objs(stays, 'upcoming'), ...objs(stays, 'past'), ...objs(stays, 'cancelled')].forEach((b) => all.push(mk(b, false)));
    ['upcoming', 'active', 'completed', 'cancelled'].forEach((k) => objs(pets, k).forEach((b) => all.push(mk(b, true))));
    let shown = all.filter((t) => {
      const cancelled = ['cancelled', 'refunded'].includes(t.status);
      const staying = !cancelled && (['checked_in', 'in_progress'].includes(t.status) || (!t.pet && t.status === 'confirmed' && t.checkIn <= now && t.checkOut > now));
      const done = !cancelled && !staying && (t.checkOut < now || ['checked_out', 'completed'].includes(t.status));
      return tab === 0 ? !cancelled && !staying && !done : tab === 1 ? staying : tab === 2 ? done : cancelled;
    });
    shown = shown.sort((a, b) => (tab <= 1 ? a.checkIn.localeCompare(b.checkIn) : b.checkIn.localeCompare(a.checkIn)));
    body = (
      <FlatList data={shown} keyExtractor={(t) => (t.pet ? 'p' : 's') + t.ref} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 130 }}
        ListEmptyComponent={<EmptyBox title={['No upcoming trips', 'Nobody staying now', 'No completed trips', 'No cancelled trips'][tab]} text="Find a stay or pet services and it will show here." action="Explore stays"
          icon={['flight-takeoff', 'hotel', 'task-alt', 'event-busy'][tab]} onAction={() => Nav.home()} />}
        renderItem={({ item: t, index }) => (
          <Card padding={12} index={index} onPress={() => Nav.navigate((t.pet ? 'petbooking/' : 'booking/') + t.ref)}>
            <View style={st.row}>
              <Photo url={t.image} corner={16} style={{ width: 92, aspectRatio: 1 }} />
              <View style={{ paddingLeft: 12, flex: 1 }}>
                <Txt k="titleMedium" numberOfLines={2}>{t.title}</Txt>
                <Txt k="bodySmall" color={Brand.InkSoft}>{shortDate(t.checkIn)} → {shortDate(t.checkOut)}</Txt>
                <Txt k="bodySmall" color={Brand.Muted}>{t.sub}</Txt>
                <View style={{ marginTop: 4 }}><Pill text={t.statusLabel} tone={t.tone} /></View>
              </View>
            </View>
          </Card>
        )} />
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: '#fff' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {tabs.map(([i, t]) => (
            <Pressable key={i} onPress={() => setTab(i)} style={{ borderRadius: 50, backgroundColor: tab === i ? Brand.Blue : Brand.Sky, paddingHorizontal: 16, paddingVertical: 9 }}>
              <Txt k="labelLarge" color={tab === i ? '#fff' : Brand.InkSoft}>{t}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>{body}</View>
    </View>
  );
}

/** A stay or resort booking: status, price, pay the balance, invoice, directions, cancel, review, messages. */
export function BookingScreen() {
  const prm = useParams();
  const ref = prm.ref || '';
  const notice = prm.paid ? 'paid' : prm.failed ? 'failed' : prm.refund ? 'refund' : null;
  const tick = useAppState('refreshTick');
  const l = useLoader(() => Api.get(`bookings/${ref}`), [ref, tick]);
  const [cancelQuote, setCancelQuote] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [message, setMessage] = useState('');
  const [useWallet, setUseWallet] = useState(true);
  const b = l.data;

  const pay = async (kind: string) => {
    setBusy(true); setMsg(null);
    const withWallet = useWallet && (num(obj(b, 'wallet'), 'usable') || 0) > 0;
    try {
      const p = await Api.post('payments', { ref, kind: withWallet ? 'full' : kind, use_wallet: withWallet, gateway: chosenGateway() });
      if (bool(p, 'paid')) { setMsg(text(p, 'message')); AppState.bump(); }   // the wallet paid all of it
      else { AppState.set({ payment: { action: text(p, 'action'), fields: obj(p, 'fields') || {}, title: 'Pay securely' } }); Nav.navigate('pay'); }
    } catch (e) { setMsg(errorText(e)); }
    setBusy(false);
  };
  const act = async (f: () => Promise<any>) => { setBusy(true); try { await f(); } catch (e) { setMsg(errorText(e)); } setBusy(false); };

  if (!b) return <View style={{ flex: 1 }}><BackBar title={`Booking ${ref}`} onBack={Nav.back} />{l.loading ? <Loading /> : <ErrorBox message={l.error || 'Booking not found.'} onRetry={l.reload} />}</View>;
  const li = obj(b, 'listing') || {};
  const br = obj(b, 'breakup');
  const extra: [string, string][] = [['Paid', money(num(b, 'paid'))], ['Balance', money(num(b, 'balance'))]];
  const lines = br ? [
    { label: text(br, 'base_label', 'Stay'), amount: num(br, 'base') || 0 },
    ...((num(br, 'property_discount') || 0) > 0 ? [{ label: 'Discount', amount: -(num(br, 'property_discount') || 0) }] : []),
    ...objs(br, 'tax_lines').map((x) => ({ label: text(x, 'label'), amount: num(x, 'amount') || 0 })),
    ...((num(br, 'promotion') || 0) > 0 ? [{ label: 'Promotion', amount: -(num(br, 'promotion') || 0) }] : []),
  ] : [];
  const approval = str(b, 'approval');
  const w = obj(b, 'wallet'); const usable = num(w, 'usable') || 0;
  const due = (num(b, 'balance') || 0) - (useWallet ? usable : 0);
  const oc = obj(b, 'online_checkin');
  const q = cancelQuote;

  return (
    <View style={{ flex: 1 }}>
      <BackBar title={`Booking ${ref}`} onBack={Nav.back} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        {notice === 'paid' ? <Notice text="Payment received — your booking is confirmed. We have emailed the details." tone="ok" />
          : notice === 'failed' ? <Notice text="The payment did not go through. Nothing was charged and any wallet money you used is back in your wallet — you can try again below." tone="bad" />
          : notice === 'refund' ? <Notice text="The dates were taken before your payment arrived. Your money will be refunded in full." tone="warn" /> : null}
        {notice ? <Gap /> : null}
        <Card>
          <Photo url={str(li, 'image')} style={{ width: '100%', aspectRatio: 2 }} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}><Pill text={text(b, 'status_label')} tone={text(b, 'status_tone')} /><Pill text={text(b, 'payment_label')} tone={text(b, 'payment_tone')} /></View>
          <Txt k="titleLarge" style={{ marginTop: 6 }}>{text(li, 'title')}</Txt>
          {str(li, 'room') ? <Txt color={Brand.InkSoft}>{str(li, 'room')}</Txt> : null}
          <Txt k="bodySmall" color={Brand.Muted}>{text(li, 'location')}</Txt>
          <Gap h={8} />
          <KeyValue k="Check-in" v={prettyDate(str(b, 'check_in'))} />
          <KeyValue k="Check-out" v={prettyDate(str(b, 'check_out'))} />
          <KeyValue k="Guests" v={plural(int(b, 'guests'), 'guest') + ' · ' + plural(int(b, 'nights'), 'night')} />
          <KeyValue k="Reference" v={ref} />
        </Card>
        {approval ? <><Gap /><Notice tone={approval === 'approved' || approval === 'requested' ? 'info' : 'warn'} text={
          approval === 'requested' ? `Waiting for the host to accept your request${str(b, 'deadline') ? ` (by ${dateTime(str(b, 'deadline'))})` : ''}. Nothing is charged yet.`
          : approval === 'approved' ? `The host accepted your request. Pay${str(b, 'deadline') ? ` by ${dateTime(str(b, 'deadline'))}` : ''} to confirm.`
          : approval === 'rejected' ? `The host declined this request${str(b, 'approval_note') ? ': ' + str(b, 'approval_note') : '.'} Nothing was charged.` : 'This request expired. Nothing was charged.'} /></> : null}
        <Gap />
        <Card>
          <SectionTitle text="Price" />
          <PriceTable lines={lines} total={num(b, 'total')} extra={extra} />
        </Card>
        {msg ? <><Gap /><Notice text={msg} tone="bad" /></> : null}
        <Gap />
        {bool(b, 'can_pay') && (num(b, 'balance') || 0) > 0 ? (
          <View style={{ marginBottom: 8 }}>
            <GatewayPicker />
            {text(b, 'status') === 'confirmed' ? <PrimaryButton text={`Pay the balance · ${money(num(b, 'balance'))}`} onPress={() => pay('balance')} loading={busy} /> : (
              <>
                {usable > 0 ? (
                  <Pressable onPress={() => setUseWallet(!useWallet)} style={[st.row, { borderRadius: 16, backgroundColor: Brand.SunSoft, padding: 12, marginBottom: 8 }]}>
                    <Icon name={useWallet ? 'check-box' : 'check-box-outline-blank'} color={Brand.Blue} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Txt bold>Use my TripArro wallet: {money(usable)} off</Txt>
                      <Txt k="bodySmall" color={Brand.Muted}>Wallet balance {money(num(w, 'balance'))} · up to {Math.round(num(w, 'max_percent') || 0)}% of a booking</Txt>
                    </View>
                  </Pressable>
                ) : null}
                {(num(w, 'used') || 0) > 0 ? <Txt semi color={Brand.TealDark} style={{ marginBottom: 6 }}>{money(num(w, 'used'))} paid from your wallet.</Txt> : null}
                {bool(b, 'pay_full') || usable > 0 ? <PrimaryButton text={due <= 0.01 ? 'Pay from my wallet' : `Pay ${money(due)}`} onPress={() => pay('full')} loading={busy} /> : null}
                {(num(b, 'advance') || 0) > 0 && !(useWallet && usable > 0) && !(num(w, 'used') || 0) ? <><Gap h={8} /><OutlineButton text={`Pay the advance · ${money(num(b, 'advance'))}`} onPress={() => pay('advance')} /></> : null}
              </>
            )}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {str(b, 'invoice_url') ? <OutlineButton text="Invoice" icon="receipt-long" onPress={() => Nav.openPdf(str(b, 'invoice_url')!, 'Invoice')} /> : null}
          {str(b, 'directions_url') ? <OutlineButton text="Directions" icon="directions" onPress={() => Linking.openURL(str(b, 'directions_url')!).catch(() => {})} /> : null}
          {str(obj(b, 'host'), 'phone') ? <OutlineButton text="Host" icon="call" onPress={() => dial(str(obj(b, 'host'), 'phone')!)} /> : null}
        </View>
        {oc && !bool(oc, 'checked_in') ? <><Gap h={8} /><OutlineButton text={bool(oc, 'done') ? 'Online check-in sent ✓ — view' : 'Check in online before you arrive'} onPress={() => Nav.navigate('checkin?url=' + enc(text(oc, 'url')))} /></> : null}
        {bool(b, 'can_message') ? (
          <><Gap /><Card>
            <SectionTitle text="Messages" />
            {objs(b, 'messages').map((m, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Txt k="bodySmall" color={Brand.Muted}>{text(m, 'from').replace(/^./, (c) => c.toUpperCase())} · {dateTime(str(m, 'at'))}</Txt>
                <Txt>{text(m, 'body')}</Txt>
              </View>
            ))}
            <Field label="Write to the host" value={message} onChange={setMessage} lines={2} />
            <Gap h={6} />
            <PrimaryButton text="Send" disabled={!message.trim()} loading={busy} onPress={() => act(async () => { await Api.post(`bookings/${ref}/message`, { message }); setMessage(''); l.reload(); })} />
          </Card></>
        ) : null}
        {bool(b, 'can_review') ? (
          <><Gap /><Card>
            <SectionTitle text="How was your stay?" />
            <StarPicker label="Your rating" value={rating} onChange={setRating} />
            <Field label="Tell other guests about it" value={reviewText} onChange={setReviewText} lines={3} />
            <Gap h={6} />
            <PrimaryButton text="Publish review" disabled={rating === 0} loading={busy} onPress={() => act(async () => { await Api.post(`bookings/${ref}/review`, { rating, body: reviewText }); l.reload(); })} />
          </Card></>
        ) : null}
        {str(b, 'share_url') && text(b, 'status') === 'confirmed' ? <><Gap /><OutlineButton text="Share booking (WhatsApp, email…)" onPress={() => shareLink(`My TripArro booking ${text(b, 'ref')} at ${text(li, 'title')}`, str(b, 'share_url')!)} /></> : null}
        {bool(b, 'can_cancel') || bool(b, 'can_cancel_unpaid') ? (
          <><Gap /><LinkButton text="Cancel booking" color={Brand.Danger} onPress={() => act(async () => { setCancelQuote(obj(await Api.post('refunds', { ref, confirm: false }), 'quote') || {}); })} /></>
        ) : null}
      </ScrollView>
      <Dialog open={!!q} onClose={() => setCancelQuote(null)} title="Cancel this booking?"
        text={q ? ((num(q, 'paid') || 0) > 0 ? `You paid ${money(num(q, 'paid'))}. Under the policy you get back ${money(num(q, 'refund'))} (${int(q, 'percent')}%).`
          : 'Nothing has been paid, so nothing is charged.' + ((num(q, 'wallet_back') || 0) > 0 ? ` ${money(num(q, 'wallet_back'))} goes back to your wallet at once.` : '')) : ''}
        actions={[['Keep it', () => setCancelQuote(null), Brand.InkSoft], ['Cancel booking', () => { setCancelQuote(null); act(async () => { await Api.post('refunds', { ref, confirm: true }); AppState.bump(); }); }, Brand.Danger]]} />
    </View>
  );
}
