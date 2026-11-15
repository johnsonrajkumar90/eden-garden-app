/*
 * The traveller's own trip: they add stops from the plan, see the total km and hours, tap Start, then go stop by stop —
 * Directions to the next stop, "I'm done here", "next stop is coming up", until "You have finished this trip".
 * Also the planner's loading screen (the car driving along the road) and the stop details sheet.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Linking, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import { Api, errorText } from '../core/api';
import { AppState } from '../core/state';
import { J, int, num, obj, objs, str, strings, text } from '../core/json';
import * as Loc from '../core/location';
import { Brand } from '../theme';
import { BackBar, ErrorBox, Gap, Icon, LinkButton, OutlineButton, Photo, Press, PrimaryButton, Txt, st } from '../ui/kit';
import { Sheet, dial } from '../ui/sheets';
import { Nav, intParam, useParams } from '../nav';

export const RUN_GRAD = ['#D93338', '#E8474B', '#FF5757'] as const;
export const stopKey = (s: J) => `${text(s, 'category')}:${(num(s, 'lat') || 0).toFixed(4)}:${(num(s, 'lng') || 0).toFixed(4)}`;
export const stopEmoji = (cat?: string | null) => ({ coffee: '☕', petrol: '⛽', ev: '🔌', community: '⭐', restaurant: '🍽️' } as Record<string, string>)[cat || ''] || '📍';
export const hmText = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);
function kmBetween(a1: number, o1: number, a2: number, o2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(a2 - a1) / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(r(o2 - o1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const openLink = (u?: string | null) => { if (u) Linking.openURL(u).catch(() => {}); };

/** Turn-by-turn in Google Maps (or Apple Maps on iPhone) when it is there, otherwise the web directions link. */
export async function navigateTo(lat: number | null, lng: number | null, fallback?: string | null) {
  if (lat !== null && lng !== null) {
    const u = Platform.OS === 'android' ? `google.navigation:q=${lat},${lng}` : `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    try { if (await Linking.canOpenURL(u)) { await Linking.openURL(u); return; } } catch {}
    if (Platform.OS === 'ios') { try { await Linking.openURL(`maps://?daddr=${lat},${lng}`); return; } catch {} }
  }
  openLink(fallback || (lat !== null && lng !== null ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null));
}

/** A stop's photos and details, with Directions and Add / Remove. */
export function StopSheet({ s, picked, onToggle, onClose }: { s: J; picked: boolean | null; onToggle: (() => void) | null; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const own = strings(s, 'photos').length ? strings(s, 'photos') : str(s, 'photo') ? [str(s, 'photo')!] : [];
  const [google, setGoogle] = useState<J[]>([]);
  const [mapsUrl, setMapsUrl] = useState(str(s, 'maps_url'));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Api.get('trip/photos', { name: text(s, 'name'), lat: num(s, 'lat'), lng: num(s, 'lng'), address: str(s, 'address') })
      .then((r) => { setGoogle(objs(r, 'photos')); if (str(r, 'maps_url')) setMapsUrl(str(r, 'maps_url')); }).catch(() => {}).finally(() => setLoading(false));
  }, [stopKey(s)]);
  const photos: [string, string | null][] = [...own.map((u) => [u, null] as [string, null]), ...google.map((g) => [text(g, 'url'), str(g, 'credit')] as [string, string | null])];
  const where = s.near_destination ? `Near your destination · ${num(s, 'to_destination_km')} km away`
    : num(s, 'km_from_start') !== null ? `At km ${num(s, 'km_from_start')} from the start` + (num(s, 'off_route_km') !== null ? ` · ${num(s, 'off_route_km')} km off the road` : '') : null;
  const w = photos.length === 1 ? width - 32 : 280;
  return (
    <Sheet open onClose={onClose}>
      {photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {photos.map(([u, credit], i) => (
            <View key={i} style={{ width: w }}>
              <Photo url={u} corner={18} style={{ width: w, aspectRatio: 4 / 3 }} />
              {credit ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 2 }}>{credit}</Txt> : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={{ height: 150, borderRadius: 18, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36 }}>{stopEmoji(str(s, 'category'))}</Text>
          <Txt k="bodySmall" color={Brand.Muted}>{loading ? 'Looking for photos…' : 'No photos here yet'}</Txt>
        </View>
      )}
      <View style={{ paddingHorizontal: 4, paddingVertical: 14 }}>
        <Txt k="titleLarge" bold>{text(s, 'name')}</Txt>
        {where ? <Txt k="labelLarge" color={Brand.Blue}>{where}</Txt> : null}
        <Gap h={8} />
        {[str(s, 'info'), str(s, 'details'), str(s, 'opening_hours') ? `Open: ${str(s, 'opening_hours')}` : null, str(s, 'address'), str(s, 'by') ? `Shared by ${str(s, 'by')}` : null,
          num(s, 'stop_minutes') !== null ? `Plan about ${Math.round(num(s, 'stop_minutes')!)} min here` : null].filter(Boolean).map((t, i) => <Txt key={i} color={Brand.InkSoft} style={{ marginBottom: 4 }}>{t}</Txt>)}
        {str(s, 'source') ? <Txt k="labelSmall" color={Brand.Muted}>Information: {str(s, 'source')}</Txt> : null}
        <Gap h={14} />
        <PrimaryButton text="Directions" icon="directions" onPress={() => navigateTo(num(s, 'lat'), num(s, 'lng'), str(s, 'directions_url'))} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {picked !== null && onToggle ? <OutlineButton text={picked ? 'In my trip — remove' : 'Add to my trip'} icon={picked ? 'check' : 'add'} onPress={onToggle} style={{ flex: 1 }} /> : null}
          {str(s, 'phone') ? <OutlineButton text="Call" icon="call" onPress={() => dial(str(s, 'phone')!)} /> : null}
        </View>
        <LinkButton text="More photos & reviews on Google Maps" onPress={() => openLink(mapsUrl)} />
      </View>
    </Sheet>
  );
}

