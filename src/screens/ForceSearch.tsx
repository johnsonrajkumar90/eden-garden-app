/*
 * Force search — an emergency stay search.
 *   Guest: ForceSearchScreen — where, guests, stay type, reason, nights → a radar until a host accepts → the stay → book.
 *   Host:  ForceHostCard (switch with the explanation, guests searching nearby) and ForceRinger (rings with a soft tune and
 *          shows the request full screen; accept or ignore). See the website's Eden/lib/force_search.php.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState as RNAppState, Easing, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Api, errorText } from '../core/api';
import { AppState, useSession } from '../core/state';
import * as Loc from '../core/location';
import { J, arr, bool, int, num, obj, objs, str, text } from '../core/json';
import { Brand } from '../theme';
import { BackBar, Card, Gap, Icon, Loading, Notice, OutlineButton, Photo, PrimaryButton, Txt, money, st } from '../ui/kit';
import { CheckRow, Field, Stepper } from '../ui/inputs';
import { Nav } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

const RED = '#D7192A';
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

/* ===================== Guest ===================== */

export default function ForceSearchScreen() {
  const s = useSession();
  const [opts, setOpts] = useState<J | null>(null);
  const [search, setSearch] = useState<J | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Api.get('force/options').then(setOpts).catch(() => setOpts({}));
    if (!s?.user) { setLoading(false); return; }
    Api.get('force/current').then((j) => setSearch(obj(j, 'search'))).catch(() => {}).finally(() => setLoading(false));
  }, [s?.user?.id]);

  if (!s?.user) return (
    <View style={{ flex: 1 }}>
      <BackBar title="Force search" onBack={Nav.back} />
      <View style={{ padding: 16 }}>
        <Intro />
        <Gap />
        <PrimaryButton text="Sign in to start" onPress={() => { AppState.set({ authMessage: 'Sign in to use Force search.' }); Nav.navigate('login'); }} />
      </View>
    </View>
  );
  if (loading) return <View style={{ flex: 1 }}><BackBar title="Force search" onBack={Nav.back} /><Loading /></View>;
  if (search) return <Radar initial={search} onDone={() => setSearch(null)} />;
  return <ForceForm opts={opts || {}} onStarted={setSearch} />;
}

