// Tickets in My trips: found in Gmail (only when the guest allows it), or added by hand — shown as boarding passes.
import React, { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Api, errorText } from '../core/api';
import { useAppState, useLoader } from '../core/state';
import { J, bool, int, objs, str, text } from '../core/json';
import { Brand, Fonts } from '../theme';
import { Appear, BackBar, Card, ErrorBox, Gap, Icon, LinkButton, Loading, Notice, OutlineButton, PrimaryButton, Txt, parseIso, clock, st } from '../ui/kit';
import { Field } from '../ui/inputs';
import { Dialog } from '../ui/sheets';
import { Floaty } from '../ui/cards';
import { handleIncomingLink } from '../links';
import { Nav, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

export const kindIcon = (kind: string) => ({ flight: 'flight', train: 'train', bus: 'directions-bus', ferry: 'directions-boat', cab: 'local-taxi' } as Record<string, string>)[kind] || 'confirmation-number';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const timeText = (iso?: string | null) => { const d = parseIso(iso); return d && /[ T]\d{2}:\d{2}/.test(iso || '') ? clock(d) : ''; };
const dayText = (iso?: string | null) => { const d = parseIso(iso); return d ? `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` : ''; };
/** A short code for a place: "Chennai Central" → "CHE" (an airport code like "MAA" stays as it is). */
function placeCode(p: string) {
  const t = p.trim(); if (!t) return '—';
  const m = /\(([A-Z]{3,4})\)/.exec(t); if (m) return m[1];
  if (t.length <= 4 && /^[A-Za-z]+$/.test(t)) return t.toUpperCase();
  return t.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
}

function Detail({ label, value, flex }: { label: string; value: string; flex: number }) {
  return <View style={{ flex }}><Txt k="labelSmall" color={Brand.Muted} style={{ letterSpacing: 0.5 }}>{label.toUpperCase()}</Txt><Txt k="titleSmall" bold numberOfLines={1}>{value}</Txt></View>;
}

/** A ticket as a boarding pass: operator, big FROM → TO codes with times, a tear line with side notches, then PNR, seat, class, travellers. */
export function BoardingPass({ t, children }: { t: J; children?: ReactNode }) {
  const kind = text(t, 'kind');
  const dots = (k: string) => <View style={{ flexDirection: 'row', gap: 4 }}>{[0, 1, 2, 3].map((i) => <View key={k + i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6B656080' }} />)}</View>;
  return (
    <Appear style={{ marginBottom: 12 }}>
      <View style={[st.card, { borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', overflow: 'hidden' }]}>
        <LinearGradient colors={['#D7192A1F', '#FFC72C08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150, paddingHorizontal: 18, paddingVertical: 14 }}>
          <View style={st.row}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: Brand.Blue, alignItems: 'center', justifyContent: 'center' }}><Icon name={kindIcon(kind)} size={17} color="#fff" /></View>
            <Txt k="titleSmall" numberOfLines={1} style={{ flex: 1, marginLeft: 8 }}>{text(t, 'provider') || kind.replace(/^./, (c) => c.toUpperCase())}</Txt>
            <Txt k="labelSmall" bold color={Brand.Blue}>{text(t, 'status') === 'found' ? 'FOUND IN GMAIL' : kind.toUpperCase()}</Txt>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 30, fontFamily: Fonts.b, color: Brand.Ink, letterSpacing: 1 }}>{placeCode(text(t, 'from'))}</Text>
              <Txt k="labelSmall" color={Brand.InkSoft} numberOfLines={1}>{text(t, 'from') || 'From'}</Txt>
              {timeText(str(t, 'depart_at')) ? <Txt k="titleSmall" color={Brand.Blue}>{timeText(str(t, 'depart_at'))}</Txt> : null}
            </View>
            <View style={[st.row, { paddingHorizontal: 6, paddingBottom: 18 }]}>
              {dots('a')}<Floaty distance={3}><Icon name={kindIcon(kind)} size={22} color={Brand.Blue} style={{ marginHorizontal: 4 }} /></Floaty>{dots('b')}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 30, fontFamily: Fonts.b, color: Brand.Ink, letterSpacing: 1 }}>{placeCode(text(t, 'to'))}</Text>
              <Txt k="labelSmall" color={Brand.InkSoft} numberOfLines={1}>{text(t, 'to') || 'To'}</Txt>
              {timeText(str(t, 'arrive_at')) ? <Txt k="titleSmall" color={Brand.Blue}>{timeText(str(t, 'arrive_at'))}</Txt> : null}
            </View>
          </View>
        </LinearGradient>
        <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 18 }}>{Array.from({ length: 28 }, (_, i) => <View key={i} style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: '#6B656059' }} />)}</View>
        <View style={{ position: 'absolute', left: -12, top: 138, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F7EFEA' }} />
        <View style={{ position: 'absolute', right: -12, top: 138, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F7EFEA' }} />
        <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            <Detail label="Date" value={dayText(str(t, 'depart_at')) || '—'} flex={1.4} />
            <Detail label="PNR / booking" value={text(t, 'ref') || '—'} flex={1.3} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Detail label="Seat" value={text(t, 'seat') || '—'} flex={1} />
            <Detail label="Class" value={text(t, 'travel_class') || '—'} flex={1} />
            <Detail label="Travellers" value={int(t, 'travellers') > 0 ? String(int(t, 'travellers')) : '—'} flex={0.8} />
          </View>
          {text(t, 'source') === 'gmail' && text(t, 'title') ? <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1} style={{ marginTop: 10 }}>From your email: {text(t, 'title')}</Txt> : null}
          {children ? <View style={{ marginTop: 10 }}>{children}</View> : null}
        </View>
      </View>
    </Appear>
  );
}

function TicketCard({ t, onKeep, onShare, onDelete }: { t: J; onKeep?: () => void; onShare?: () => void; onDelete: () => void }) {
  return (
    <BoardingPass t={t}>
      <View style={[st.row, { gap: 8 }]}>
        {onKeep ? <PrimaryButton text="Keep in My trips" onPress={onKeep} style={{ flex: 1 }} /> : null}
        {onShare ? <OutlineButton text="Share with group" icon="groups" onPress={onShare} style={{ flex: 1 }} /> : null}
        <LinkButton text={onKeep ? 'Not mine' : 'Delete'} color={Brand.Muted} onPress={onDelete} />
      </View>
    </BoardingPass>
  );
}

export function TicketsList({ message }: { message?: string | null }) {
  const tick = useAppState('refreshTick');
  const l = useLoader(() => Api.get('tickets'), [tick]);
  const [data, setData] = useState<J | null>(null);
  useEffect(() => { if (l.data) setData(l.data); }, [l.data]);
  const [consent, setConsent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(0);
  const [shared, setShared] = useState<string | null>(null);
  const act = async (path: string) => { try { const r = await Api.post(path); setData((d) => ({ ...(d || {}), items: r.items })); setErr(null); } catch (e) { setErr(errorText(e)); } };
  const gmail = async () => {
    setConsent(false); setBusy(true);
    try {
      const url = text(await Api.post('tickets/gmail'), 'url');
      const r = await WebBrowser.openAuthSessionAsync(url, 'triparro-app://tickets', { showTitle: true });
      if (r.type === 'success' && r.url) handleIncomingLink(r.url);
    } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  const d = data;
  const items = objs(d, 'items');
  const found = items.filter((x) => text(x, 'status') === 'found');
  const saved = items.filter((x) => text(x, 'status') === 'saved');
  const upcoming = saved.filter((x) => bool(x, 'upcoming') || !str(x, 'depart_at'));
  const past = saved.filter((x) => !upcoming.includes(x));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
      {message ? <><Notice text={message} tone={message.startsWith('Found') ? 'ok' : 'info'} /><Gap /></> : null}
      <Card>
        <View style={st.row}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}><Icon name="confirmation-number" color={Brand.Blue} /></View>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Txt k="titleMedium">Your travel tickets</Txt>
            <Txt k="bodySmall" color={Brand.InkSoft}>Flights, trains and buses next to your stays — find them in Gmail or add them yourself.</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {d?.gmail !== false ? <PrimaryButton text="Find in Gmail" icon="mail-outline" onPress={() => setConsent(true)} loading={busy} style={{ flex: 1 }} /> : null}
          <OutlineButton text="Add by hand" icon="add" onPress={() => setAdding(true)} style={{ flex: 1 }} />
        </View>
      </Card>
      {err ? <><Gap /><Notice text={err} tone="bad" /></> : null}
      {shared ? <><Gap /><Notice text={shared} tone="ok" /></> : null}
      <Gap />
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your tickets.'} onRetry={l.reload} /> : (
        <>
          {found.length ? <><Txt k="titleMedium" style={{ marginBottom: 8 }}>Found in Gmail — keep the ones you want</Txt>{found.map((t) => <TicketCard key={int(t, 'id')} t={t} onKeep={() => act(`tickets/${int(t, 'id')}/keep`)} onDelete={() => act(`tickets/${int(t, 'id')}/delete`)} />)}<Gap /></> : null}
          {upcoming.length ? <><Txt k="titleMedium" style={{ marginBottom: 8 }}>Upcoming</Txt>{upcoming.map((t) => <TicketCard key={int(t, 'id')} t={t} onShare={() => setSharing(int(t, 'id'))} onDelete={() => act(`tickets/${int(t, 'id')}/delete`)} />)}</> : null}
          {past.length ? <><Gap /><Txt k="titleMedium" color={Brand.Muted} style={{ marginBottom: 8 }}>Past</Txt>{past.map((t) => <TicketCard key={int(t, 'id')} t={t} onShare={() => setSharing(int(t, 'id'))} onDelete={() => act(`tickets/${int(t, 'id')}/delete`)} />)}</> : null}
          {!found.length && !saved.length ? <Txt color={Brand.Muted} style={{ padding: 8 }}>No tickets yet.</Txt> : null}
        </>
      )}
      <Dialog open={consent} onClose={() => setConsent(false)} title="Find tickets in your Gmail?"
        actions={[['Not now', () => setConsent(false), Brand.InkSoft], ['Continue to Google', gmail]]}>
        <Txt>Google will ask you to let TripArro read your email. If you allow it, TripArro will:</Txt>
        {['search once for ticket and booking emails from the last year', 'read only the trip details — where, when, PNR, seat', 'give the Gmail permission back straight away', 'show you what it found; nothing is saved until you tap Keep'].map((x) => <Txt key={x} k="bodySmall" color={Brand.InkSoft} style={{ marginTop: 4 }}>• {x}</Txt>)}
        <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 10 }}>{text(d, 'gmail_note') || 'We never keep your emails.'}</Txt>
      </Dialog>
      {sharing > 0 ? <ShareTicketDialog ticketId={sharing} onClose={() => setSharing(0)} onShared={(m) => { setSharing(0); setShared(m); }} /> : null}
      {adding ? <AddTicketDialog onClose={() => setAdding(false)} onDone={(r) => { setAdding(false); setData((x) => ({ ...(x || {}), items: r.items })); }} /> : null}
    </ScrollView>
  );
}

