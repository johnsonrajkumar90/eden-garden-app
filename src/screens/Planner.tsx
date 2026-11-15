/*
 * Travel Planner: from where you are to a stay, resort, EV station, pet services, tourist place or any town —
 * restaurants, coffee shops, petrol pumps and EV chargers on the way, each with directions, a TripArro AI guide,
 * saved plans (My trips → Trip plans) and favourite places (private, or public for every traveller).
 */
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { AppState, useAppState, useLoader, useSession } from '../core/state';
import { J, int, num, obj, objs, str, strings, text } from '../core/json';
import { Picked, pickPhotos, uploadOf } from '../core/files';
import * as Loc from '../core/location';
import { Brand, Fonts } from '../theme';
import { Appear, BackBar, EmptyBox, ErrorBox, Gap, Icon, LinkButton, Loading, Notice, OutlineButton, Photo, Press, PrimaryButton, Txt, st } from '../ui/kit';
import { Field } from '../ui/inputs';
import { weatherEmoji } from '../ui/cards';
import { RestaurantsRow } from './Restaurants';
import { RUN_GRAD, StopSheet, TripLoading, TripTotalsBar, hmText, navigateTo, stopEmoji, stopKey } from './TripRun';
import { Nav, intParam, useParams } from '../nav';

const hm = hmText;
const openUrl = (u?: string | null) => { if (u) Linking.openURL(u).catch(() => {}); };
type Spot = { lat: number; lng: number; name: string; kind: string; kindLabel: string; id: string };
const toSpot = (d: J): Spot => ({ lat: num(d, 'lat') || 0, lng: num(d, 'lng') || 0, name: text(d, 'name'), kind: text(d, 'kind', 'town'), kindLabel: text(d, 'kind_label'), id: text(d, 'id') });
const locMsg = (r: Loc.LocResult, what: string) => r.kind === 'off' ? `Location is switched off on your phone. Turn it on, or type ${what}.` : r.kind === 'denied' ? `Location is not allowed for TripArro. Allow it in settings, or type ${what}.` : `We couldn't find your location just now. Try again, or type ${what}.`;

