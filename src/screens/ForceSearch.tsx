/*
 * Force search — an emergency stay search.
 *   Guest: ForceSearchScreen — where, guests, stay type, reason, nights → a radar until a host accepts → the stay → book.
 *   Host:  ForceHostCard (switch with the explanation, guests searching nearby) and ForceRinger (rings with a soft tune and
 *          shows the request full screen; accept or ignore). See the website's Eden/lib/force_search.php.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState as RNAppState, Easing, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Api, errorText, userAgent } from '../core/api';
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

const DARK = ['#1E0609', '#4A0A14', '#8E0F1D'] as const;
const REASON_ICON: Record<string, string> = { stranded: 'train', late: 'nightlight', medical: 'local-hospital', family: 'family-restroom', safety: 'shield', other: 'more-horiz' };
const typeIcon = (t: string) => (/villa/i.test(t) ? 'villa' : /cottage|bungalow/i.test(t) ? 'cottage' : /farm/i.test(t) ? 'agriculture' : /apart|flat/i.test(t) ? 'apartment' : /home|house/i.test(t) ? 'house' : /resort/i.test(t) ? 'pool' : 'hotel');

export default function ForceSearchScreen() {
  const s = useSession();
  const [opts, setOpts] = useState<J | null>(null);
  const [search, setSearch] = useState<J | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Api.get('force/options').then(setOpts).catch(() => setOpts({}));
    if (!s?.user) { setLoading(false); return; }   // signed out: the form shows, Start asks to sign in
    Api.get('force/current').then((j) => setSearch(obj(j, 'search'))).catch(() => {}).finally(() => setLoading(false));
  }, [s?.user?.id]);

  if (loading) return <LinearGradient colors={DARK} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Loading /></LinearGradient>;
  if (search) return <Radar initial={search} onDone={() => setSearch(null)} />;
  return <ForceForm opts={opts || {}} onStarted={setSearch} />;
}

/** Top bar over the dark screens: back, a title, an optional action. */
function DarkBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[st.row, { paddingTop: ins.top + 10, paddingHorizontal: 16, paddingBottom: 8, gap: 12 }]}>
      <Pressable onPress={Nav.back} accessibilityLabel="Back" hitSlop={8} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-back" color="#fff" /></Pressable>
      <Txt k="titleLarge" color="#fff" style={{ flex: 1 }}>{title}</Txt>
      {right}
    </View>
  );
}

/** A choice tile with an icon (stay type, reason). */
function Tile({ on, icon, label, onPress, wide }: { on: boolean; icon: string; label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ width: wide ? '48.5%' : undefined, minWidth: wide ? undefined : 92, flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 10 : 6, padding: wide ? 12 : 10,
        borderRadius: 18, borderWidth: 1.5, borderColor: on ? RED : '#EFE3DF', backgroundColor: on ? '#FFF1EE' : '#fff', marginBottom: 8, marginRight: wide ? 0 : 8 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: on ? RED : '#FBF4F1', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={on ? '#fff' : '#8A726B'} /></View>
      <Txt k="labelMedium" color={on ? RED : Brand.InkSoft} numberOfLines={3} style={{ flex: wide ? 1 : undefined, textAlign: wide ? 'left' : 'center' }}>{label}</Txt>
    </Pressable>
  );
}

/** A count with − and + (guests, nights). */
function Counter({ label, icon, value, set, min, max }: { label: string; icon: string; value: number; set: (n: number) => void; min: number; max: number }) {
  const b = (ic: string, ok: boolean, f: () => void, a: string) => (
    <Pressable onPress={f} disabled={!ok} accessibilityLabel={a} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ok ? '#fff' : '#F4EDEA', borderWidth: 1, borderColor: '#EADBD6', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color={ok ? Brand.Ink : '#C9BDB8'} /></Pressable>
  );
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: '#FBF6F4', borderWidth: 1, borderColor: '#F1E5E1' }}>
      <View style={[st.row, { gap: 6 }]}><Icon name={icon} size={16} color="#8A726B" /><Txt k="labelMedium" color={Brand.InkSoft}>{label}</Txt></View>
      <View style={[st.row, { justifyContent: 'space-between', marginTop: 8 }]}>
        {b('remove', value > min, () => set(value - 1), 'Fewer ' + label.toLowerCase())}
        <Txt k="headlineSmall">{value}</Txt>
        {b('add', value < max, () => set(value + 1), 'More ' + label.toLowerCase())}
      </View>
    </View>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={[st.row, { gap: 10, marginBottom: 10 }]}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: done ? '#0B8F4D' : RED, alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Icon name="check" size={16} color="#fff" /> : <Txt k="labelMedium" color="#fff">{n}</Txt>}
        </View>
        <Txt k="titleMedium">{title}</Txt>
      </View>
      {children}
    </View>
  );
}