/** Share a ticket with one of your group trips (or keep it just for you — it already is). */
function ShareTicketDialog({ ticketId, onClose, onShared }: { ticketId: number; onClose: () => void; onShared: (m: string) => void }) {
  const l = useLoader(async () => objs(await Api.get('trip-groups'), 'items'), [ticketId]);
  const [err, setErr] = useState<string | null>(null);
  const groups = l.data;
  return (
    <Dialog open onClose={onClose} title="Share with a group trip" actions={[['Keep just for me', onClose]]}>
      <ScrollView style={{ maxHeight: 380 }}>
        <Txt k="bodySmall" color={Brand.InkSoft}>Your family or friends in the trip will see this boarding pass (route, times, PNR, seat). It stays in your own My trips too.</Txt>
        <Gap h={8} />
        {!groups && l.loading ? <Loading /> : !groups?.length ? <Txt color={Brand.Muted}>You're not in a group trip yet — make one in My trips → Group trips.</Txt> : groups.map((g) => (
          <Pressable key={int(g, 'id')} onPress={async () => { try { await Api.post(`trip-groups/${int(g, 'id')}/items`, { kind: 'ticket', ref: ticketId }); onShared('Shared with ' + text(g, 'title') + '.'); } catch (e) { setErr(errorText(e)); } }}
            style={[st.row, { marginVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: Brand.Line, padding: 12 }]}>
            <Icon name="groups" color={Brand.Blue} />
            <View style={{ flex: 1, paddingLeft: 10 }}><Txt k="titleSmall">{text(g, 'title')}</Txt><Txt k="labelSmall" color={Brand.Muted}>{int(g, 'members')} people{text(g, 'dates') ? ' · ' + text(g, 'dates') : ''}</Txt></View>
            <Txt bold color={Brand.Coral}>Share</Txt>
          </Pressable>
        ))}
        {err ? <Notice text={err} tone="bad" style={{ marginTop: 8 }} /> : null}
      </ScrollView>
    </Dialog>
  );
}