function Intro() {
  return (
    <LinearGradient colors={['#B3122A', RED, '#FF6A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18 }}>
      <View style={[st.row, { gap: 12 }]}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Icon name="radar" color="#fff" size={26} /></View>
        <View style={{ flex: 1 }}>
          <Txt k="titleLarge" color="#fff">Need a stay right now?</Txt>
          <Txt k="bodySmall" color="#FFE3DE">Force search rings hosts near you who have a room free tonight. The first host to accept is shown to you — at the normal price.</Txt>
        </View>
      </View>
    </LinearGradient>
  );
}

function ForceForm({ opts, onStarted }: { opts: J; onStarted: (s: J) => void }) {
  const [where, setWhere] = useState<'gps' | 'place'>('gps');
  const [place, setPlace] = useState('');
  const [fix, setFix] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [nights, setNights] = useState(1);
  const [type, setType] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const locate = async () => {
    setLocMsg('Finding you…');
    const r = await Loc.current(15000, true);
    if (r.kind === 'found') { setFix({ lat: r.lat, lng: r.lng }); setLocMsg('📍 Your location is set'); } else { setFix(null); setLocMsg(Loc.locMessage(r)); }
  };
  useEffect(() => { if (where === 'gps' && !fix) locate(); }, [where]);

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      let pt = fix;
      let name = 'Your location';
      if (where === 'place') {
        const g = await Api.get('geocode', { q: place.trim() });
        const la = num(g, 'lat'), ln = num(g, 'lng');
        if (la === null || ln === null) throw new Error('That place was not found — try a town name.');
        pt = { lat: la, lng: ln }; name = place.trim();
      }
      if (!pt) throw new Error('Turn on your location, or type a place.');
      onStarted(await Api.post('force', { lat: pt.lat, lng: pt.lng, place: name, guests, nights, stay_type: type, reason, note: note.trim() }));
    } catch (e: any) { setErr(e?.message && !(e instanceof Error && 'status' in e) ? e.message : errorText(e)); }
    setBusy(false);
  };

  const chip = (on: boolean, label: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1.5, borderColor: on ? RED : Brand.Line, backgroundColor: on ? '#FFF1EE' : '#fff', marginRight: 8, marginBottom: 8 }}>
      <Txt k="labelLarge" color={on ? RED : Brand.InkSoft}>{label}</Txt>
    </Pressable>
  );
  const types: string[] = (arr(opts, 'stay_types') as any[]).map(String);
  const reasons = objs(opts, 'reasons');
  const ready = !!reason && (where === 'gps' ? !!fix : place.trim().length > 1);

  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Force search" onBack={Nav.back} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
        <Intro />
        <Gap />
        <Txt k="titleMedium">Where do you need the stay?</Txt>
        <Gap h={8} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {chip(where === 'gps', '📍 My location (GPS)', () => setWhere('gps'))}
          {chip(where === 'place', '🔎 Type a place', () => setWhere('place'))}
        </View>
        {where === 'gps' ? (
          <View style={[st.row, { gap: 10 }]}>
            <Txt k="bodySmall" color={fix ? '#0B6B3A' : Brand.InkSoft} style={{ flex: 1 }}>{locMsg || ' '}</Txt>
            <OutlineButton text="Locate again" icon="my-location" onPress={locate} />
          </View>
        ) : <Field label="Town or area" value={place} onChange={setPlace} placeholder="e.g. Ooty bus stand" />}
        <Gap />
        <Stepper label="Guests" value={guests} onChange={setGuests} min={1} max={20} />
        <Gap h={10} />
        <Stepper label="Nights (from tonight)" value={nights} onChange={setNights} min={1} max={num(opts, 'max_nights') || 7} />
        <Gap />
        <Txt k="titleMedium">Stay type</Txt>
        <Gap h={8} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {chip(type === '', 'Any stay', () => setType(''))}
          {types.map((t) => chip(type === t, t, () => setType(t)))}
        </View>
        <Gap h={6} />
        <Txt k="titleMedium">Reason</Txt>
        <Gap h={8} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {reasons.map((r) => chip(reason === text(r, 'value'), text(r, 'label'), () => setReason(text(r, 'value'))))}
        </View>
        <Field label="Anything hosts should know? (optional)" value={note} onChange={setNote} lines={2} maxLength={300} />
        <Gap />
        {err ? <><Notice tone="bad" text={err} /><Gap h={8} /></> : null}
        <PrimaryButton text="Start Force search" icon="radar" loading={busy} disabled={!ready} onPress={start} />
        <Txt k="labelSmall" color={Brand.Muted} center style={{ marginTop: 8 }}>Hosts see the area and distance — never your exact location or phone number. The search runs for {num(opts, 'minutes') || 30} minutes.</Txt>
      </ScrollView>
    </View>
  );
}

