/*
 * Host tools in the app: "More" (every other page of the host dashboard, opened signed in), every listing on one
 * calendar, and checking a guest in with the ID card photographed with the camera or attached from the phone.
 * Aadhaar photos are masked on the phone (first 8 digits and the QR code blacked out) before they are sent.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { useLoader } from '../core/state';
import { J, int, num, objs, str, text } from '../core/json';
import { Picked, pickPhoto, shrinkPhoto } from '../core/files';
import { readId } from '../core/reader';
import { Brand } from '../theme';
import { Appear, Card, ColorHeader, ErrorBox, Gap, Icon, Loading, Notice, OutlineButton, Press, PrimaryButton, Txt, money, parseIso, prettyDate, st, today } from '../ui/kit';
import { CheckRow, Choice, Field } from '../ui/inputs';
import { Nav, intParam, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';
import { CalDay, DayPills, LaneDay, LaneKey, LaneMonth, MonthTitle, bookedPct, laneColor } from './HostCalendar';

const toolIcon = (k: string) => ({
  visitors: 'visibility', finance: 'payments', earnings: 'payments', payouts: 'payments', reports: 'bar-chart', revenue: 'bar-chart', petstats: 'bar-chart',
  calendar: 'calendar-month', rscal: 'calendar-month', subscription: 'workspace-premium', aicredit: 'auto-awesome', petai: 'auto-awesome', requests: 'inbox',
  pricing: 'trending-up', services: 'room-service', reviews: 'star', petrev: 'star', advertise: 'campaign', coupons: 'local-offer', fees: 'percent', faq: 'help-outline',
  terms: 'gavel', owncancel: 'gavel', evstations: 'electric-car', evres: 'electric-car', newbooking: 'person-add-alt', rsnew: 'person-add-alt', guests: 'how-to-reg',
  invoices: 'receipt', channels: 'sync', storage: 'storage', manual: 'menu-book', account: 'account-circle',
} as Record<string, string>)[k] || 'chevron-right';

export function HostToolsTab() {
  const l = useLoader(() => Api.get('hostapp/tools'));
  const d = l.data;
  let n = 0;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your tools.'} onRetry={l.reload} /> : (
        <>
          {objs(d, 'groups').map((g, gi) => {
            const rows: J[][] = []; objs(g, 'items').forEach((t, i) => { if (i % 3 === 0) rows.push([t]); else rows[rows.length - 1].push(t); });
            return (
              <View key={gi}>
                <Txt k="titleMedium" color={Brand.InkSoft} style={{ marginTop: 6, marginBottom: 8 }}>{text(g, 'title')}</Txt>
                {rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    {row.map((t) => (
                      <Appear key={text(t, 'key') + text(t, 'path')} index={n++} style={{ flex: 1 }}>
                        <Press onPress={() => Nav.openSite(text(t, 'path'), text(t, 'label'))} style={{ borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' }}>
                          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}><Icon name={toolIcon(text(t, 'key'))} size={22} color={Brand.Blue} /></View>
                          <Txt k="labelMedium" center numberOfLines={2} style={{ marginTop: 8 }}>{text(t, 'label')}</Txt>
                        </Press>
                      </Appear>
                    ))}
                    {Array.from({ length: 3 - row.length }, (_, i) => <View key={'e' + i} style={{ flex: 1 }} />)}
                  </View>
                ))}
              </View>
            );
          })}
          <Txt k="bodySmall" color={Brand.Muted}>These pages open your TripArro dashboard inside the app — you stay signed in.</Txt>
        </>
      )}
    </ScrollView>
  );
}

/* ---------- Every listing on one calendar ---------- */
export const stateColor = (s: string) => ({ booked: Brand.Blue, request: '#FFB020', platform: '#7E57C2', closed: '#B8B1AC', some: Brand.Sun } as Record<string, string>)[s] || '#FFFFFF';
export const addMonths = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const thisMonth = () => today().slice(0, 7);
export const leadDays = (iso: string) => { const d = parseIso(iso); return d ? (d.getDay() + 6) % 7 : 0; };   // Monday first