function AddTicketDialog({ onClose, onDone }: { onClose: () => void; onDone: (r: J) => void }) {
  const [kind, setKind] = useState('train');
  const [f, setF] = useState({ provider: '', ref: '', from: '', to: '', depart: '', seat: '', people: '' });
  const set = (k: keyof typeof f, max: number) => (v: string) => setF((x) => ({ ...x, [k]: v.slice(0, max) }));
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    try { onDone(await Api.post('tickets', { kind, provider: f.provider, booking_ref: f.ref, from: f.from, to: f.to, depart: f.depart, seat: f.seat, travellers: parseInt(f.people, 10) || null })); }
    catch (e) { setErr(errorText(e)); }
  };
  return (
    <Dialog open onClose={onClose} title="Add a ticket" actions={[['Cancel', onClose, Brand.InkSoft], ['Save ticket', save]]}>
      <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[['flight', 'Flight'], ['train', 'Train'], ['bus', 'Bus'], ['ferry', 'Ferry'], ['event', 'Event'], ['other', 'Other']].map(([v, l]) => (
            <Pressable key={v} onPress={() => setKind(v)} style={{ borderRadius: 50, backgroundColor: kind === v ? Brand.Blue : Brand.Sky, paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" color={kind === v ? '#fff' : Brand.InkSoft}>{l}</Txt></Pressable>
          ))}
        </ScrollView>
        <Gap h={8} />
        <Field label="From" value={f.from} onChange={set('from', 100)} /><Gap h={6} />
        <Field label="To" value={f.to} onChange={set('to', 100)} /><Gap h={6} />
        <Field label="Leaves (YYYY-MM-DD HH:MM)" value={f.depart} onChange={set('depart', 16)} /><Gap h={6} />
        <Field label="Airline / train / operator" value={f.provider} onChange={set('provider', 80)} /><Gap h={6} />
        <Field label="PNR / booking number" value={f.ref} onChange={set('ref', 30)} autoCapitalize="none" /><Gap h={6} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field label="Seat" value={f.seat} onChange={set('seat', 60)} style={{ flex: 1 }} />
          <Field label="People" value={f.people} onChange={(v) => setF((x) => ({ ...x, people: v.replace(/\D/g, '').slice(0, 2) }))} keyboard="number-pad" style={{ width: 100 }} />
        </View>
        {err ? <Notice text={err} tone="bad" style={{ marginTop: 8 }} /> : null}
      </ScrollView>
    </Dialog>
  );
}

/** The tickets screen opened when the browser hands back from Gmail (with what was found). */
export function TicketsScreen() {
  const msg = useParams().msg;
  return <View style={{ flex: 1 }}><BackBar title="Tickets" onBack={Nav.back} /><TicketsList message={msg || null} /></View>;
}