/** Bottom bar of a plan once stops are added: stops, km, hours and Start. */
export function TripTotalsBar({ count, trip, busy, starting, onStart }: { count: number; trip: J | null; busy: boolean; starting: boolean; onStart: () => void }) {
  return (
    <View style={[st.row, { backgroundColor: 'rgba(255,255,255,0.96)', marginHorizontal: 12, marginBottom: 6, borderRadius: 26, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#fff', elevation: 12, shadowColor: '#C8242B', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 5 } }]}>
      <View style={{ flex: 1 }}>
        <Txt bold>{count} stop{count === 1 ? '' : 's'} in your trip</Txt>
        <Txt k="labelLarge" color={Brand.Blue}>{!trip ? (busy ? 'Working out km and hours…' : '') : `${num(trip, 'km')} km · ${hmText(int(trip, 'total_minutes'))} in all`}</Txt>
        {str(trip, 'note') ? <Txt k="labelSmall" color={Brand.Muted} numberOfLines={2}>{str(trip, 'note')}</Txt> : null}
      </View>
      <Press onPress={onStart} style={[st.row, { borderRadius: 50, backgroundColor: Brand.Sun, paddingHorizontal: 18, paddingVertical: 12 }]}>
        <Icon name="play-arrow" color={Brand.SunInk} /><Txt bold color={Brand.SunInk}>{starting ? ' Starting…' : ' Start trip'}</Txt>
      </Press>
    </View>
  );
}

const LOAD_STEPS: [string, string][] = [['restaurant', 'Finding restaurants on your way…'], ['local-cafe', 'Looking for coffee shops…'], ['local-gas-station', 'Checking petrol pumps…'], ['ev-station', 'Checking EV chargers…']];

/** The Travel planner's loading screen: the logo, a road with the car driving along it, and what is being looked up now. */
export function TripLoading({ from, to, title = 'Planning your trip' }: { from?: string | null; to?: string | null; title?: string }) {
  const drive = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  const [w, setW] = useState(300);
  const [dash, setDash] = useState(0);
  useEffect(() => {
    const a = Animated.loop(Animated.timing(drive, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([Animated.timing(bounce, { toValue: 1, duration: 420, useNativeDriver: true }), Animated.timing(bounce, { toValue: 0, duration: 420, useNativeDriver: true })]));
    const c = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true })]));
    a.start(); b.start(); c.start();
    const t = setInterval(() => setStep((s) => (s + 1) % LOAD_STEPS.length), 1500);
    const d = setInterval(() => setDash((x) => (x + 4) % 40), 70);
    return () => { a.stop(); b.stop(); c.stop(); clearInterval(t); clearInterval(d); };
  }, []);
  return (
    <LinearGradient colors={RUN_GRAD as any} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.015] }) }] }}>
        <Image source={require('../../assets/logo_white.png')} style={{ height: 40, width: 160 }} contentFit="contain" />
      </Animated.View>
      <Txt k="headlineSmall" bold color="#fff" style={{ marginTop: 22 }}>{title}</Txt>
      <View style={{ alignSelf: 'stretch', height: 86, marginTop: 26 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Svg width={w} height={86} style={{ position: 'absolute' }}>
          <Line x1={18} y1={53} x2={w - 18} y2={53} stroke="#FFFFFF55" strokeWidth={16} strokeLinecap="round" />
          <Line x1={30} y1={53} x2={w - 30} y2={53} stroke="#fff" strokeWidth={2.5} strokeDasharray="10,10" strokeDashoffset={-dash} />
        </Svg>
        <Icon name="place" size={28} color={Brand.Sun} style={{ position: 'absolute', left: 0, top: 8 }} />
        <Animated.View style={{ position: 'absolute', right: 0, top: 4, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }] }}><Icon name="place" size={32} color="#fff" /></Animated.View>
        <Animated.View style={{ position: 'absolute', left: 0, top: 30, width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center',
          transform: [{ translateX: drive.interpolate({ inputRange: [0, 1], outputRange: [0, w - 44] }) }, { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
          <Icon name="directions-car" size={26} color={Brand.SunInk} />
        </Animated.View>
      </View>
      <View style={[st.row, { alignSelf: 'stretch', marginTop: 6 }]}>
        <Txt k="labelMedium" color="#FFE3DE" numberOfLines={1} style={{ flex: 1 }}>{from || 'You'}</Txt>
        <Txt k="labelMedium" bold color="#fff" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{to || ''}</Txt>
      </View>
      <View style={[st.row, { marginTop: 26, borderRadius: 50, backgroundColor: '#FFFFFF33', paddingHorizontal: 16, paddingVertical: 10 }]}>
        <Icon name={LOAD_STEPS[step][0]} size={20} color={Brand.Sun} /><Txt semi color="#fff">  {LOAD_STEPS[step][1]}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>{LOAD_STEPS.map((_, i) => <View key={i} style={{ width: i === step ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? Brand.Sun : '#FFFFFF66' }} />)}</View>
      <Txt k="bodySmall" color="#FFE3DE" center style={{ marginTop: 22 }}>TripArro AI is reading the real places along your route — this takes a few seconds.</Txt>
    </LinearGradient>
  );
}

/**
 * The trip, stop by stop. id > 0: a trip saved in My trips (progress kept on the server); id == 0: a trip started
 * without signing in (kept while the app is open).
 */
export default function TripRunScreen() {
  const id = intParam(useParams().id);
  const g = AppState.get();
  const [trip, setTrip] = useState<J | null>(id === 0 ? g.localTrip : null);
  const [done, setDone] = useState(id === 0 ? g.localTripDone : 0);
  const [title, setTitle] = useState(id === 0 ? g.localTripTitle : '');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(id !== 0);
  const [banner, setBanner] = useState<string | null>(null);
  const [reachedNear, setReachedNear] = useState(false);
  const [sheet, setSheet] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id === 0) return;
    Api.get(`trip/plans/${id}`).then((r) => {
      setTrip(obj(r, 'trip')); setDone(int(r, 'done_count')); setTitle(text(obj(r, 'plan'), 'title'));
      if (!obj(r, 'trip')) setErr('This plan has no trip yet — open it, add stops and tap Start trip.');
    }).catch((e) => setErr(errorText(e))).finally(() => setLoading(false));
  }, [id]);
  const t = trip;
  const stops = objs(t, 'stops');
  const dest = obj(t, 'destination');
  const steps = stops.length + 1;
  const finished = !!t && done >= steps;
  const target = !t || finished ? null : done < stops.length ? stops[done] : dest;
  const targetLeg = !t || finished ? null : done < stops.length ? obj(stops[done], 'leg') : obj(t, 'final_leg');
  const tKey = target ? stopKey(target) : '';

  // arrival: check the phone's position every 30 s while this screen is open
  useEffect(() => {
    setReachedNear(false);
    if (!target) return;
    let alive = true;
    const check = async () => {
      if (!(await Loc.hasPermission())) return;
      const r = await Loc.current(8000, false);
      if (alive && r.kind === 'found') setReachedNear(kmBetween(r.lat, r.lng, num(target, 'lat') || 0, num(target, 'lng') || 0) <= 0.35);
    };
    check(); const iv = setInterval(check, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, [tKey]);
  useEffect(() => { if (!banner) return; const x = setTimeout(() => setBanner(null), 7000); return () => clearTimeout(x); }, [banner]);

  const move = async (action: 'done' | 'undo' | 'restart') => {
    const before = done;
    const newDone = action === 'done' ? Math.min(steps, done + 1) : action === 'undo' ? Math.max(0, done - 1) : 0;
    const finishedName = action === 'done' ? (before < stops.length ? text(stops[before], 'name') : text(dest, 'name')) : null;
    const next = newDone < stops.length ? stops[newDone] : newDone === stops.length ? dest : null;
    const nextLeg = newDone < stops.length ? obj(stops[newDone], 'leg') : obj(t, 'final_leg');
    setBanner(finishedName && newDone < steps && next ? `✓ You finished ${finishedName}. Next: ${text(next, 'name')} is coming up${num(nextLeg, 'km') !== null ? ` — ${num(nextLeg, 'km')} km` : ''}.` : null);
    if (id === 0) { setDone(newDone); AppState.set({ localTripDone: newDone }); return; }
    setBusy(true);
    try { setDone(int(await Api.post(`trip/plans/${id}/progress`, { action }), 'done_count')); AppState.bump(); } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };

  if (loading) return <TripLoading title="Getting your trip ready" />;
  if (!t) return <View style={{ flex: 1 }}><BackBar title={title || 'Your trip'} onBack={Nav.back} /><View style={{ padding: 16 }}><ErrorBox message={err || 'This trip is not available any more.'} /></View></View>;
  const all = dest ? [...stops, dest] : stops;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title={title || 'Your trip'} onBack={Nav.back} />
      <FlatList data={all} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <LinearGradient colors={RUN_GRAD as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18 }}>
              <Txt k="labelLarge" color="#FFE3DE">{finished ? 'Trip finished' : done === 0 ? 'Ready to go' : 'On the way'}</Txt>
              <Txt k="headlineSmall" bold color="#fff">{num(t, 'km')} km · {hmText(int(t, 'total_minutes'))}</Txt>
              <Txt k="bodySmall" color="#FFE3DE">{stops.length} stop{stops.length === 1 ? '' : 's'} · {text(t, 'note')}</Txt>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' }}><View style={{ width: `${(done / steps) * 100}%`, height: 8, backgroundColor: Brand.Sun }} /></View>
              <Txt k="labelMedium" color="#fff" style={{ marginTop: 4 }}>{Math.min(done, steps)} of {steps} done</Txt>
              {id === 0 ? <Txt k="labelSmall" color="#FFE3DE" style={{ marginTop: 4 }}>Not saved — sign in and start again to keep this trip in My trips.</Txt> : null}
            </LinearGradient>
            {banner ? <View style={{ borderRadius: 16, backgroundColor: Brand.TealSoft, padding: 14 }}><Txt bold color={Brand.TealDark}>{banner}</Txt></View> : null}
            {err ? <ErrorBox message={err} /> : null}
            {finished ? (
              <View style={{ borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 22, alignItems: 'center' }}>
                <Text style={{ fontSize: 44 }}>🎉</Text>
                <Txt k="titleLarge" bold>You have finished this trip!</Txt>
                <Txt color={Brand.Muted} center>You reached {text(dest, 'name')} — {num(t, 'km')} km with {stops.length} stop{stops.length === 1 ? '' : 's'}.</Txt>
                <Gap h={14} />
                <PrimaryButton text="Back to My trips" onPress={() => Nav.navigate('trips')} style={{ alignSelf: 'stretch' }} />
                <LinkButton text="Do this trip again" onPress={() => move('restart')} />
              </View>
            ) : target ? (() => {
              const isDest = done >= stops.length;
              const photo = strings(target, 'photos')[0] || str(target, 'photo');
              return (
                <View style={{ borderRadius: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: reachedNear ? Brand.Teal : Brand.Sun, overflow: 'hidden' }}>
                  {photo ? <Pressable onPress={() => setSheet(target)}><Photo url={photo} corner={0} style={{ width: '100%', aspectRatio: 16 / 9 }} /></Pressable> : null}
                  <View style={{ padding: 16 }}>
                    <Txt k="labelLarge" color={Brand.Blue}>{isDest ? 'Your destination' : `Next stop · ${done + 1} of ${stops.length}`}</Txt>
                    <Txt k="titleLarge" bold numberOfLines={2}>{(isDest ? '' : stopEmoji(str(target, 'category')) + ' ') + text(target, 'name')}</Txt>
                    {targetLeg ? <Txt color={Brand.InkSoft}>{num(targetLeg, 'km')} km · about {hmText(int(targetLeg, 'minutes'))} from {done === 0 ? 'the start' : 'your last stop'}</Txt> : null}
                    {str(target, 'info') ? <Txt k="bodySmall" color={Brand.Muted}>{str(target, 'info')}</Txt> : null}
                    {reachedNear ? <Txt bold color={Brand.TealDark} style={{ marginTop: 6 }}>📍 You're here!</Txt> : null}
                    <Gap />
                    <PrimaryButton text="Directions" icon="directions" onPress={() => navigateTo(num(target, 'lat'), num(target, 'lng'), str(target, 'directions_url'))} />
                    <Gap h={8} />
                    <OutlineButton text={isDest ? "I've arrived — finish the trip" : 'Done here — next stop'} icon={isDest ? 'flag' : 'check'} disabled={busy} onPress={() => move('done')} />
                    <View style={{ flexDirection: 'row' }}>
                      {target !== dest ? <LinkButton text="Photos & details" onPress={() => setSheet(target)} /> : null}
                      {done > 0 ? <LinkButton text="Undo" disabled={busy} onPress={() => move('undo')} /> : null}
                    </View>
                  </View>
                </View>
              );
            })() : null}
            <Txt bold style={{ marginTop: 4 }}>Your stops</Txt>
          </View>
        }
        renderItem={({ item: s, index: i }) => {
          const isDest = i === stops.length;
          const state = i < done ? 'done' : i === done && !finished ? 'now' : 'later';
          const photo = strings(s, 'photos')[0] || str(s, 'photo');
          const leg = isDest ? obj(t, 'final_leg') : obj(s, 'leg');
          return (
            <Press onPress={() => { if (!isDest) setSheet(s); }} scaleTo={0.98} style={[st.row, { borderRadius: 18, backgroundColor: state === 'now' ? Brand.SunSoft : '#fff', borderWidth: 1, borderColor: state === 'now' ? Brand.Sun : Brand.Line, padding: 12 }]}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: state === 'done' ? Brand.Teal : state === 'now' ? Brand.Sun : Brand.Page, alignItems: 'center', justifyContent: 'center' }}>
                {state === 'done' ? <Icon name="check" size={18} color="#fff" /> : <Txt bold>{isDest ? '🏁' : i + 1}</Txt>}
              </View>
              {photo ? <Photo url={photo} corner={10} style={{ width: 48, height: 48, marginLeft: 10 }} /> : null}
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Txt bold numberOfLines={1}>{(isDest ? '' : stopEmoji(str(s, 'category')) + ' ') + text(s, 'name')}</Txt>
                <Txt k="labelSmall" color={Brand.Muted}>{[leg ? `${num(leg, 'km')} km · ${hmText(int(leg, 'minutes'))}` : null, !isDest ? (num(s, 'stop_minutes') !== null ? `~${Math.round(num(s, 'stop_minutes')!)} min stop` : null) : 'destination', state === 'done' ? 'done' : null].filter(Boolean).join(' · ')}</Txt>
              </View>
              <Pressable onPress={() => navigateTo(num(s, 'lat'), num(s, 'lng'), str(s, 'directions_url'))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Directions"><Icon name="directions" color={Brand.SunInk} /></Pressable>
            </Press>
          );
        }} />
      {sheet ? <StopSheet s={sheet} picked={null} onToggle={null} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}