/** Search box for a destination: TripArro listings, the guest's bookings, or any town. */
function SpotSearch({ label, chosen, onChoose, showBookings }: { label: string; chosen: Spot | null; onChoose: (s: Spot | null) => void; showBookings: boolean }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<J[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.length === 1) return;
    if (!q && !showBookings) { setItems([]); return; }
    let alive = true;
    const t = setTimeout(() => { setBusy(true); Api.get('trip/destinations', { q }).then((r) => alive && setItems(objs(r, 'items'))).catch(() => alive && setItems([])).finally(() => alive && setBusy(false)); }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q, showBookings]);
  if (chosen) return (
    <View style={[st.row, { borderRadius: 16, backgroundColor: Brand.Sky, padding: 12 }]}>
      <Icon name="place" color={Brand.Blue} />
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Txt k="labelSmall" color={Brand.Muted}>{label}</Txt>
        <Txt bold numberOfLines={1}>{chosen.name}</Txt>
        {chosen.kindLabel ? <Txt k="labelSmall" color={Brand.Blue}>{chosen.kindLabel}</Txt> : null}
      </View>
      <Pressable onPress={() => { onChoose(null); setQ(''); }} style={{ padding: 8 }} accessibilityLabel="Change"><Icon name="close" /></Pressable>
    </View>
  );
  return (
    <View>
      <Field label={label} value={q} onChange={setQ} placeholder="Stay, EV station, pet services, town…" onSubmit={() => Keyboard.dismiss()} />
      {busy && !items.length ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>Searching…</Txt> : null}
      {items.length ? (
        <View style={{ marginTop: 6, borderRadius: 16, borderWidth: 1, borderColor: Brand.Line, backgroundColor: '#fff', overflow: 'hidden' }}>
          {items.slice(0, 10).map((d, i) => (
            <Pressable key={i} onPress={() => { onChoose(toSpot(d)); Keyboard.dismiss(); }} style={[st.row, { paddingHorizontal: 12, paddingVertical: 10 }]}>
              <Text style={{ width: 30 }}>{({ stay: '🏡', resort: '🏝️', ev: '🔌', pet: '🐾', place: '📸', booking: '🧳' } as Record<string, string>)[text(d, 'kind')] || '📍'}</Text>
              <View style={{ flex: 1 }}>
                <Txt semi numberOfLines={1}>{text(d, 'name')}</Txt>
                <Txt k="bodySmall" color={Brand.Muted} numberOfLines={1}>{[text(d, 'kind_label'), text(d, 'sub')].filter(Boolean).join(' · ')}</Txt>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function PlannerScreen() {
  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [lmsg, setLmsg] = useState('');
  const [plan, setPlan] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typeStart, setTypeStart] = useState(false);
  const locate = async () => {
    setLmsg('Finding your location…');
    const r = await Loc.current();
    if (r.kind === 'found') { setFrom({ lat: r.lat, lng: r.lng, name: 'Your location', kind: 'gps', kindLabel: '', id: '' }); setLmsg(''); } else setLmsg(locMsg(r, 'where you start'));
  };
  useEffect(() => { const f = Loc.lastFix; if (f) setFrom({ lat: f.lat, lng: f.lng, name: 'Your location', kind: 'gps', kindLabel: '', id: '' }); else locate(); }, []);
  const make = async () => {
    if (!from || !to) return;
    setBusy(true); setErr(null);
    try { setPlan(obj(await Api.post('trip/plan', { from_lat: from.lat, from_lng: from.lng, from_name: from.name, to_lat: to.lat, to_lng: to.lng, to_name: to.name, to_kind: to.kind, to_id: to.id }), 'plan')); }
    catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  if (plan) return <PlanView plan={plan} savedId={null} onBack={() => setPlan(null)} />;
  if (busy) return <TripLoading from={from?.kind === 'gps' ? 'Your location' : from?.name} to={to?.name} />;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Travel planner" onBack={Nav.back} actions={<Pressable onPress={() => Nav.navigate('myplaces')} style={st.barBtn} accessibilityLabel="My places"><Icon name="star" color="#fff" /></Pressable>} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={RUN_GRAD as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18 }}>
            <Txt k="headlineSmall" bold color="#fff">Plan your drive</Txt>
            <Txt color="#FFE3DE">Restaurants, coffee, petrol pumps and EV chargers on the way — each with directions, and TripArro AI to guide you.</Txt>
          </LinearGradient>
          <Gap h={16} />
          {typeStart ? (
            <>
              <SpotSearch label="Starting from" chosen={from && from.kind !== 'gps' ? from : null} onChoose={(s) => { setFrom(s); if (!s) setTypeStart(true); }} showBookings={false} />
              <LinkButton text="Use my location instead" onPress={() => { setTypeStart(false); locate(); }} />
            </>
          ) : (
            <>
              <View style={[st.row, { borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 12 }]}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: Brand.SunSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="my-location" color={Brand.SunInk} /></View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}><Txt k="labelSmall" color={Brand.Muted}>Starting from</Txt><Txt bold>{from ? 'Your location' : 'Not found yet'}</Txt></View>
                <LinkButton text="Type a place" onPress={() => { setTypeStart(true); setFrom(null); }} />
              </View>
              {lmsg ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>{lmsg}</Txt> : null}
              {!from && lmsg && !lmsg.startsWith('Finding') ? <LinkButton text="Try my location again" onPress={locate} /> : null}
            </>
          )}
          <Gap />
          <SpotSearch label="Where are you going?" chosen={to} onChoose={setTo} showBookings />
          <Gap h={18} />
          {err ? <><Notice text={err} tone="bad" /><Gap h={10} /></> : null}
          <PrimaryButton text={!from ? 'Choose where you start' : !to ? "Choose where you're going" : 'Plan my trip'} icon="map" onPress={make} disabled={!from || !to} loading={busy} />
          <Gap h={20} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OutlineButton text="Saved plans" onPress={() => Nav.navigate('tripplans')} style={{ flex: 1 }} />
            <OutlineButton text="My places" onPress={() => Nav.navigate('myplaces')} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** A plan: summary, AI guide, stops by category with directions, save, ask TripArro AI. */
function PlanView({ plan, savedId, onBack, onDeleted, tripInfo }: { plan: J; savedId: number | null; onBack: () => void; onDeleted?: () => void; tripInfo?: J | null }) {
  const session = useSession();
  const cats = objs(plan, 'categories').filter((c) => int(c, 'count') > 0);
  const [cat, setCat] = useState(cats.length ? text(cats[0], 'key') : 'restaurant');
  const [saved, setSaved] = useState<number | null>(savedId);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [chat, setChat] = useState<[string, string][]>([]);
  const [q, setQ] = useState('');
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<J[]>([]);
  const [routeTrip, setRouteTrip] = useState<J | null>(null);
  const [routing, setRouting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [openStop, setOpenStop] = useState<J | null>(null);
  const route = obj(plan, 'route') || {};
  const stops = objs(obj(plan, 'stops'), cat);
  const title = str(plan, 'title') || `${text(obj(plan, 'from'), 'name')} → ${text(obj(plan, 'to'), 'name')}`;
  const pickedKeys = picked.map(stopKey);
  const ident = () => (saved !== null ? { plan_id: saved } : { token: text(plan, 'token') });
  const toggle = (s: J) => { const k = stopKey(s); setPicked((p) => (p.some((x) => stopKey(x) === k) ? p.filter((x) => stopKey(x) !== k) : p.length < 12 ? [...p, s] : p)); };
  useEffect(() => {
    if (!picked.length) { setRouteTrip(null); return; }
    let alive = true; setRouting(true);
    const t = setTimeout(() => { Api.post('trip/route', { stops: picked, ...ident() }).then((r) => alive && setRouteTrip(obj(r, 'trip'))).catch(() => alive && setRouteTrip(null)).finally(() => alive && setRouting(false)); }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [pickedKeys.join()]);
  const startTrip = async () => {
    if (!picked.length || starting) return;
    setStarting(true);
    try {
      if (session?.user) {
        const r = await Api.post('trip/start', { stops: picked, title, ...ident() });
        setSaved(int(r, 'id')); AppState.bump(); Nav.navigate(`triprun/${int(r, 'id')}`);
      } else {
        const tr = routeTrip || obj(await Api.post('trip/route', { stops: picked, token: text(plan, 'token') }), 'trip');
        AppState.set({ localTrip: tr, localTripDone: 0, localTripTitle: title }); Nav.navigate('triprun/0');
      }
    } catch (e) { setSaveMsg(errorText(e)); }
    setStarting(false);
  };
  const ask = async () => {
    const question = q.trim(); if (question.length < 2) return;
    const history = chat.map(([role, t]) => ({ role, text: t }));
    setChat((c) => [...c, ['user', question]]); setQ(''); setAsking(true);
    try { const a = text(await Api.post('trip/ask', { question, history, ...ident() }), 'answer'); setChat((c) => [...c, ['assistant', a]]); }
    catch (e) { setChat((c) => [...c, ['assistant', errorText(e)]]); }
    setAsking(false);
  };
  const ti = tripInfo && ['ready', 'on_the_way', 'finished'].includes(text(tripInfo, 'status')) && saved !== null ? tripInfo : null;
  const w = obj(plan, 'weather'); const g = obj(plan, 'guide'); const to = obj(plan, 'to');

  return (
    <View style={{ flex: 1 }}>
      <BackBar title={title} onBack={onBack} actions={saved !== null && onDeleted ? <Pressable onPress={() => Api.post(`trip/plans/${saved}/delete`).then(onDeleted).catch(() => {})} style={st.barBtn} accessibilityLabel="Delete plan"><Icon name="delete-outline" color="#fff" /></Pressable> : null} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList data={stops} keyExtractor={(s, i) => stopKey(s) + i} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {ti ? (
                <Press onPress={() => Nav.navigate(`triprun/${saved}`)} style={[st.row, { borderRadius: 18, backgroundColor: text(ti, 'status') === 'finished' ? Brand.TealSoft : Brand.SunSoft, padding: 14 }]}>
                  <Text style={{ fontSize: 22 }}>{text(ti, 'status') === 'finished' ? '🎉' : '🧭'}</Text>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Txt bold>{text(ti, 'status') === 'finished' ? 'You finished this trip' : 'Continue your trip'}</Txt>
                    <Txt k="bodySmall" color={Brand.Muted}>{int(ti, 'done_count')} of {int(ti, 'steps')} done · {num(obj(ti, 'trip'), 'km')} km</Txt>
                  </View>
                  <Txt bold color={Brand.Blue}>{text(ti, 'status') === 'finished' ? 'View' : 'Go'}</Txt>
                </Press>
              ) : null}
              <LinearGradient colors={RUN_GRAD as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18 }}>
                <Txt k="titleMedium" bold color="#fff">{text(obj(plan, 'from'), 'name')}  →  {text(to, 'name')}</Txt>
                {str(to, 'kind_label') ? <Txt k="labelMedium" color="#FFE3DE">{str(to, 'kind_label')}</Txt> : null}
                <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
                  <View><Txt k="headlineSmall" bold color="#fff">{num(route, 'km') || 0} km</Txt><Txt k="labelSmall" color="#FFE3DE">distance</Txt></View>
                  <View><Txt k="headlineSmall" bold color="#fff">{hm(int(route, 'minutes'))}</Txt><Txt k="labelSmall" color="#FFE3DE">driving</Txt></View>
                </View>
                <Txt k="labelSmall" color="#FFE3DE" style={{ marginTop: 6 }}>{text(route, 'note')}</Txt>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <Press onPress={() => openUrl(text(plan, 'directions_url'))} style={{ borderRadius: 50, backgroundColor: Brand.Sun, paddingHorizontal: 14, paddingVertical: 9 }}><Txt bold color={Brand.SunInk}>Open route in Maps</Txt></Press>
                  {saved === null ? (
                    <Press onPress={async () => {
                      if (!session?.user) { Nav.navigate('login'); return; }
                      setSaving(true);
                      try { setSaved(int(await Api.post('trip/plans', { token: text(plan, 'token') }), 'id')); setSaveMsg('Saved — find it in My trips → Trip plans.'); } catch (e) { setSaveMsg(errorText(e)); }
                      setSaving(false);
                    }} style={{ borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 14, paddingVertical: 9 }}><Txt bold color="#fff">{saving ? 'Saving…' : 'Save to My trips'}</Txt></Press>
                  ) : <Txt bold color="#fff" style={{ paddingHorizontal: 6, paddingVertical: 9 }}>✓ Saved</Txt>}
                </View>
                {saveMsg ? <Txt k="bodySmall" color="#fff" style={{ marginTop: 6 }}>{saveMsg}</Txt> : null}
              </LinearGradient>
              {w ? (
                <View style={{ borderRadius: 18, backgroundColor: text(w, 'verdict') === 'bad' ? Brand.DangerSoft : text(w, 'verdict') === 'caution' ? Brand.WarnSoft : Brand.TealSoft, padding: 14 }}>
                  <Txt bold>{weatherEmoji(str(obj(w, 'now'), 'icon'))}  {text(w, 'headline')}</Txt>
                  <Txt k="bodySmall" color={Brand.InkSoft}>{text(w, 'advice')}</Txt>
                </View>
              ) : null}
              <View style={{ borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 14 }}>
                <View style={st.row}><Icon name="auto-awesome" size={20} color={Brand.Blue} /><Txt bold>  {text(g, 'source') === 'ai' ? 'TripArro AI guide' : 'Your trip at a glance'}</Txt></View>
                <Gap h={6} />
                <Txt>{text(g, 'text')}</Txt>
              </View>
              {to && num(to, 'lat') !== null ? <RestaurantsRow lat={num(to, 'lat')!} lng={num(to, 'lng')!} title={`Where to eat in ${text(to, 'name')}`} /> : null}
              {strings(plan, 'notes').map((n, i) => <Notice key={i} text={n} tone="warn" />)}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {objs(plan, 'categories').map((c) => {
                  const on = cat === text(c, 'key'); const off = int(c, 'count') === 0;
                  return <Pressable key={text(c, 'key')} disabled={off} onPress={() => setCat(text(c, 'key'))} style={{ borderRadius: 50, borderWidth: 1, borderColor: on ? Brand.Sun : Brand.Line, backgroundColor: on ? Brand.Sun : '#fff', paddingHorizontal: 12, paddingVertical: 7, opacity: off ? 0.45 : 1 }}>
                    <Txt k="labelLarge" color={on ? Brand.SunInk : Brand.InkSoft}>{text(c, 'icon')} {text(c, 'label')} ({int(c, 'count')})</Txt>
                  </Pressable>;
                })}
              </ScrollView>
              <Txt k="bodySmall" color={Brand.Muted}>Tap a place to see its photos · tap + to add it to your trip, then Start.</Txt>
              {!stops.length ? <Txt k="bodySmall" color={Brand.Muted}>Nothing found in this group along the way.</Txt> : null}
            </View>
          }
          renderItem={({ item: s, index: i }) => <Appear index={Math.min(i, 8)}><StopRow s={s} picked={pickedKeys.includes(stopKey(s))} onToggle={() => toggle(s)} onOpen={() => setOpenStop(s)} /></Appear>}
          ListFooterComponent={
            <View style={{ marginTop: 18 }}>
              <View style={{ borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 14 }}>
                <Txt bold>Ask TripArro AI about this trip</Txt>
                <Txt k="bodySmall" color={Brand.Muted}>Where to stop for lunch, where to charge, what's open near the destination…</Txt>
                {chat.map(([role, t], i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: role === 'user' ? 'flex-end' : 'flex-start', marginTop: 8 }}>
                    <View style={{ width: '85%', borderRadius: 16, backgroundColor: role === 'user' ? Brand.Blue : Brand.Page, padding: 10 }}><Txt color={role === 'user' ? '#fff' : Brand.Ink}>{t}</Txt></View>
                  </View>
                ))}
                {asking ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>TripArro AI is thinking…</Txt> : null}
                <View style={[st.row, { marginTop: 8 }]}>
                  <TextInput value={q} onChangeText={setQ} placeholder="Ask a question" placeholderTextColor="#A59C97" returnKeyType="send" onSubmitEditing={ask}
                    style={{ flex: 1, borderWidth: 1, borderColor: '#E6DDD8', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, fontFamily: Fonts.regular, fontSize: 15, color: Brand.Ink }} />
                  <Pressable onPress={ask} disabled={asking} style={{ padding: 10 }} accessibilityLabel="Ask"><Icon name="send" color={Brand.Blue} /></Pressable>
                </View>
              </View>
              <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 12 }}>{text(plan, 'attribution')}</Txt>
            </View>
          } />
      </KeyboardAvoidingView>
      {picked.length ? <TripTotalsBar count={picked.length} trip={routeTrip} busy={routing} starting={starting} onStart={startTrip} /> : null}
      {openStop ? <StopSheet s={openStop} picked={pickedKeys.includes(stopKey(openStop))} onToggle={() => toggle(openStop)} onClose={() => setOpenStop(null)} /> : null}
    </View>
  );
}

function StopRow({ s, picked, onToggle, onOpen }: { s: J; picked: boolean; onToggle: () => void; onOpen: () => void }) {
  const photo = strings(s, 'photos')[0] || str(s, 'photo');
  const n = strings(s, 'photos').length;
  const where = s.near_destination ? `Near your destination · ${num(s, 'to_destination_km')} km away` : `At km ${num(s, 'km_from_start')} · ${num(s, 'off_route_km')} km off the road`;
  const info = [str(s, 'info'), str(s, 'opening_hours') ? `Hours ${str(s, 'opening_hours')}` : null, str(s, 'by') ? `Shared by ${str(s, 'by')}` : null].filter(Boolean).join(' · ');
  return (
    <Press onPress={onOpen} scaleTo={0.98} style={[st.row, { borderRadius: 18, backgroundColor: picked ? Brand.SunSoft : '#fff', borderWidth: 1.5, borderColor: picked ? Brand.Sun : Brand.Line, padding: 10 }]}>
      <View>
        {photo ? <Photo url={photo} corner={14} style={{ width: 72, height: 72 }} /> : <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26 }}>{stopEmoji(str(s, 'category'))}</Text></View>}
        {n > 1 ? <View style={{ position: 'absolute', right: 4, bottom: 4, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6 }}><Txt k="labelSmall" color="#fff">{n}</Txt></View> : null}
      </View>
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Txt bold numberOfLines={2}>{text(s, 'name')}</Txt>
        <Txt k="labelMedium" color={Brand.Blue}>{where}</Txt>
        {info ? <Txt k="bodySmall" color={Brand.Muted} numberOfLines={2}>{info}</Txt> : null}
        <Txt k="labelSmall" color={Brand.Muted}>{text(s, 'source')}</Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Pressable onPress={onToggle} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: picked ? Brand.Teal : Brand.Sky, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={picked ? 'Remove from my trip' : 'Add to my trip'}><Icon name={picked ? 'check' : 'add'} color={picked ? '#fff' : Brand.Blue} /></Pressable>
        <Pressable onPress={() => navigateTo(num(s, 'lat'), num(s, 'lng'), str(s, 'directions_url'))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Directions"><Icon name="directions" color={Brand.SunInk} /></Pressable>
      </View>
    </Press>
  );
}

/** My trips → Trip plans: every saved plan. */
export function SavedPlansList() {
  const tick = useAppState('refreshTick');
  const l = useLoader(async () => objs(await Api.get('trip/plans'), 'items'), [tick]);
  const items = l.data;
  if (!items && l.loading) return <Loading />;
  if (!items) return <ErrorBox message={l.error || 'Could not load your plans.'} onRetry={l.reload} />;
  if (!items.length) return <EmptyBox title="No saved trip plans yet" text="Plan a drive in the Travel planner and tap Save to My trips." action="Plan a trip" icon="map" onAction={() => Nav.navigate('planner')} />;
  return (
    <FlatList data={items} keyExtractor={(p) => String(int(p, 'id'))} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      ListHeaderComponent={<PrimaryButton text="Plan a new trip" icon="map" onPress={() => Nav.navigate('planner')} style={{ marginBottom: 2 }} />}
      renderItem={({ item: p, index: i }) => {
        const stt = text(p, 'status');
        return (
          <Appear index={Math.min(i, 8)}>
            <Press onPress={() => Nav.navigate(stt === 'ready' || stt === 'on_the_way' ? `triprun/${int(p, 'id')}` : `tripplan/${int(p, 'id')}`)} scaleTo={0.98} style={[st.row, { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 14 }]}>
              <LinearGradient colors={RUN_GRAD as any} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}><Icon name="map" color="#fff" /></LinearGradient>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Txt bold numberOfLines={1}>{text(p, 'title')}</Txt>
                <Txt k="bodySmall" color={Brand.Muted}>{num(p, 'km')} km · {hm(int(p, 'minutes'))}{int(p, 'stops') > 0 ? ` · ${int(p, 'stops')} stops` : ''} · saved {text(p, 'created_at').slice(0, 10)}</Txt>
                {stt === 'ready' ? <Txt k="labelMedium" bold color={Brand.Blue}>Ready to start</Txt> : stt === 'on_the_way' ? <Txt k="labelMedium" bold color={Brand.SunInk}>On the way · {int(p, 'done_count')} of {int(p, 'steps')} done</Txt> : stt === 'finished' ? <Txt k="labelMedium" bold color={Brand.TealDark}>✓ Trip finished</Txt> : null}
              </View>
            </Press>
          </Appear>
        );
      }} />
  );
}

export function SavedPlansScreen() {
  return <View style={{ flex: 1 }}><BackBar title="Saved trip plans" onBack={Nav.back} /><SavedPlansList /></View>;
}

export function SavedPlanScreen() {
  const id = intParam(useParams().id);
  const tick = useAppState('refreshTick');
  const l = useLoader(() => Api.get(`trip/plans/${id}`), [id, tick]);
  const p = obj(l.data, 'plan');
  if (p) return <PlanView plan={p} savedId={id} onBack={Nav.back} onDeleted={Nav.back} tripInfo={l.data} />;
  if (l.loading) return <TripLoading title="Opening your trip plan" />;
  return <View style={{ flex: 1 }}><BackBar title="Trip plan" onBack={Nav.back} /><ErrorBox message={l.error || 'Could not open this plan.'} onRetry={l.reload} /></View>;
}

/* ---------- favourite places ---------- */

export function MyPlacesScreen() {
  const session = useSession();
  const tick = useAppState('refreshTick');
  const [tab, setTab] = useState(0);
  const [here, setHere] = useState<[number, number] | null>(Loc.lastFix ? [Loc.lastFix.lat, Loc.lastFix.lng] : null);
  const [msg, setMsg] = useState('');
  const locate = async () => { setMsg('Finding your location…'); const r = await Loc.current(); if (r.kind === 'found') { setHere([r.lat, r.lng]); setMsg(''); } else setMsg(locMsg(r, 'a place')); };
  const mine = useLoader(async () => (session?.user ? objs(await Api.get('places/mine'), 'items') : null), [session?.user?.id, tick]);
  const community = useLoader(async () => (here ? objs(await Api.get('places/community', { lat: here[0], lng: here[1], km: 50 }), 'items') : null), [here?.[0], here?.[1], tick]);
  useEffect(() => { if (tab === 1 && !here) locate(); }, [tab]);
  let body: React.ReactNode;
  if (tab === 0) {
    if (!session?.user) body = <EmptyBox title="Sign in to keep your places" text="Save the spots you love with photos — just for you, or shared with every traveller." action="Sign in" icon="star" onAction={() => Nav.navigate('login')} />;
    else if (!mine.data && mine.loading) body = <Loading />;
    else if (!mine.data) body = <ErrorBox message={mine.error || 'Could not load your places.'} onRetry={mine.reload} />;
    else if (!mine.data.length) body = <EmptyBox title="No favourite places yet" text="Tap the camera button to save a place with photos and notes." action="Add a place" icon="add-a-photo" onAction={() => Nav.navigate('placeedit/0')} />;
    else body = <PlaceList items={mine.data} mine />;
  } else {
    if (!here) body = <View style={{ padding: 16 }}><Txt color={Brand.Muted}>{msg || 'Share your location to see places travellers shared near you.'}</Txt><LinkButton text="Use my location" onPress={locate} /></View>;
    else if (!community.data && community.loading) body = <Loading />;
    else if (!community.data) body = <ErrorBox message={community.error || 'Could not load places.'} onRetry={community.reload} />;
    else if (!community.data.length) body = <EmptyBox title="Nothing shared near you yet" text="Places other travellers make public within 50 km appear here." icon="public" />;
    else body = <PlaceList items={community.data} mine={false} />;
  }
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Favourite places" onBack={Nav.back} />
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10 }}>
        {['My places', 'Shared by travellers'].map((t, i) => <Pressable key={t} onPress={() => setTab(i)} style={{ borderRadius: 50, backgroundColor: tab === i ? Brand.Blue : Brand.Sky, paddingHorizontal: 16, paddingVertical: 9 }}><Txt k="labelLarge" color={tab === i ? '#fff' : Brand.InkSoft}>{t}</Txt></Pressable>)}
      </View>
      <View style={{ flex: 1 }}>{body}</View>
      {session?.user ? <Press onPress={() => Nav.navigate('placeedit/0')} style={[st.shadow, { position: 'absolute', right: 16, bottom: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel="Add a place"><Icon name="add-a-photo" color={Brand.SunInk} /></Press> : null}
    </View>
  );
}

function PlaceList({ items, mine }: { items: J[]; mine: boolean }) {
  const [reported, setReported] = useState<number[]>([]);
  return (
    <FlatList data={items} keyExtractor={(p) => String(int(p, 'id'))} contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 90, gap: 12 }}
      renderItem={({ item: p, index: i }) => {
        const photos = strings(p, 'photos'); const id = int(p, 'id');
        const pub = text(p, 'visibility') === 'public';
        return (
          <Appear index={Math.min(i, 8)}>
            <Pressable disabled={!mine} onPress={() => Nav.navigate(`placeedit/${id}`)} style={{ borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, overflow: 'hidden' }}>
              {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{photos.map((u, j) => <Photo key={j} url={u} corner={0} style={{ width: photos.length === 1 ? 400 : 220, aspectRatio: 4 / 3, marginRight: 2 }} />)}</ScrollView> : null}
              <View style={{ padding: 14 }}>
                <View style={st.row}>
                  <Txt bold numberOfLines={2} style={{ flex: 1 }}>{text(p, 'name')}</Txt>
                  {mine ? <View style={[st.row, { borderRadius: 50, backgroundColor: pub ? Brand.TealSoft : Brand.Page, paddingHorizontal: 8, paddingVertical: 3 }]}><Icon name={pub ? 'public' : 'lock-outline'} size={14} color={Brand.InkSoft} /><Txt k="labelSmall"> {p.hidden ? 'Hidden by TripArro' : pub ? 'Public' : 'Private'}</Txt></View> : null}
                </View>
                <Txt k="labelMedium" color={Brand.Blue}>{[text(p, 'category_label'), num(p, 'km') !== null ? `${num(p, 'km')} km away` : null, !mine ? `Shared by ${text(p, 'by')}` : null].filter(Boolean).join(' · ')}</Txt>
                {str(p, 'details') ? <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={4} style={{ marginTop: 4 }}>{str(p, 'details')}</Txt> : null}
                {str(p, 'address') ? <Txt k="bodySmall" color={Brand.Muted}>{str(p, 'address')}</Txt> : null}
                <View style={[st.row, { gap: 8, marginTop: 8 }]}>
                  <OutlineButton text="Directions" icon="directions" onPress={() => openUrl(text(p, 'directions_url'))} />
                  {!mine ? <LinkButton text={reported.includes(id) ? 'Reported' : 'Report'} disabled={reported.includes(id)} onPress={() => Api.post(`places/${id}/report`).then(() => setReported((r) => [...r, id])).catch(() => {})} /> : null}
                </View>
              </View>
            </Pressable>
          </Appear>
        );
      }} />
  );
}