export function MonthHead({ label, sub, month, onMonth }: { label: string; sub?: string; month: string; onMonth: (m: string) => void }) {
  const canBack = month > thisMonth();
  return (
    <LinearGradient colors={['#C8242B', '#E8474B', '#F06A4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.row, { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 6, marginBottom: 10 }]}>
      <Pressable disabled={!canBack} onPress={() => onMonth(addMonths(month, -1))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', opacity: canBack ? 1 : 0.35 }} accessibilityLabel="Previous month"><Icon name="chevron-left" color="#fff" /></Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}><Txt k="titleMedium" color="#fff">{label}</Txt>{sub ? <Txt k="labelSmall" color="#FFE3E1">{sub}</Txt> : null}</View>
      <Pressable onPress={() => onMonth(addMonths(month, 1))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Next month"><Icon name="chevron-right" color="#fff" /></Pressable>
    </LinearGradient>
  );
}
export const WeekHead = () => <View style={{ flexDirection: 'row', marginBottom: 4 }}>{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => <Txt key={d} k="labelMedium" semi color={i >= 5 ? Brand.Blue : Brand.Muted} center style={{ flex: 1 }}>{d}</Txt>)}</View>;
export function weeks<T>(lead: number, days: T[]): (T | null)[][] { const cells: (T | null)[] = [...Array(lead).fill(null), ...days]; const out: (T | null)[][] = []; for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7)); return out; }

export function AllListingsCalendar({ d, month, onMonth, onListing }: { d: J; month: string; onMonth: (m: string) => void; onListing: (tag: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [month]);
  const tags = objs(d, 'listings').map((x) => text(x, 'tag'));
  const colors = tags.map((_, i) => laneColor(i));
  const toLane = (x?: J): LaneDay => ({ state: x ? text(x, 'state') : 'free', key: x ? (str(x, 'ref') || text(x, 'state') + '|' + text(x, 'label')) : '' });
  const days: CalDay[] = objs(d, 'days').map((c) => { const items = objs(c, 'items'); return { date: text(c, 'date'), lanes: tags.map((t) => toLane(items.find((x) => text(x, 'tag') === t))) }; });
  const before = objs(d, 'before');
  const prevLast = tags.map((t) => toLane(before.find((x) => text(x, 'tag') === t)));
  const day = objs(d, 'days').find((x) => text(x, 'date') === picked);
  return (
    <View>
      <MonthTitle label={text(d, 'label')} pct={bookedPct(days)} month={month} onMonth={onMonth} />
      <DayPills />
      <LaneMonth days={days} colors={colors} prevLast={prevLast} onDay={(c) => setPicked(c.date === picked ? null : c.date)} selected={(x) => x === picked} />
      <LaneKey />
      <Gap />
      {!day ? <Txt k="bodySmall" color={Brand.Muted}>Each colour is one of your listings. Tap a day to see who is staying where; tap a listing to close nights or change prices.</Txt> : (
        <Card>
          <Txt k="titleMedium">{prettyDate(text(day, 'date'))}</Txt>
          <Gap h={6} />
          {objs(day, 'items').map((x, i) => {
            const li = tags.indexOf(text(x, 'tag'));
            return (
              <Pressable key={i} onPress={() => onListing(text(x, 'tag'))} style={[st.row, { paddingVertical: 8 }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: laneColor(Math.max(0, li)) }} />
                <View style={{ flex: 1, paddingLeft: 10 }}>
                  <Txt numberOfLines={1}>{text(x, 'title')}</Txt>
                  <Txt k="labelSmall" color={text(x, 'state') === 'free' ? '#0B6B3A' : Brand.Muted} numberOfLines={1}>{str(x, 'label') || ({ free: 'Free', closed: 'Closed', booked: 'Booked', request: 'Request', platform: 'Other platform' } as Record<string, string>)[text(x, 'state')] || text(x, 'state')}</Txt>
                </View>
                <Icon name="chevron-right" color={Brand.Muted} />
              </Pressable>
            );
          })}
        </Card>
      )}
    </View>
  );
}

/* ---------- Check-in with the guest's ID ---------- */
type Guest = { name: string; type: string; number: string; online: number | null; front: string | null; back: string | null; scanning: boolean; note: [string, string] | null };
const newGuest = (name = '', online: number | null = null, type = 'aadhaar'): Guest => ({ name, type, number: '', online, front: null, back: null, scanning: false, note: null });

/** Take the ID photo with the camera, or attach one from the phone. */
function IdShot({ label, uri, done, onPick }: { label: string; uri: string | null; done: boolean; onPick: (p: Picked) => void }) {
  return (
    <View style={{ paddingVertical: 6 }}>
      <Txt k="titleSmall">{label}</Txt>
      <View style={[st.row, { marginTop: 6 }]}>
        <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: Brand.Sky, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`${label} photo`} /> : <Icon name={done ? 'check-circle-outline' : 'photo-camera'} color={done ? Brand.Teal : Brand.Blue} />}
        </View>
        <View style={{ flex: 1, paddingLeft: 10, gap: 6 }}>
          <OutlineButton text="Scan with camera" icon="photo-camera" onPress={async () => { const p = await pickPhoto('camera', { quality: 1 }); if (p) onPick(p); }} />
          <OutlineButton text="Attach a photo" icon="add-photo-alternate" onPress={async () => { const p = await pickPhoto('album', { quality: 1 }); if (p) onPick(p); }} />
        </View>
      </View>
    </View>
  );
}