function ForceForm({ opts, onStarted }: { opts: J; onStarted: (s: J) => void }) {
  const ins = useSafeAreaInsets();
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
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(glow, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);

  const locate = async () => {
    setLocMsg('Finding you…');
    const r = await Loc.current(15000, true);
    if (r.kind === 'found') { setFix({ lat: r.lat, lng: r.lng }); setLocMsg('Your location is set'); } else { setFix(null); setLocMsg(Loc.locMessage(r)); }
  };
  useEffect(() => { if (where === 'gps' && !fix) locate(); }, [where]);

  const start = async () => {
    if (!Api.session?.user) { AppState.set({ authMessage: 'Sign in to start your Force search — it takes a minute.' }); Nav.navigate('login'); return; }
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

  const types: string[] = (arr(opts, 'stay_types') as any[]).map(String);
  const reasons = objs(opts, 'reasons');
  const placed = where === 'gps' ? !!fix : place.trim().length > 1;
  const ready = !!reason && placed;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F5' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 + ins.bottom }} keyboardShouldPersistTaps="handled">
        {/* the dark top: what Force search is */}
        <LinearGradient colors={DARK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingBottom: 46, overflow: 'hidden' }}>
          <DarkBar title="Force search" />
          <View style={{ position: 'absolute', right: -60, top: 30, width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
            {[240, 170, 100].map((d) => <View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />)}
            <Animated.View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,196,46,0.55)',
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) }] }} />
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFC42E', alignItems: 'center', justifyContent: 'center' }}><Icon name="radar" color="#5A1A00" size={22} /></View>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 14, maxWidth: 290 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: 'rgba(255,196,46,0.18)' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFC42E' }} /><Txt k="labelSmall" color="#FFD36B">EMERGENCY STAY</Txt>
            </View>
            <Txt k="headlineSmall" color="#fff" style={{ marginTop: 10 }}>Need a place to stay tonight?</Txt>
            <Txt k="bodyMedium" color="#F5CFC8" style={{ marginTop: 6 }}>We ring hosts near you with a free room. The first to accept is shown to you — at their normal price.</Txt>
          </View>
        </LinearGradient>

        {/* the form on a sheet */}
        <View style={{ marginTop: -26, marginHorizontal: 12, padding: 18, borderRadius: 28, backgroundColor: '#fff', shadowColor: '#5A0A12', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <Step n={1} title="Where are you?" done={placed}>
            <View style={{ flexDirection: 'row', padding: 4, borderRadius: 50, backgroundColor: '#F6EEEB' }}>
              {([['gps', 'my-location', 'Use my location'], ['place', 'search', 'Type a place']] as const).map(([v, ic, l]) => (
                <Pressable key={v} onPress={() => setWhere(v)} style={[st.row, { flex: 1, justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 50, backgroundColor: where === v ? '#fff' : 'transparent', elevation: where === v ? 2 : 0 }]}>
                  <Icon name={ic} size={17} color={where === v ? RED : Brand.Muted} /><Txt k="labelLarge" color={where === v ? Brand.Ink : Brand.Muted}>{l}</Txt>
                </Pressable>
              ))}
            </View>
            <Gap h={10} />
            {where === 'gps' ? (
              <Pressable onPress={locate} style={[st.row, { gap: 10, padding: 12, borderRadius: 16, backgroundColor: fix ? '#EAF7EF' : '#FFF6E5' }]}>
                <Icon name={fix ? 'check-circle' : 'location-searching'} color={fix ? '#0B8F4D' : '#B26A00'} />
                <Txt k="bodySmall" color={fix ? '#0B6B3A' : '#7A4A00'} style={{ flex: 1 }}>{locMsg || 'Finding you…'}</Txt>
                <Txt k="labelMedium" color={RED}>Refresh</Txt>
              </Pressable>
            ) : <Field label="Town, area or landmark" value={place} onChange={setPlace} placeholder="e.g. Ooty bus stand" />}
          </Step>

          <Step n={2} title="Who and for how long?" done>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Counter label="Guests" icon="group" value={guests} set={setGuests} min={1} max={20} />
              <Counter label="Nights" icon="bedtime" value={nights} set={setNights} min={1} max={num(opts, 'max_nights') || 7} />
            </View>
            <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Check-in tonight</Txt>
            <Gap h={10} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Tile on={type === ''} icon="apps" label="Any stay" onPress={() => setType('')} />
              {types.map((t) => <Tile key={t} on={type === t} icon={typeIcon(t)} label={t} onPress={() => setType(t)} />)}
            </ScrollView>
          </Step>

          <Step n={3} title="What happened?" done={!!reason}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {reasons.map((r) => <Tile key={text(r, 'value')} wide on={reason === text(r, 'value')} icon={REASON_ICON[text(r, 'value')] || 'help-outline'} label={text(r, 'label')} onPress={() => setReason(text(r, 'value'))} />)}
            </View>
            <Gap h={4} />
            <Field label="Anything hosts should know? (optional)" value={note} onChange={setNote} lines={2} maxLength={300} />
          </Step>
          {err ? <Notice tone="bad" text={err} /> : null}
        </View>
        <View style={[st.row, { gap: 8, marginHorizontal: 24, marginTop: 14 }]}>
          <Icon name="lock" size={16} color={Brand.Muted} />
          <Txt k="labelSmall" color={Brand.Muted} style={{ flex: 1 }}>Hosts see the area and distance — never your exact location or phone number.</Txt>
        </View>
      </ScrollView>

      {/* the start button stays at the bottom */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 + ins.bottom, backgroundColor: 'rgba(255,248,245,0.96)', borderTopWidth: 1, borderColor: '#F3E4DF' }}>
        <Pressable onPress={start} disabled={!ready || busy} accessibilityRole="button" style={{ borderRadius: 50, overflow: 'hidden', opacity: ready ? 1 : 0.5 }}>
          <LinearGradient colors={['#B3122A', RED, '#FF6A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.row, { justifyContent: 'center', gap: 10, paddingVertical: 16 }]}>
            {busy ? <Loading /> : <Icon name="radar" color="#fff" />}
            <Txt k="titleMedium" color="#fff">{Api.session?.user ? 'Start Force search' : 'Sign in and start'}</Txt>
          </LinearGradient>
        </Pressable>
        <Txt k="labelSmall" color={Brand.Muted} center style={{ marginTop: 6 }}>{ready ? `Rings hosts within ${num(opts, 'radius_km') || 10} km · runs ${num(opts, 'minutes') || 30} minutes` : !placed ? 'Set where you are' : 'Choose what happened'}</Txt>
      </View>
    </View>
  );
}

/** A small map from OpenStreetMap tiles (no map key needed): the guest (yellow) and the accepted stay (red). */
function MiniMap({ you, stay, height = 170 }: { you: number[]; stay: number[]; height?: number }) {
  const [w, setW] = useState(0);
  const T = 256;
  const world = (lat: number, lng: number, z: number) => {
    const n = T * 2 ** z, s = Math.sin((lat * Math.PI) / 180);
    return [((lng + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
  };
  let z = 16;
  if (w) while (z > 9) {   // the closest zoom that shows both pins with some room
    const [ax, ay] = world(you[0], you[1], z), [bx, by] = world(stay[0], stay[1], z);
    if (Math.abs(ax - bx) < w - 70 && Math.abs(ay - by) < height - 70) break;
    z--;
  }
  const [ax, ay] = world(you[0], you[1], z), [bx, by] = world(stay[0], stay[1], z);
  const cx = (ax + bx) / 2, cy = (ay + by) / 2, left = cx - w / 2, top = cy - height / 2;
  const tiles: [number, number][] = [];
  if (w) for (let x = Math.floor(left / T); x <= Math.floor((left + w) / T); x++) for (let y = Math.floor(top / T); y <= Math.floor((top + height) / T); y++) tiles.push([x, y]);
  const pin = (x: number, y: number, bg: string, icon: string) => (
    <View style={{ position: 'absolute', left: x - left - 16, top: y - top - 34, alignItems: 'center' }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4 }}><Icon name={icon} size={16} color={bg === RED ? '#fff' : '#5A1A00'} /></View>
      <View style={{ width: 3, height: 6, backgroundColor: bg }} />
    </View>
  );
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E8E4DE' }}>
      {tiles.map(([x, y]) => <Image key={x + ':' + y} source={{ uri: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, headers: { 'User-Agent': userAgent, Referer: Api.base + '/' } }} style={{ position: 'absolute', left: x * T - left, top: y * T - top, width: T, height: T }} />)}
      {w ? <>{pin(ax, ay, '#FFC42E', 'person')}{pin(bx, by, RED, 'home')}</> : null}
      <Txt k="labelSmall" color="#5a5450" style={{ position: 'absolute', right: 6, bottom: 3, fontSize: 9 }}>© OpenStreetMap</Txt>
    </View>
  );
}


/** Searching: a full-screen radar with host blips; then the accepted stay. */
function Radar({ initial, onDone }: { initial: J; onDone: () => void }) {
  const ins = useSafeAreaInsets();
  const [s, setS] = useState<J>(initial);
  const [left, setLeft] = useState(int(initial, 'seconds_left') || 0);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const id = int(s, 'id');
  const status = text(s, 'status');

  useEffect(() => {
    const a = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
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
  const call = () => { if (Api.session?.supportPhone) Linking.openURL('tel:' + Api.session.supportPhone).catch(() => {}); };

  /* ----- a host accepted: the stay ----- */
  if (status === 'accepted' && offer) {
    const price = num(obj(offer, 'price'), 'total');
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF8F5' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 170 + ins.bottom }}>
          <View style={{ height: 300 }}>
            <Photo url={str(offer, 'image')} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} corner={0} />
            <LinearGradient colors={['rgba(20,5,8,0.55)', 'rgba(20,5,8,0)', 'rgba(20,5,8,0.75)']} locations={[0, 0.4, 1]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
            <DarkBar title="" />
            <View style={{ position: 'absolute', left: 18, right: 18, bottom: 40 }}>
              <View style={[st.row, { alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, backgroundColor: '#0B8F4D' }]}>
                <Icon name="verified" size={16} color="#fff" /><Txt k="labelMedium" color="#fff">Host accepted you</Txt>
              </View>
              <Txt k="headlineSmall" color="#fff" style={{ marginTop: 8 }}>{text(offer, 'title')}</Txt>
              <Txt k="bodyMedium" color="#F3DCD6">{text(offer, 'location')}</Txt>
            </View>
          </View>
          <View style={{ marginTop: -24, marginHorizontal: 12, padding: 18, borderRadius: 28, backgroundColor: '#fff', elevation: 6, shadowColor: '#5A0A12', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[['near-me', `${num(offer, 'km')} km away`], ['group', `${int(s, 'guests')} guest${int(s, 'guests') > 1 ? 's' : ''}`], ['bedtime', `${int(s, 'nights')} night${int(s, 'nights') > 1 ? 's' : ''} · tonight`], ...(num(offer, 'rating') ? [['star', String(num(offer, 'rating'))]] : []), ['home', text(offer, 'type')]].map(([ic, l]) => (
                <View key={ic + l} style={[st.row, { gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50, backgroundColor: '#FBF4F1' }]}><Icon name={ic} size={15} color={RED} /><Txt k="labelMedium">{l}</Txt></View>
              ))}
            </View>
            <View style={[st.row, { marginTop: 16, justifyContent: 'space-between', alignItems: 'flex-end' }]}>
              <View>
                <Txt k="labelSmall" color={Brand.Muted}>Total for your stay</Txt>
                <Txt k="headlineSmall">{price ? money(price) : '—'}</Txt>
              </View>
              <View style={[st.row, { gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50, backgroundColor: left < 300 ? '#FFE9E6' : '#FFF6E0' }]}>
                <Icon name="timer" size={15} color={left < 300 ? RED : '#B26A00'} /><Txt k="labelMedium" color={left < 300 ? RED : '#7A4A00'}>Held {mmss(left)}</Txt>
              </View>
            </View>
            <Gap />
            <MiniMap you={arr(s, 'coords') as number[]} stay={arr(offer, 'coords') as number[]} />
            <View style={[st.row, { gap: 14, marginTop: 6 }]}>
              <View style={[st.row, { gap: 4 }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFC42E' }} /><Txt k="labelSmall" color={Brand.Muted}>You</Txt></View>
              <View style={[st.row, { gap: 4 }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED }} /><Txt k="labelSmall" color={Brand.Muted}>{text(offer, 'title')}</Txt></View>
            </View>
            {err ? <><Gap h={10} /><Notice tone="bad" text={err} /></> : null}
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 + ins.bottom, backgroundColor: 'rgba(255,248,245,0.97)', borderTopWidth: 1, borderColor: '#F3E4DF' }}>
          <PrimaryButton text="Book this stay" icon="event-available" loading={busy === 'book'} onPress={book} />
          <View style={[st.row, { gap: 8, marginTop: 8 }]}>
            <View style={{ flex: 1 }}><OutlineButton text="Directions" icon="directions" onPress={() => { const c = arr(offer, 'coords') as number[]; Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${c[0]},${c[1]}`).catch(() => {}); }} /></View>
            <View style={{ flex: 1 }}><OutlineButton text={busy === 'decline' ? 'One moment…' : 'Find another'} icon="refresh" onPress={decline} /></View>
          </View>
        </View>
      </View>
    );
  }

  /* ----- searching / ended: the radar ----- */
  const ended = ['expired', 'cancelled', 'booked'].includes(status);
  const hosts = int(s, 'hosts_nearby') || 0;
  const R = 150;
  const blips = Array.from({ length: Math.min(hosts, 8) }, (_, i) => { const a = (i * 137.5 + 40) * Math.PI / 180, r = R * (0.35 + ((i * 53) % 50) / 100); return [R + Math.cos(a) * r, R + Math.sin(a) * r]; });
  const steps: [string, string, boolean, boolean][] = [
    ['send', 'Request sent', true, false],
    ['notifications-active', hosts ? `Ringing ${hosts} host${hosts > 1 ? 's' : ''} with a free stay` : 'Looking for free stays nearby', hosts > 0, !hosts],
    ['how-to-reg', 'Waiting for a host to accept', false, hosts > 0],
  ];
  return (
    <LinearGradient colors={DARK} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ flex: 1 }}>
      <DarkBar title="Force search" />
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 + ins.bottom }}>
        <View style={{ width: R * 2, height: R * 2, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
          {[1, 0.72, 0.44].map((k) => <View key={k} style={{ position: 'absolute', width: R * 2 * k, height: R * 2 * k, borderRadius: R * k, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }} />)}
          <View style={{ position: 'absolute', width: R * 2, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <View style={{ position: 'absolute', width: 1, height: R * 2, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          {!ended ? (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', width: R * 2, height: R * 2, transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
              {[0, 6, 12, 18, 24].map((d, i) => (
                <View key={d} style={{ position: 'absolute', left: R, top: R - 1, width: R, height: 2, backgroundColor: `rgba(255,196,46,${0.7 - i * 0.13})`, transform: [{ translateX: -R / 2 }, { rotate: `-${d}deg` }, { translateX: R / 2 }] }} />
              ))}
            </Animated.View>
          ) : null}
          {!ended ? blips.map(([x, y], i) => (
            <Animated.View key={i} style={{ position: 'absolute', left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFC42E',
              opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] }), shadowColor: '#FFC42E', shadowOpacity: 0.9, shadowRadius: 8 }} />
          )) : null}
          <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,196,46,0.6)' }}>
            <Icon name="person-pin-circle" color={RED} size={34} />
          </View>
        </View>

        <Txt k="headlineSmall" color="#fff" center style={{ marginTop: 10, paddingHorizontal: 24 }}>
          {ended ? (status === 'expired' ? 'No host accepted in time' : status === 'booked' ? 'You are booked' : 'Search stopped') : 'Finding you a stay…'}
        </Txt>
        <Txt k="bodyMedium" color="#F3CFC8" center style={{ marginTop: 4, paddingHorizontal: 28 }}>
          {ended ? (status === 'expired' ? 'Try a nearby town or another stay type — or call us and we will help you find one.' : '') : `${text(s, 'place') || 'Your location'} · ${int(s, 'guests')} guest${int(s, 'guests') > 1 ? 's' : ''} · ${int(s, 'nights')} night${int(s, 'nights') > 1 ? 's' : ''}`}
        </Txt>

        {!ended ? (
          <View style={{ alignSelf: 'stretch', marginHorizontal: 16, marginTop: 20, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            {steps.map(([ic, l, done, live], i) => (
              <View key={l} style={[st.row, { gap: 12, paddingVertical: 7 }]}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: done ? '#0B8F4D' : live ? '#FFC42E' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={done ? 'check' : ic} size={17} color={done ? '#fff' : live ? '#5A1A00' : '#E7C3BC'} />
                </View>
                <Txt k="bodyMedium" color={done || live ? '#fff' : '#D8AFA7'} style={{ flex: 1 }}>{l}</Txt>
                {i === 2 ? <Txt k="labelLarge" color="#FFD36B">{mmss(left)}</Txt> : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ alignSelf: 'stretch', marginHorizontal: 16, marginTop: 18, gap: 10 }}>
          {ended ? <PrimaryButton text="Search again" icon="radar" onPress={onDone} /> : (
            <Pressable onPress={cancel} disabled={!!busy} style={[st.row, { justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Icon name="close" size={18} color="#FFB4A8" /><Txt k="labelLarge" color="#FFB4A8">{busy === 'cancel' ? 'Stopping…' : 'Stop searching'}</Txt>
            </Pressable>
          )}
          {Api.session?.supportPhone ? (
            <Pressable onPress={call} style={[st.row, { justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }]}>
              <Icon name="call" size={18} color="#fff" /><Txt k="labelLarge" color="#fff">Call TripArro support</Txt>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/** The floating Force search button (main tabs). */
export function ForceFab({ bottom }: { bottom: number }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  return (
    <View style={{ position: 'absolute', right: 16, bottom, alignItems: 'flex-end' }}>
      <Pressable onPress={() => Nav.navigate('force')} accessibilityRole="button" accessibilityLabel="Force search — find a stay right now"
        style={{ borderRadius: 50, elevation: 12, shadowColor: RED, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}>
        <LinearGradient colors={['#B3122A', RED, '#FF6A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.row, { gap: 8, paddingLeft: 8, paddingRight: 16, height: 54, borderRadius: 50, borderWidth: 2.5, borderColor: '#fff' }]}>
          <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFC42E',
              opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }] }} />
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Icon name="radar" color="#fff" size={22} /></View>
          </View>
          <Txt k="labelLarge" color="#fff">Stay now</Txt>
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
  const blink = useRef(new Animated.Value(0)).current;
  const load = () => Api.get('force/host').then(setD).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  useEffect(() => { const a = Animated.loop(Animated.timing(blink, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  if (!d) return null;
  const on = bool(d, 'on');
  const sw = async (v: boolean) => {
    setBusy(true); setErr(null);
    try { setD(await Api.post('force/host/switch', { on: v, agree: v ? agree : false })); setExplain(false); } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  const list = objs(d, 'searches');
  return (
    <View style={{ marginBottom: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: on ? '#F3C6BF' : '#EFE3DF' }}>
      <LinearGradient colors={on ? DARK : ['#FFF6F3', '#FFF6F3', '#FFF6F3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        <View style={[st.row, { gap: 12 }]}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: on ? 'rgba(255,196,46,0.18)' : '#FFE4E1', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="radar" color={on ? '#FFC42E' : RED} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={[st.row, { gap: 8 }]}>
              <Txt k="titleMedium" color={on ? '#fff' : Brand.Ink}>Force search</Txt>
              <View style={[st.row, { gap: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, backgroundColor: on ? 'rgba(11,143,77,0.25)' : '#EFE6E3' }]}>
                {on ? <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#3BE08A', opacity: blink.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.25, 1] }) }} /> : null}
                <Txt k="labelSmall" color={on ? '#B9F5D3' : Brand.Muted}>{on ? 'Live' : 'Off'}</Txt>
              </View>
            </View>
            <Txt k="bodySmall" color={on ? '#F3CFC8' : Brand.Muted}>{on ? `Your phone rings when a guest within ${num(d, 'radius_km')} km needs a stay tonight` : 'Fill empty nights with guests who need a stay right now'}</Txt>
          </View>
        </View>
        <Pressable onPress={() => (on ? sw(false) : setExplain(true))} style={[st.row, { justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 10, borderRadius: 50, backgroundColor: on ? 'rgba(255,255,255,0.12)' : RED }]}>
          <Icon name={on ? 'power-settings-new' : 'radar'} size={18} color="#fff" /><Txt k="labelLarge" color="#fff">{on ? 'Turn off' : 'Turn on Force search'}</Txt>
        </Pressable>
      </LinearGradient>
      {on && !int(d, 'stays_on_map') ? <View style={{ padding: 12 }}><Notice tone="warn" text="Add the map location to your stays (My listings) — Force search only finds stays on the map." /></View> : null}
      {on ? (
        <View style={{ padding: 14 }}>
          <View style={[st.row, { justifyContent: 'space-between' }]}>
            <Txt k="titleSmall">Guests searching nearby</Txt>
            <View style={{ minWidth: 24, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, backgroundColor: list.length ? RED : '#EFE6E3', alignItems: 'center' }}><Txt k="labelMedium" color={list.length ? '#fff' : Brand.Muted}>{list.length}</Txt></View>
          </View>
          {!list.length ? (
            <View style={[st.row, { gap: 10, marginTop: 10, padding: 12, borderRadius: 16, backgroundColor: '#FBF6F4' }]}>
              <Icon name="nights-stay" color={Brand.Muted} /><Txt k="bodySmall" color={Brand.Muted} style={{ flex: 1 }}>Nobody is searching near your free stays right now. We will ring you when someone does.</Txt>
            </View>
          ) : null}
          {list.map((r) => <ForceRequest key={int(r, 'id')} r={r} done={load} />)}
        </View>
      ) : null}
      <Modal visible={explain} transparent animationType="fade" onRequestClose={() => setExplain(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,10,12,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', overflow: 'hidden' }}>
            <ScrollView>
              <LinearGradient colors={DARK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,196,46,0.2)', alignItems: 'center', justifyContent: 'center' }}><Icon name="radar" color="#FFC42E" size={28} /></View>
                <Txt k="headlineSmall" color="#fff" style={{ marginTop: 10 }}>How Force search works</Txt>
                <Txt k="bodyMedium" color="#F3CFC8">Guests near you who need a stay tonight — sent straight to your phone.</Txt>
              </LinearGradient>
              <View style={{ padding: 20 }}>
                {[
                  ['notifications-active', 'Your phone rings', `A guest needs a stay tonight (stranded, arrived late, family or medical emergency). If you have a free stay within ${num(d, 'radius_km')} km, your phone rings with a soft tune.`],
                  ['visibility', 'You see the request', 'Guests, nights, stay type, the reason and the distance — never their exact location or phone number.'],
                  ['touch-app', 'Accept or ignore', 'The first host to accept gets the guest and the other phones stop. A guest you ignore is not shown to you again for that search.'],
                  ['payments', 'Normal booking, normal price', 'The guest sees your stay at its normal price and books it in the app — the usual payment and invoice.'],
                  ['percent', `${num(d, 'extra_pct')}% extra commission`, `Only on bookings that come from Force search, on top of your usual commission.`],
                  ['event-busy', 'Only free stays ring', 'A stay that is booked or closed for those nights is never shown.'],
                ].map(([ic, h, t], i) => (
                  <View key={ic} style={[st.row, { gap: 12, alignItems: 'flex-start', marginBottom: 14 }]}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: i === 4 ? '#FFF1D6' : '#FFF1EE', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={20} color={i === 4 ? '#B26A00' : RED} /></View>
                    <View style={{ flex: 1 }}><Txt k="titleSmall">{h}</Txt><Txt k="bodySmall" color={Brand.InkSoft}>{t}</Txt></View>
                  </View>
                ))}
                <View style={{ padding: 12, borderRadius: 16, backgroundColor: '#FBF6F4' }}>
                  <CheckRow text={`I understand and agree to the extra ${num(d, 'extra_pct')}% commission on Force search bookings`} checked={agree} onChange={setAgree} />
                </View>
                <Gap />
                {err ? <><Notice tone="bad" text={err} /><Gap h={8} /></> : null}
                <PrimaryButton text="Turn on Force search" icon="radar" disabled={!agree} loading={busy} onPress={() => sw(true)} />
                <Gap h={8} />
                <OutlineButton text="Not now" onPress={() => setExplain(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Info chips for a request: reason, stay type, distance, area. */
function ReqChips({ r, dark }: { r: J; dark?: boolean }) {
  const items: [string, string][] = [
    [REASON_ICON[str(r, 'reason_key') || ''] || 'error-outline', text(r, 'reason')],
    [typeIcon(text(r, 'stay_type')), text(r, 'stay_type') || 'Any stay'],
    ['near-me', `${num(r, 'km')} km away`],
    ...(text(r, 'area') ? [['place', text(r, 'area')] as [string, string]] : []),
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: dark ? 'center' : 'flex-start' }}>
      {items.filter(([, l]) => l).map(([ic, l]) => (
        <View key={ic + l} style={[st.row, { gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, backgroundColor: dark ? 'rgba(255,255,255,0.12)' : '#FBF4F1' }]}>
          <Icon name={ic} size={14} color={dark ? '#FFD36B' : RED} /><Txt k="labelMedium" color={dark ? '#fff' : Brand.Ink}>{l}</Txt>
        </View>
      ))}
    </View>
  );
}

/** Which of the host's free stays to offer (shown when there is more than one). */
function StayPick({ stays, pick, setPick, dark }: { stays: J[]; pick: number; setPick: (n: number) => void; dark?: boolean }) {
  if (stays.length < 2) return <Txt k="labelMedium" color={dark ? '#F3CFC8' : Brand.Muted} center={dark} style={{ marginTop: 8 }}>Your free stay: {text(stays[0], 'title')}</Txt>;
  return (
    <View style={{ marginTop: 10 }}>
      <Txt k="labelMedium" color={dark ? '#F3CFC8' : Brand.InkSoft} center={dark}>Offer which stay?</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 6, flexGrow: 1, justifyContent: dark ? 'center' : 'flex-start' }}>
        {stays.map((p) => {
          const on = pick === int(p, 'id');
          return (
            <Pressable key={int(p, 'id')} onPress={() => setPick(int(p, 'id'))} style={[st.row, { gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, borderWidth: 1.5,
              borderColor: on ? (dark ? '#FFC42E' : RED) : dark ? 'rgba(255,255,255,0.25)' : Brand.Line, backgroundColor: on ? (dark ? 'rgba(255,196,46,0.18)' : '#FFF1EE') : dark ? 'transparent' : '#fff' }]}>
              {on ? <Icon name="check" size={15} color={dark ? '#FFC42E' : RED} /> : null}
              <Txt k="labelMedium" color={dark ? '#fff' : on ? RED : Brand.InkSoft}>{text(p, 'title')} · {num(p, 'km')} km</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function useReqActions(r: J, done: () => void) {
  const stays = objs(r, 'stays');
  const [pick, setPick] = useState(int(stays[0], 'id'));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const accept = async () => { setBusy('accept'); try { const j = await Api.post(`force/host/${int(r, 'id')}/accept`, { property: pick }); setMsg(text(j, 'message')); setTimeout(done, 1500); } catch (e) { setMsg(errorText(e)); setTimeout(done, 1500); } setBusy(''); };
  const ignore = async () => { setBusy('ignore'); try { await Api.post(`force/host/${int(r, 'id')}/ignore`); } catch {} setBusy(''); done(); };
  return { stays, pick, setPick, busy, msg, accept, ignore };
}

/** One guest's Force search on the hosting dashboard: accept with one of the free stays, or ignore. */
function ForceRequest({ r, done }: { r: J; done: () => void }) {
  const a = useReqActions(r, done);
  const g = int(r, 'guests'), n = int(r, 'nights');
  return (
    <View style={{ marginTop: 10, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#F6C9C3', backgroundColor: '#FFFAF8' }}>
      <View style={[st.row, { gap: 12 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleMedium" color="#fff">{g}</Txt></View>
        <View style={{ flex: 1 }}>
          <Txt k="titleSmall">{g} guest{g > 1 ? 's' : ''} · {n} night{n > 1 ? 's' : ''} from tonight</Txt>
          <Txt k="labelSmall" color={Brand.Muted}>{mmss(int(r, 'seconds_left') || 0)} left to answer</Txt>
        </View>
      </View>
      <Gap h={10} />
      <ReqChips r={r} />
      {str(r, 'note') ? <View style={{ marginTop: 10, padding: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1E5E1' }}><Txt k="bodySmall">“{str(r, 'note')}”</Txt></View> : null}
      <StayPick stays={a.stays} pick={a.pick} setPick={a.setPick} />
      {a.msg ? <><Gap h={8} /><Notice text={a.msg} /></> : null}
      <Gap h={10} />
      <View style={[st.row, { gap: 8 }]}>
        <View style={{ flex: 1 }}><OutlineButton text="Ignore" icon="close" onPress={a.ignore} /></View>
        <View style={{ flex: 1.4 }}><PrimaryButton text="Accept" icon="check" loading={a.busy === 'accept'} onPress={a.accept} /></View>
      </View>
    </View>
  );
}

/** The incoming-call screen while the phone rings. */
function RingScreen({ r, done, silence, silent }: { r: J; done: () => void; silence: () => void; silent: boolean }) {
  const ins = useSafeAreaInsets();
  const a = useReqActions(r, done);
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { const x = Animated.loop(Animated.timing(p, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true })); x.start(); return () => x.stop(); }, []);
  const g = int(r, 'guests'), n = int(r, 'nights');
  const ripple = (k: number) => {
    const v = Animated.modulo(Animated.add(p, k), 1);
    return <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,196,46,0.22)',
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }} />;
  };
  const round = (bg: string, ic: string, label: string, onPress: () => void, loading: boolean) => (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Pressable onPress={onPress} disabled={!!a.busy} accessibilityRole="button" accessibilityLabel={label}
        style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: bg, shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}>
        {loading ? <Loading /> : <Icon name={ic} size={36} color="#fff" />}
      </Pressable>
      <Txt k="labelLarge" color="#fff">{label}</Txt>
    </View>
  );
  return (
    <LinearGradient colors={DARK} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 24, paddingHorizontal: 20 }}>
      <View style={[st.row, { justifyContent: 'space-between' }]}>
        <View style={[st.row, { gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Icon name="radar" size={15} color="#FFC42E" /><Txt k="labelMedium" color="#fff">Force search</Txt>
        </View>
        <Pressable onPress={silence} accessibilityLabel={silent ? 'Ring silenced' : 'Silence the ring'} hitSlop={8} style={[st.row, { gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Icon name={silent ? 'volume-off' : 'volume-up'} size={16} color="#fff" /><Txt k="labelMedium" color="#fff">{silent ? 'Silenced' : 'Silence'}</Txt>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 }}>
        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
          {[0, 0.33, 0.66].map(ripple)}
          <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFC42E', alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.85)' }}>
            <Icon name="group" size={34} color="#5A1A00" />
            <Txt k="titleMedium" color="#5A1A00">{g}</Txt>
          </View>
        </View>
        <Txt k="headlineSmall" color="#fff" center>{g} guest{g > 1 ? 's' : ''} need{g > 1 ? '' : 's'} a stay tonight</Txt>
        <Txt k="bodyMedium" color="#F3CFC8" center style={{ marginTop: 4 }}>{n} night{n > 1 ? 's' : ''} · answer within {mmss(int(r, 'seconds_left') || 0)}</Txt>
        <Gap h={14} />
        <ReqChips r={r} dark />
        {str(r, 'note') ? <View style={{ marginTop: 14, maxWidth: 320, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderTopLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)' }}><Txt k="bodyMedium" color="#fff">“{str(r, 'note')}”</Txt></View> : null}
        <StayPick stays={a.stays} pick={a.pick} setPick={a.setPick} dark />
        {a.msg ? <View style={{ marginTop: 12, alignSelf: 'stretch' }}><Notice text={a.msg} /></View> : null}
      </ScrollView>
      <View style={[st.row, { justifyContent: 'space-around', paddingHorizontal: 20 }]}>
        {round('#E5392F', 'close', 'Ignore', a.ignore, a.busy === 'ignore')}
        {round('#0B9F55', 'check', 'Accept', a.accept, a.busy === 'accept')}
      </View>
      <Txt k="labelSmall" color="#D8AFA7" center style={{ marginTop: 14 }}>Your normal price · the first host to accept gets the guest</Txt>
    </LinearGradient>
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
  const [silent, setSilent] = useState(false);
  const seen = useRef<Set<number>>(new Set());
  const player = useRef<AudioPlayer | null>(null);

  const stopRing = () => { try { player.current?.pause(); } catch {} };
  const startRing = async () => {
    try {
      setSilent(false);
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
      <RingScreen key={int(req, 'id')} r={req} done={() => { close(); check(); }} silence={() => { stopRing(); setSilent(true); }} silent={silent} />
    </Modal>
  );
}