export function PlaceEditScreen() {
  const id = intParam(useParams().id);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('viewpoint');
  const [details, setDetails] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [pub, setPub] = useState(false);
  const [keep, setKeep] = useState<string[]>([]);
  const [added, setAdded] = useState<Picked[]>([]);
  const [cats, setCats] = useState<J[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [lmsg, setLmsg] = useState('');
  const locate = async () => { setLmsg('Finding your location…'); const r = await Loc.current(); if (r.kind === 'found') { setLat(r.lat); setLng(r.lng); setLmsg(''); } else setLmsg(locMsg(r, 'the address')); };
  useEffect(() => {
    (async () => {
      let found = false;
      try {
        const r = await Api.get('places/mine');
        setCats(objs(r, 'categories'));
        const p = objs(r, 'items').find((x) => int(x, 'id') === id);
        if (p) { found = true; setName(text(p, 'name')); setCategory(text(p, 'category', 'other')); setDetails(text(p, 'details')); setAddress(text(p, 'address')); setLat(num(p, 'lat')); setLng(num(p, 'lng')); setPub(text(p, 'visibility') === 'public'); setKeep(strings(p, 'photos')); }
      } catch {}
      if (id === 0 && !found) locate();
    })();
  }, [id]);
  const save = async () => {
    setBusy(true); setErr(null); setErrs({});
    try {
      const fields: [string, string][] = [['name', name.trim()], ['category', category], ['details', details.trim()], ['address', address.trim()], ['lat', lat !== null ? String(lat) : ''], ['lng', lng !== null ? String(lng) : ''], ['visibility', pub ? 'public' : 'private']];
      if (id !== 0) fields.push(['id', String(id)]);
      keep.forEach((u) => fields.push(['keep_photos[]', u]));
      const files: Upload[] = [];
      for (let i = 0; i < added.length; i++) files.push(await uploadOf('photos[]', added[i], `place${i}`));
      await Api.postMultipart('places', fields, files);
      AppState.bump(); Nav.back();
    } catch (e) { setErr(errorText(e)); if (e instanceof ApiError) setErrs(e.errors); }
    setBusy(false);
  };
  const RemoveDot = ({ onPress }: { onPress: () => void }) => <Pressable onPress={onPress} style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Remove photo"><Icon name="close" size={16} color="#fff" /></Pressable>;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title={id === 0 ? 'Add a favourite place' : 'Edit place'} onBack={Nav.back}
        actions={id !== 0 ? <Pressable onPress={() => Api.post(`places/${id}/delete`).then(() => { AppState.bump(); Nav.back(); }).catch((e) => setErr(errorText(e)))} style={st.barBtn} accessibilityLabel="Delete"><Icon name="delete-outline" color="#fff" /></Pressable> : null} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Txt bold>Photos</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 6 }}>
            {keep.map((u) => <View key={u}><Photo url={u} corner={14} style={{ width: 96, height: 96 }} /><RemoveDot onPress={() => setKeep((k) => k.filter((x) => x !== u))} /></View>)}
            {added.map((p, i) => <View key={p.uri}><Photo url={p.uri} corner={14} style={{ width: 96, height: 96 }} /><RemoveDot onPress={() => setAdded((a) => a.filter((_, j) => j !== i))} /></View>)}
            {keep.length + added.length < 6 ? (
              <Press onPress={async () => { const ps = await pickPhotos(6 - keep.length - added.length); setAdded((a) => [...a, ...ps].slice(0, 6 - keep.length)); }} style={{ width: 96, height: 96, borderRadius: 14, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="add-a-photo" color={Brand.Blue} /><Txt k="labelSmall" color={Brand.Blue}>Add</Txt>
              </Press>
            ) : null}
          </ScrollView>
          {errs.photos ? <Txt k="bodySmall" color={Brand.Danger}>{errs.photos}</Txt> : null}
          <Gap h={14} />
          <Field label="Name of the place" value={name} onChange={setName} error={errs.name} />
          <Gap h={8} />
          <Txt k="labelMedium" color={Brand.Muted}>Type</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {cats.map((c) => <Pressable key={text(c, 'key')} onPress={() => setCategory(text(c, 'key'))} style={{ borderRadius: 50, borderWidth: 1, borderColor: category === text(c, 'key') ? Brand.Sun : Brand.Line, backgroundColor: category === text(c, 'key') ? Brand.Sun : '#fff', paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" color={category === text(c, 'key') ? Brand.SunInk : Brand.InkSoft}>{text(c, 'label')}</Txt></Pressable>)}
          </ScrollView>
          <Gap h={8} />
          <Field label="What's special here" value={details} onChange={setDetails} lines={4} placeholder="Best time to go, what to try, parking…" />
          <Gap h={8} />
          <Field label="Address or landmark (optional)" value={address} onChange={setAddress} />
          <Gap />
          <View style={[st.row, { borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: errs.location ? Brand.Danger : Brand.Line, padding: 12 }]}>
            <Icon name="place" color={Brand.Blue} />
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Txt k="labelSmall" color={Brand.Muted}>Location</Txt>
              <Txt semi>{lat !== null && lng !== null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Not set'}</Txt>
              {lmsg ? <Txt k="bodySmall" color={Brand.Muted}>{lmsg}</Txt> : null}
            </View>
            <LinkButton text={lat === null ? 'Use my location' : 'Update'} onPress={locate} />
          </View>
          {errs.location ? <Txt k="bodySmall" color={Brand.Danger}>{errs.location}</Txt> : null}
          <Gap h={14} />
          <Txt bold>Who can see it?</Txt>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {([[false, 'Only me', 'lock-outline'], [true, 'Everyone', 'public']] as [boolean, string, string][]).map(([v, l, ic]) => (
              <Pressable key={l} onPress={() => setPub(v)} style={[st.row, { flex: 1, borderRadius: 16, backgroundColor: pub === v ? Brand.SunSoft : '#fff', borderWidth: 1.5, borderColor: pub === v ? Brand.Sun : Brand.Line, padding: 12 }]}>
                <Icon name={ic} size={20} color={Brand.InkSoft} /><Txt semi>  {l}</Txt>
              </Pressable>
            ))}
          </View>
          <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>{pub ? 'Other travellers will see the name, photos, details and location, with your first name. Phone numbers, emails and links are removed. You can make it private again any time.' : 'Only you can see this place.'}</Txt>
          <Gap h={16} />
          {err ? <><Notice text={err} tone="bad" /><Gap h={8} /></> : null}
          <PrimaryButton text="Save place" onPress={save} disabled={!name.trim()} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