export function HostCheckinScreen() {
  const id = intParam(useParams().id);
  const l = useLoader(() => Api.get(`hostapp/checkin/${id}`), [id]);
  const d = l.data;
  const [guests, setGuests] = useState<Guest[]>([]);
  const [arrived, setArrived] = useState('');
  const [verified, setVerified] = useState(false);
  const [noId, setNoId] = useState(false);
  const [collected, setCollected] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!d || guests.length) return;
    setArrived(String(Math.max(1, int(d, 'guests'))));
    const online = objs(d, 'online');
    setGuests(online.length ? online.map((o) => newGuest(text(o, 'name'), int(o, 'index'), str(o, 'type') || 'other')) : [newGuest(text(d, 'guest'))]);
  }, [d]);
  const upd = (i: number, p: Partial<Guest>) => setGuests((gs) => gs.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const types = objs(d, 'id_types').map((x) => [text(x, 'key'), text(x, 'label')] as [string, string]);
  const scanFront = async (i: number, picked: Picked) => {
    upd(i, { front: picked.uri, scanning: true, note: null });
    const r = await readId(picked).catch(() => null);   // reading never blocks the check-in: the photo is kept as it is
    setGuests((gs) => gs.map((g, j) => {
      if (j !== i) return g;
      if (!r) return { ...g, scanning: false };
      const n: Guest = { ...g, front: r.photo, scanning: false };
      if (r.type && types.some(([k]) => k === r.type)) n.type = r.type;
      if (r.number && !g.number) n.number = r.number;
      if (r.name && (!g.name || g.name === text(d, 'guest'))) n.name = r.name;
      n.note = !r.read ? ["This phone can't read text on photos — fill in the details yourself.", 'info']
        : r.type === 'aadhaar' && r.masked ? ['Aadhaar read — the first 8 digits and the QR code are blacked out on the photo. Check the name and number.', 'ok']
        : r.type === 'aadhaar' ? ['Aadhaar number not found to mask — retake the photo flat, in good light, so the number can be blacked out.', 'bad']
        : r.type ? ['ID read — check the name, type and number.', 'ok'] : ["Couldn't read this ID — fill in the details yourself, or retake it in good light.", 'info'];
      return n;
    }));
  };
  const scanBack = async (i: number, picked: Picked) => {
    upd(i, { back: picked.uri });
    // the back of an Aadhaar card has the number and a QR code too
    if (guests[i]?.type === 'aadhaar') { const r = await readId(picked).catch(() => null); if (r?.masked) upd(i, { back: r.photo }); }
  };
  const submit = async () => {
    setBusy(true); setErr(null);
    const fields: [string, string][] = [['guests_arrived', arrived], ['notes', notes]];
    if (verified) fields.push(['verified', '1']); if (noId) fields.push(['no_id', '1']); if (collected) fields.push(['collected', '1']);
    guests.forEach((g, i) => {
      fields.push([`name_${i}`, g.name], [`type_${i}`, g.type], [`number_${i}`, g.number]);
      if (g.online !== null && !g.front) fields.push([`online_${i}`, String(g.online)]);
    });
    // the ID photos as small JPEG files (a card stays readable at 1800 px); a slow or strict connection gets a smaller copy on the retry
    const photos = async (px: number) => {
      const files: Upload[] = [];
      for (let i = 0; i < guests.length; i++) {
        for (const [side, uri] of [['front', guests[i].front], ['back', guests[i].back]] as const) {
          if (!uri) continue;
          const s = await shrinkPhoto({ uri }, px);
          files.push({ field: `${side}_${i}`, uri: s.uri.startsWith('/') ? 'file://' + s.uri : s.uri, name: `hid${side[0]}${i}.jpg`, type: 'image/jpeg' });
        }
      }
      return files;
    };
    try {
      let files = await photos(1800);
      try { setDone(text(await Api.postMultipart(`hostapp/checkin/${id}`, fields, files), 'message', 'Checked in.')); }
      catch (e) {
        // the upload itself failed (connection dropped / too large for the server): once more with smaller photos
        if (!files.length || !(e instanceof ApiError) || !(e.status === 0 || e.status === 413 || e.status >= 500)) throw e;
        files = await photos(1100);
        setDone(text(await Api.postMultipart(`hostapp/checkin/${id}`, fields, files), 'message', 'Checked in.'));
      }
    } catch (e) { setErr(e instanceof ApiError && e.status === 413 ? 'The ID photos are too large for the website — retake them a little further away.' : errorText(e)); }
    setBusy(false);
  };
  const scanning = guests.some((g) => g.scanning);
  const bal = num(d, 'balance') || 0;
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Check in guest" sub={d ? `${text(d, 'guest')} · ${text(d, 'listing')}` : null} onBack={Nav.back} />
      {!d && l.loading ? <Loading /> : !d ? <View style={{ padding: 16 }}><ErrorBox message={l.error || 'Could not open the check-in.'} onRetry={l.reload} /></View>
        : done ? <View style={{ padding: 16 }}><Notice text={done} tone="ok" /><Gap /><PrimaryButton text="Back to my hosting" onPress={Nav.back} /></View>
        : d.checked_in ? <View style={{ padding: 16 }}><Notice text={`${text(d, 'guest')} is already checked in.`} tone="ok" /></View>
        : !d.can ? <View style={{ padding: 16 }}><Notice text={`Check-in opens on ${prettyDate(text(d, 'check_in'))} for confirmed bookings.`} /></View>
        : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
            <Card>
              <Txt k="titleMedium">Booking {text(d, 'ref')}</Txt>
              <Txt k="bodySmall" color={Brand.Muted}>{prettyDate(text(d, 'check_in'))} → {prettyDate(text(d, 'check_out'))} · {int(d, 'guests')} guests booked</Txt>
              <Gap h={10} />
              <Field label={`Guests who arrived (1–${int(d, 'max_guests')})`} value={arrived} onChange={(v) => setArrived(v.replace(/\D/g, '').slice(0, 2))} keyboard="number-pad" />
            </Card>
            <Gap />
            <Card>
              <Txt k="titleLarge">Guest IDs</Txt>
              <Txt k="bodySmall" color={Brand.Muted}>Scan each adult's ID card with the camera — the name, ID type and number fill in by themselves. On Aadhaar cards the first 8 digits and the QR code are blacked out on the photo before it is saved.</Txt>
              <Txt k="labelSmall" color={Brand.InkSoft} style={{ marginTop: 4 }}>{text(d, 'id_storage') === 'drive' ? "Saved privately in TripArro's Google Drive (Guest IDs folder, never shared)." : 'Saved privately on TripArro.'}</Txt>
              {guests.map((g, i) => (
                <View key={i} style={{ marginTop: 12 }}>
                  <View style={st.row}>
                    <Txt k="titleMedium" style={{ flex: 1 }}>Guest {i + 1}</Txt>
                    {i > 0 ? <Pressable onPress={() => setGuests((gs) => gs.filter((_, j) => j !== i))} style={{ padding: 8 }} accessibilityLabel="Remove guest"><Icon name="delete-outline" color={Brand.Danger} /></Pressable> : null}
                  </View>
                  {g.online !== null ? <Notice text="The guest sent this ID with their online check-in. Check it against the original card." tone="ok" /> : null}
                  <Field label="Name as on the ID" value={g.name} onChange={(v) => upd(i, { name: v })} /><Gap h={6} />
                  <Choice label="ID type" value={g.type} options={types} onChange={(v) => upd(i, { type: v })} /><Gap h={6} />
                  <Field label="ID number (optional)" value={g.number} onChange={(v) => upd(i, { number: v.slice(0, 30) })} />
                  <IdShot label={g.scanning ? 'ID — front (reading…)' : 'ID — front'} uri={g.front} done={g.online !== null} onPick={(p) => scanFront(i, p)} />
                  {g.note ? <Notice text={g.note[0]} tone={g.note[1]} /> : null}
                  <IdShot label="ID — back (optional)" uri={g.back} done={false} onPick={(p) => scanBack(i, p)} />
                </View>
              ))}
              {guests.length < Math.min(12, int(d, 'max_guests')) ? <><Gap h={8} /><OutlineButton text="Add a guest" icon="person-add-alt" onPress={() => setGuests((gs) => [...gs, newGuest()])} style={{ alignSelf: 'flex-start' }} /></> : null}
            </Card>
            <Gap />
            <CheckRow text="I have seen the original ID card" checked={verified} onChange={setVerified} />
            <CheckRow text="Check in without an ID (my choice)" checked={noId} onChange={setNoId} note="Only if the guest has no ID with them. It is noted on the booking." />
            {bal > 0 ? <CheckRow text={`I received the balance of ${money(bal)}`} checked={collected} onChange={setCollected} note="Otherwise the guest gets a payment link." /> : null}
            <Gap h={6} />
            <Field label="Notes (optional)" value={notes} onChange={(v) => setNotes(v.slice(0, 500))} lines={2} />
            {err ? <><Gap h={8} /><Notice text={err} tone="bad" /></> : null}
            <Gap />
            <PrimaryButton text={scanning ? 'Reading the ID…' : 'Check in'} icon="how-to-reg" onPress={submit} loading={busy} disabled={scanning} />
          </ScrollView>
        )}
    </View>
  );
}