/** The radar: pulsing rings and a sweeping beam until a host accepts; then the stay. */
function Radar({ initial, onDone }: { initial: J; onDone: () => void }) {
  const [s, setS] = useState<J>(initial);
  const [left, setLeft] = useState(int(initial, 'seconds_left') || 0);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const id = int(s, 'id');
  const status = text(s, 'status');

  useEffect(() => {
    const a = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, []);
  useEffect(() => {   // the website's answer every few seconds
    if (!['searching', 'accepted'].includes(status)) return;
    const t = setInterval(() => { Api.get(`force/${id}`).then((j) => { setS(j); setLeft(int(j, 'seconds_left') || 0); }).catch(() => {}); }, 4000);
    return () => clearInterval(t);
  }, [id, status]);
  useEffect(() => { const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, []);

  const offer = obj(s, 'offer');
  const cancel = async () => { setBusy('cancel'); try { await Api.post(`force/${id}/cancel`); } catch {} onDone(); };
  const decline = async () => { setBusy('decline'); setErr(null); try { setS(await Api.post(`force/${id}/decline`)); } catch (e) { setErr(errorText(e)); } setBusy(''); };
  const book = async () => {
    if (!offer) return;
    setBusy('book'); setErr(null);
    try {
      const pid = int(offer, 'id');
      const q = await Api.get('availability', { kind: 'stay', id: pid, check_in: text(s, 'check_in'), check_out: text(s, 'check_out'), adults: int(s, 'guests') || 1 });
      if (q.available === false) throw new Error(text(q, 'message') || 'This stay is no longer free.');
      AppState.set({ reserve: { kind: 'stay', id: pid, title: text(offer, 'title'), image: str(offer, 'image'), checkIn: text(s, 'check_in'), checkOut: text(s, 'check_out'),
        adults: int(s, 'guests') || 1, ages: [], food: false, coupon: '', roomId: null, planId: null, rooms: 1, quote: { ...q, booking_mode: 'instant' }, forceSearch: id } as any });
      Nav.navigate('reserve');
    } catch (e: any) { setErr(e?.message || errorText(e)); }
    setBusy('');
  };

  const ended = ['expired', 'cancelled', 'booked'].includes(status);
  const ring = (delay: number) => {
    const v = Animated.modulo(Animated.add(pulse, delay), 1);
    return <Animated.View key={delay} pointerEvents="none" style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1.15] }) }] }} />;
  };

  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Force search" onBack={Nav.back} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
        {status === 'accepted' && offer ? (
          <Card padding={0}>
            <Photo url={str(offer, 'image')} style={{ width: '100%', height: 190 }} corner={22} />
            <View style={{ padding: 16 }}>
              <View style={[st.row, { gap: 8 }]}><Icon name="verified" color="#0B6B3A" /><Txt k="titleSmall" color="#0B6B3A">A host accepted your search</Txt></View>
              <Gap h={6} />
              <Txt k="titleLarge">{text(offer, 'title')}</Txt>
              <Txt color={Brand.InkSoft}>{text(offer, 'type')} · {text(offer, 'location')} · {num(offer, 'km')} km away</Txt>
              {num(obj(offer, 'price'), 'total') ? <Txt k="titleMedium" style={{ marginTop: 6 }}>{money(num(obj(offer, 'price'), 'total') || 0)} for {int(s, 'nights')} night{int(s, 'nights') > 1 ? 's' : ''}</Txt> : null}
              <Txt k="bodySmall" color={Brand.Muted}>{int(s, 'guests')} guest{int(s, 'guests') > 1 ? 's' : ''} · from tonight · hold ends in {mmss(left)}</Txt>
              <Gap />
              {err ? <><Notice tone="bad" text={err} /><Gap h={8} /></> : null}
              <PrimaryButton text="Accept and book" icon="event-available" loading={busy === 'book'} onPress={book} />
              <Gap h={8} />
              <View style={[st.row, { gap: 8 }]}>
                <OutlineButton text="Directions" icon="directions" style={{ flex: 1 }} onPress={() => { const c = arr(offer, 'coords') as number[]; Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${c[0]},${c[1]}`).catch(() => {}); }} />
                <OutlineButton text="No, keep searching" style={{ flex: 1 }} onPress={decline} />
              </View>
            </View>
          </Card>
        ) : (
          <>
            <LinearGradient colors={['#7A0C18', '#B3122A', RED]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, paddingVertical: 28, alignItems: 'center', overflow: 'hidden' }}>
              <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
                {[0, 0.33, 0.66].map(ring)}
                {[230, 160, 90].map((d) => <View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }} />)}
                {!ended ? (
                  <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 230, height: 230, transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                    <LinearGradient colors={['rgba(255,214,107,0.55)', 'rgba(255,214,107,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 115, top: 113, width: 115, height: 4, borderRadius: 2 }} />
                  </Animated.View>
                ) : null}
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFC42E', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' }}><Icon name="person-pin-circle" color="#5A1A00" size={30} /></View>
              </View>
              <Txt k="titleLarge" color="#fff" center>{ended ? (status === 'expired' ? 'No host accepted in time' : status === 'booked' ? 'Booked' : 'Search stopped') : 'Searching for hosts near you…'}</Txt>
              <Txt k="bodySmall" color="#FFE3DE" center style={{ marginTop: 4, paddingHorizontal: 20 }}>
                {ended ? (status === 'expired' ? 'Try a nearby town, change the stay type — or call TripArro support and we will help.' : ' ')
                  : `${text(s, 'place') || 'Your location'} · ${int(s, 'guests')} guest${int(s, 'guests') > 1 ? 's' : ''} · ${int(s, 'nights')} night${int(s, 'nights') > 1 ? 's' : ''} · ${mmss(left)} left`}
              </Txt>
              {!ended && s.hosts_nearby !== null && s.hosts_nearby !== undefined ? <Txt k="labelLarge" color="#FFD36B" style={{ marginTop: 8 }}>{int(s, 'hosts_nearby') ? `${int(s, 'hosts_nearby')} host${int(s, 'hosts_nearby') > 1 ? 's' : ''} with a free stay nearby — ringing now` : 'No free stays nearby yet — still looking'}</Txt> : null}
            </LinearGradient>
            <Gap />
            {ended ? <PrimaryButton text="New Force search" icon="radar" onPress={onDone} />
              : <OutlineButton text="Stop searching" icon="close" onPress={cancel} />}
            {AppState.get() && Api.session?.supportPhone ? <><Gap h={8} /><OutlineButton text="Call TripArro support" icon="call" onPress={() => Linking.openURL('tel:' + Api.session!.supportPhone).catch(() => {})} /></> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** The floating Force search button (main tabs). */
export function ForceFab({ bottom }: { bottom: number }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  return (
    <View style={{ position: 'absolute', right: 16, bottom, width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 62, height: 62, borderRadius: 31, backgroundColor: RED,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }] }} />
      <Pressable onPress={() => Nav.navigate('force')} accessibilityRole="button" accessibilityLabel="Force search — find a stay right now"
        style={{ width: 62, height: 62, borderRadius: 31, elevation: 12, shadowColor: RED, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
        <LinearGradient colors={['#B3122A', RED, '#FF6A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 31, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="radar" color="#fff" size={30} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/* ===================== Host ===================== */

/** Hosting dashboard: switch Force search on (after reading how it works) and the guests searching nearby. */
export function ForceHostCard() {
  const [d, setD] = useState<J | null>(null);
  const [explain, setExplain] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = () => Api.get('force/host').then(setD).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  if (!d) return null;
  const on = bool(d, 'on');
  const sw = async (v: boolean) => {
    setBusy(true); setErr(null);
    try { setD(await Api.post('force/host/switch', { on: v, agree: v ? agree : false })); setExplain(false); } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  const list = objs(d, 'searches');
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={[st.row, { gap: 12 }]}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: on ? '#FFE4E1' : Brand.Field, alignItems: 'center', justifyContent: 'center' }}><Icon name="radar" color={on ? RED : Brand.Muted} /></View>
        <View style={{ flex: 1 }}><Txt k="titleMedium">Force search</Txt><Txt k="bodySmall" color={Brand.Muted}>{on ? `On — your phone rings when a guest within ${num(d, 'radius_km')} km needs a stay tonight` : 'Get guests who need a stay right now'}</Txt></View>
        <OutlineButton text={on ? 'Turn off' : 'Turn on'} onPress={() => (on ? sw(false) : setExplain(true))} />
      </View>
      {on && !int(d, 'stays_on_map') ? <><Gap h={8} /><Notice tone="warn" text="Add the map location to your stays (My listings) — Force search only finds stays on the map." /></> : null}
      {on ? (
        <>
          <Gap h={10} />
          <Txt k="titleSmall">Guests searching nearby</Txt>
          {!list.length ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 4 }}>Nobody is searching near your free stays right now.</Txt> : null}
          {list.map((r) => <ForceRequest key={int(r, 'id')} r={r} done={load} compact />)}
        </>
      ) : null}
      <Modal visible={explain} transparent animationType="fade" onRequestClose={() => setExplain(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,10,12,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '90%' }}>
            <ScrollView>
              <Txt k="titleLarge">How Force search works</Txt>
              <Gap h={10} />
              {[
                ['notifications-active', `A guest near you needs a stay tonight (stranded, arrived late, a family or medical emergency). If you have a free stay within ${num(d, 'radius_km')} km, your phone rings with a soft tune.`],
                ['visibility', 'You see how many guests, how many nights, the stay type, the reason and how far away they are — never their exact location or phone number.'],
                ['touch-app', 'Accept or ignore. The first host to accept gets the guest — the other phones stop ringing. An ignored guest is not shown to you again for that search.'],
                ['payments', 'The guest sees your stay at its normal price and books it in the app — the normal booking, payment and invoice.'],
                ['percent', `For bookings that come from Force search, TripArro charges ${num(d, 'extra_pct')}% extra commission on top of your usual commission.`],
                ['event-busy', 'Only free stays are shown: a stay that is booked or closed for those nights never rings.'],
              ].map(([ic, t]) => (
                <View key={ic} style={[st.row, { gap: 12, alignItems: 'flex-start', marginBottom: 10 }]}><Icon name={ic} color={RED} /><Txt color={Brand.InkSoft} style={{ flex: 1 }}>{t}</Txt></View>
              ))}
              <CheckRow text={`I understand and agree to the extra ${num(d, 'extra_pct')}% commission on Force search bookings`} checked={agree} onChange={setAgree} />
              <Gap />
              {err ? <><Notice tone="bad" text={err} /><Gap h={8} /></> : null}
              <PrimaryButton text="Turn on Force search" icon="radar" disabled={!agree} loading={busy} onPress={() => sw(true)} />
              <Gap h={8} />
              <OutlineButton text="Not now" onPress={() => setExplain(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

/** One guest's Force search, for a host: accept with one of the free stays, or ignore. */
function ForceRequest({ r, done, compact }: { r: J; done: () => void; compact?: boolean }) {
  const stays = objs(r, 'stays');
  const [pick, setPick] = useState(int(stays[0], 'id'));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const accept = async () => { setBusy('accept'); try { const j = await Api.post(`force/host/${int(r, 'id')}/accept`, { property: pick }); setMsg(text(j, 'message')); setTimeout(done, 1500); } catch (e) { setMsg(errorText(e)); setTimeout(done, 1500); } setBusy(''); };
  const ignore = async () => { setBusy('ignore'); try { await Api.post(`force/host/${int(r, 'id')}/ignore`); } catch {} setBusy(''); done(); };
  return (
    <View style={{ marginTop: 10, padding: 12, borderRadius: 18, borderWidth: 1.5, borderColor: '#F6C9C3', backgroundColor: '#FFF7F5' }}>
      <Txt k={compact ? 'titleSmall' : 'titleLarge'}>{int(r, 'guests')} guest{int(r, 'guests') > 1 ? 's' : ''} · {int(r, 'nights')} night{int(r, 'nights') > 1 ? 's' : ''} from tonight</Txt>
      <Txt k="bodySmall" color={Brand.InkSoft}>{text(r, 'reason')} · {text(r, 'stay_type')} · {num(r, 'km')} km away · {text(r, 'area')}</Txt>
      {str(r, 'note') ? <Txt k="bodySmall" color={Brand.Ink} style={{ marginTop: 4 }}>“{str(r, 'note')}”</Txt> : null}
      {stays.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {stays.map((p) => (
            <Pressable key={int(p, 'id')} onPress={() => setPick(int(p, 'id'))} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5, borderColor: pick === int(p, 'id') ? RED : Brand.Line, backgroundColor: '#fff', marginRight: 6, marginBottom: 6 }}>
              <Txt k="labelMedium" color={pick === int(p, 'id') ? RED : Brand.InkSoft}>{text(p, 'title')} · {num(p, 'km')} km</Txt>
            </Pressable>
          ))}
        </View>
      ) : <Txt k="labelMedium" color={Brand.Muted} style={{ marginTop: 4 }}>Your free stay: {text(stays[0], 'title')}</Txt>}
      {msg ? <><Gap h={6} /><Notice text={msg} /></> : null}
      <Gap h={8} />
      <View style={[st.row, { gap: 8 }]}>
        <PrimaryButton text="Accept" icon="check" loading={busy === 'accept'} style={{ flex: 1 }} onPress={accept} />
        <OutlineButton text="Ignore" style={{ flex: 1 }} onPress={ignore} />
      </View>
    </View>
  );
}

/**
 * Hosts with Force search on: while the app is open, a new request rings with the soft tune and shows full screen
 * until the host accepts or ignores it (or another host takes it). Push messages wake it straight away.
 */
export function ForceRinger() {
  const s = useSession();
  const host = s?.user?.role === 'host';
  const [req, setReq] = useState<J | null>(null);
  const seen = useRef<Set<number>>(new Set());
  const player = useRef<AudioPlayer | null>(null);

  const stopRing = () => { try { player.current?.pause(); } catch {} };
  const startRing = async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false }).catch(() => {});
      if (!player.current) player.current = createAudioPlayer(require('../../assets/force_ring.wav'));
      player.current.loop = true; player.current.seekTo(0).catch(() => {}); player.current.play();
    } catch {}
  };
  const check = async () => {
    if (!host) return;
    try {
      const d = await Api.get('force/host');
      if (!bool(d, 'on')) { setReq(null); stopRing(); return; }
      const list = objs(d, 'searches');
      setReq((cur) => {
        if (cur && !list.some((x) => int(x, 'id') === int(cur, 'id'))) { stopRing(); return null; }   // taken by another host / ended
        if (cur) return list.find((x) => int(x, 'id') === int(cur, 'id')) || cur;
        const next = list.find((x) => !seen.current.has(int(x, 'id')));
        if (next) { seen.current.add(int(next, 'id')); startRing(); }
        return next || null;
      });
    } catch {}
  };
  useEffect(() => {
    if (!host) return;
    check();
    const t = setInterval(() => { if (RNAppState.currentState === 'active') check(); }, req ? 5000 : 20000);
    const sub = Notifications.addNotificationReceivedListener((n) => { if ((n.request.content.data as any)?.kind === 'force_search') check(); });
    const tap = Notifications.addNotificationResponseReceivedListener((n) => { if ((n.notification.request.content.data as any)?.kind === 'force_search') check(); });
    const st_ = RNAppState.addEventListener('change', (v) => { if (v === 'active') check(); });
    return () => { clearInterval(t); sub.remove(); tap.remove(); st_.remove(); };
  }, [host, !!req]);
  useEffect(() => () => { try { player.current?.remove(); } catch {} }, []);

  if (!req) return null;
  const close = () => { stopRing(); setReq(null); };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <LinearGradient colors={['#7A0C18', '#B3122A', RED]} style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}><Icon name="radar" color="#fff" size={46} /></View>
          <Txt k="headlineSmall" color="#fff" center style={{ marginTop: 12 }}>A guest needs a stay now</Txt>
          <Txt color="#FFE3DE" center>Force search · {mmss(int(req, 'seconds_left') || 0)} left</Txt>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 26, padding: 4 }}>
          <ForceRequest r={req} done={() => { close(); check(); }} />
        </View>
        <Gap />
        <Pressable onPress={() => { stopRing(); }} style={{ alignSelf: 'center', padding: 10 }}><Txt k="labelLarge" color="#FFE3DE">Silence the ring</Txt></Pressable>
      </LinearGradient>
    </Modal>
  );
}
