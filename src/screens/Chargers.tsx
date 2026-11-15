/*
 * EV chargers. Public chargers from Open Charge Map through our own server (/api/chargers — the key never reaches the
 * app): place search or the phone's location, filters, a list by distance or power, details in a sheet, directions.
 * Above them, TripArro's own stations with live charger status and free reservations (pay the station for energy).
 */
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Api, errorText } from '../core/api';
import { useLoader, useSession } from '../core/state';
import { J, arr, bool, int, num, obj, objs, str, strings, text } from '../core/json';
import * as Loc from '../core/location';
import { Brand, Fonts } from '../theme';
import { Appear, BackBar, ErrorBox, Gap, Icon, KeyValue, LinkButton, Loading, Notice, OutlineButton, Photo, Pill, Press, PrimaryButton, Txt, isoDate, st } from '../ui/kit';
import { Field } from '../ui/inputs';
import { Sheet, dial } from '../ui/sheets';
import { Nav } from '../nav';

const DC = '#00875A', AC = '#1F6FEB', SLOW = '#8A8580';
const tierColor = (t?: string | null) => (t === 'dc' ? DC : t === 'ac' ? AC : SLOW);
const kw = (v: number | null) => (v === null ? null : v % 1 === 0 ? `${v} kW` : `${v.toFixed(1)} kW`);
const opState = (c: J) => { const s = obj(c, 'status'); return s && s.is_operational !== null && s.is_operational !== undefined ? (s.is_operational ? 'up' : 'down') : null; };
const open = (u: string) => Linking.openURL(u).catch(() => {});

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ borderRadius: 50, borderWidth: 1, borderColor: on ? Brand.Sun : Brand.Line, backgroundColor: on ? Brand.Sun : '#fff', paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" numberOfLines={1} color={on ? Brand.SunInk : Brand.InkSoft}>{label}</Txt></Pressable>;
}

export default function ChargersScreen() {
  const [center, setCenter] = useState<[number, number, string] | null>(null);
  const [distance, setDistance] = useState(25);
  const [type, setType] = useState<number | null>(null);
  const [minKw, setMinKw] = useState(0);
  const [working, setWorking] = useState(false);
  const [sort, setSort] = useState('distance');
  const [items, setItems] = useState<J[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [details, setDetails] = useState<number | null>(null);
  const [meta, setMeta] = useState<J | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    (async () => {
      let m: J | null = null;
      try { m = await Api.get('chargers/meta'); setMeta(m); } catch {}
      let fix = Loc.lastFix;
      if (!fix && (await Loc.hasPermission())) { const r = await Loc.current(8000, false); if (r.kind === 'found') fix = r; }
      setCenter(fix ? [fix.lat, fix.lng, 'your location'] : [num(obj(m, 'center'), 'lat') ?? 11.0168, num(obj(m, 'center'), 'lng') ?? 76.9558, 'Coimbatore']);
    })();
  }, []);
  // search again whenever the place or a filter changes (the newest search wins)
  useEffect(() => {
    if (!center) return;
    const my = ++seq.current;
    setLoading(true); setError(null);
    Api.get('chargers', { lat: center[0], lng: center[1], distance, connection_type_id: type, min_power_kw: minKw > 0 ? minKw : null, operational_only: working, sort })
      .then((r) => { if (my === seq.current) setItems(objs(r, 'data')); })
      .catch((e) => { if (my === seq.current) { setItems([]); setError(errorText(e)); } })
      .finally(() => { if (my === seq.current) setLoading(false); });
  }, [center?.[0], center?.[1], distance, type, minKw, working, sort]);

  const useLocation = async () => {
    setInfo('Finding your location…');
    const r = await Loc.current();
    if (r.kind === 'found') { setCenter([r.lat, r.lng, 'your location']); setInfo(null); }
    else setInfo(r.kind === 'off' ? 'Location is switched off on your phone. Turn it on, or type a place.' : r.kind === 'denied' ? 'Location is not allowed for TripArro. Allow it in the app settings, or type a place.' : "We couldn't find your location just now. Try again, or type a place.");
  };
  const findPlace = async () => {
    if (q.trim().length < 2) return;
    Keyboard.dismiss(); setInfo(`Finding ${q.trim()}…`);
    try { const r = await Api.get('geocode', { q: q.trim() }); const la = num(r, 'lat'), ln = num(r, 'lng'); if (la !== null && ln !== null) { setCenter([la, ln, q.trim()]); setInfo(null); } }
    catch (e) { setInfo(errorText(e)); }
  };
  const dists = arr<number>(meta, 'distances').length ? arr<number>(meta, 'distances') : [5, 10, 25, 50, 100];
  const types = objs(meta, 'connection_types');

  const header = (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 22, backgroundColor: '#fff', padding: 14 }}>
        <View style={st.row}>
          <View style={[st.row, { flex: 1, borderWidth: 1, borderColor: '#E6DDD8', borderRadius: 16, paddingLeft: 12 }]}>
            <Icon name="search" color={Brand.Muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Town or area, e.g. Ooty" placeholderTextColor="#A59C97" returnKeyType="search" onSubmitEditing={findPlace}
              style={{ flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Brand.Ink, paddingVertical: 13, paddingHorizontal: 8 }} accessibilityLabel="Town or area" />
          </View>
          <Pressable onPress={useLocation} style={{ marginLeft: 8, width: 52, height: 52, borderRadius: 26, backgroundColor: Brand.SunSoft, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="My location"><Icon name="my-location" color={Brand.SunInk} /></Pressable>
        </View>
        {info ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>{info}</Txt> : null}
        <Gap h={10} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{dists.map((d) => <Chip key={d} label={`${d} km`} on={distance === d} onPress={() => setDistance(d)} />)}</ScrollView>
        <Gap h={6} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {([[0, 'Any power'], [7, '7 kW+'], [22, '22 kW+'], [50, '50 kW+'], [150, '150 kW+']] as [number, string][]).map(([v, l]) => <Chip key={v} label={l} on={minKw === v} onPress={() => setMinKw(v)} />)}
          <Chip label="Working only" on={working} onPress={() => setWorking(!working)} />
        </ScrollView>
        {types.length ? (
          <><Gap h={6} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <Chip label="Any connector" on={type === null} onPress={() => setType(null)} />
              {types.map((t) => <Chip key={int(t, 'id')} label={text(t, 'name')} on={type === int(t, 'id')} onPress={() => setType(int(t, 'id'))} />)}
            </ScrollView></>
        ) : null}
      </View>
      {center ? <TripArroStations lat={center[0]} lng={center[1]} km={distance} /> : null}
      <View>
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Txt k="titleMedium" bold>{loading ? 'Finding chargers…' : error ? 'Chargers' : `${items.length} charger${items.length === 1 ? '' : 's'} within ${distance} km`}</Txt>
            {center ? <Txt k="bodySmall" color={Brand.Muted}>Around {center[2]}</Txt> : null}
          </View>
          <Chip label="Nearest" on={sort === 'distance'} onPress={() => setSort('distance')} />
          <View style={{ width: 6 }} />
          <Chip label="Most power" on={sort === 'power'} onPress={() => setSort('power')} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          {[[DC, 'DC fast'], [AC, 'AC'], [SLOW, 'Slow']].map(([c, l]) => <View key={l} style={st.row}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} /><Txt k="labelSmall" color={Brand.Muted}> {l}</Txt></View>)}
        </View>
      </View>
      {loading && !items.length ? <Loading /> : error ? <ErrorBox message={error} /> : meta && meta.configured === false ? <Txt color={Brand.Muted}>The charger map is not switched on yet.</Txt>
        : !items.length && !loading ? (
          <View style={{ borderRadius: 20, backgroundColor: '#fff', padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 28 }}>🔌</Text>
            <Txt bold>No chargers found here</Txt>
            <Txt k="bodySmall" color={Brand.Muted}>Choose a bigger distance or remove a filter.</Txt>
          </View>
        ) : null}
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="EV chargers" onBack={Nav.back} />
      <FlatList data={error ? [] : items} keyExtractor={(c) => String(c.id)} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32, gap: 12 }} keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListFooterComponent={<Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 12 }}>Public chargers come from community databases (Open Charge Map / OpenStreetMap) — status and prices can be out of date. Data © Open Charge Map and OpenStreetMap contributors.</Txt>}
        renderItem={({ item: c, index }) => <Appear index={Math.min(index, 8)}><ChargerCard c={c} onPress={() => setDetails(Number(c.id))} /></Appear>} />
      {details !== null ? <ChargerSheet id={details} onClose={() => setDetails(null)} /> : null}
    </View>
  );
}

function ChargerCard({ c, onPress }: { c: J; onPress: () => void }) {
  const s = opState(c);
  const types = [...new Set(objs(c, 'connections').map((x) => text(x, 'type')))].slice(0, 4);
  return (
    <Press onPress={onPress} scaleTo={0.98} style={{ borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: s === 'down' ? '#C6282866' : Brand.Line, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt bold numberOfLines={2}>{text(c, 'name', 'EV charging point')}</Txt>
          {str(c, 'address') ? <Txt k="bodySmall" color={Brand.Muted} numberOfLines={2}>{str(c, 'address')}</Txt> : null}
        </View>
        {kw(num(c, 'max_power_kw')) ? <View style={{ marginLeft: 8, borderRadius: 50, backgroundColor: tierColor(str(c, 'speed_tier')), paddingHorizontal: 10, paddingVertical: 4 }}><Txt k="labelMedium" bold color="#fff">{kw(num(c, 'max_power_kw'))}</Txt></View> : null}
      </View>
      <View style={[st.row, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
        {num(c, 'distance_km') !== null ? <Txt k="labelMedium" bold>{num(c, 'distance_km')} km</Txt> : null}
        <View style={{ borderRadius: 50, backgroundColor: s === 'down' ? Brand.DangerSoft : s === 'up' ? Brand.TealSoft : Brand.Page, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Txt k="labelMedium" bold color={s === 'down' ? Brand.Danger : s === 'up' ? Brand.Teal : Brand.Muted}>{str(obj(c, 'status'), 'label') || 'Unknown status'}</Txt>
        </View>
        {c.number_of_points ? <Txt k="labelMedium" color={Brand.Muted}>{c.number_of_points} point{c.number_of_points === 1 ? '' : 's'}</Txt> : null}
      </View>
      {types.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{types.map((t) => <View key={t} style={{ borderRadius: 50, backgroundColor: Brand.Page, paddingHorizontal: 8, paddingVertical: 3 }}><Txt k="labelSmall">⚡ {t}</Txt></View>)}</View> : null}
      {str(c, 'directions_url') ? <OutlineButton text="Get directions" icon="directions" onPress={() => open(str(c, 'directions_url')!)} style={{ marginTop: 8, alignSelf: 'flex-start' }} /> : null}
    </Press>
  );
}

function ChargerSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const l = useLoader(async () => obj(await Api.get(`chargers/${id}`), 'data'), [id]);
  const c = l.data;
  const yn = (k: string) => (c?.[k] === undefined || c?.[k] === null ? 'Not specified' : c[k] ? 'Yes' : 'No');
  return (
    <Sheet open onClose={onClose}>
      {l.loading ? <Loading /> : l.error ? <ErrorBox message={l.error} /> : c ? (
        <View>
          <View style={st.row}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tierColor(str(c, 'speed_tier')), alignItems: 'center', justifyContent: 'center' }}><Icon name="ev-station" color="#fff" /></View>
            <View style={{ flex: 1, paddingLeft: 12 }}><Txt k="titleMedium" bold>{text(c, 'name')}</Txt>{str(c, 'address') ? <Txt k="bodySmall" color={Brand.Muted}>{str(c, 'address')}</Txt> : null}</View>
          </View>
          <Gap h={14} />
          {([['Status', str(obj(c, 'status'), 'label') || 'Unknown status'], ['Operator', str(obj(c, 'operator'), 'name') || 'Unknown operator'], ['Usage', text(c, 'usage_type', 'Not specified')],
            ['Cost', text(c, 'usage_cost', 'Not specified')], ['Membership needed', yn('membership_required')], ['Pay on site', yn('pay_at_location')],
            ['Charging points', c.number_of_points ? String(c.number_of_points) : 'Not specified'], ['Max power', kw(num(c, 'max_power_kw')) || 'Not specified'],
            ['Last verified', str(c, 'last_verified')?.slice(0, 10) || 'Not known'], ['Phone', str(c, 'phone') || '—']] as [string, string][]).map(([k, v]) => <KeyValue key={k} k={k} v={v} />)}
          {[str(c, 'access_comments'), str(c, 'general_comments')].filter(Boolean).map((t, i) => <View key={i} style={{ marginTop: 6, borderRadius: 12, backgroundColor: Brand.Page, padding: 10 }}><Txt k="bodySmall">{t}</Txt></View>)}
          {objs(c, 'connections').length ? (
            <><Gap h={14} /><Txt bold>Connectors</Txt>
              {objs(c, 'connections').map((x, i) => (
                <View key={i} style={{ borderTopWidth: 1, borderTopColor: Brand.Line, marginTop: 6, paddingTop: 6 }}>
                  <Txt bold>{text(x, 'type')}</Txt>
                  <Txt k="bodySmall" color={Brand.Muted}>{[kw(num(x, 'power_kw')), str(x, 'current_type'), x.quantity ? `× ${x.quantity}` : null, str(x, 'status')].filter(Boolean).join(' · ') || 'No details'}</Txt>
                </View>
              ))}</>
          ) : null}
          <Gap h={16} />
          {str(c, 'directions_url') ? <PrimaryButton text="Get directions" icon="directions" onPress={() => open(str(c, 'directions_url')!)} /> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {str(obj(c, 'operator'), 'website') ? <OutlineButton text="Operator" icon="open-in-new" onPress={() => open(str(obj(c, 'operator'), 'website')!)} /> : null}
            {str(c, 'source_url') || str(c, 'ocm_url') ? <OutlineButton text={str(c, 'source') || 'Open Charge Map'} icon="open-in-new" onPress={() => open((str(c, 'source_url') || str(c, 'ocm_url'))!)} /> : null}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

/* ---------- TripArro EV stations ---------- */
const hm = (s: string) => s.slice(11, 16);

/** The TripArro stations near the place being searched (shown above the public charger list). */
export function TripArroStations({ lat, lng, km }: { lat: number; lng: number; km: number }) {
  const session = useSession();
  const l = useLoader(() => Api.get('ev/stations', { lat, lng, radius: Math.max(km, 25) }), [lat, lng, km]);
  const mine = useLoader(async () => (session?.user ? Api.get('ev/reservations') : null), [session?.user?.id]);
  const [openId, setOpenId] = useState<number | null>(null);
  const rs = objs(mine.data, 'reservations').filter((r) => ['held', 'charging'].includes(text(r, 'state')));
  const list = objs(l.data, 'stations');
  return (
    <View>
      {rs.length ? <><Txt k="titleMedium" bold>Your charger reservations</Txt><Gap h={6} />{rs.map((r) => <View key={text(r, 'ref')} style={{ marginBottom: 8 }}><MyEvReservation r={r} changed={mine.reload} /></View>)}<Gap h={6} /></> : null}
      {!l.data && l.loading ? <Loading /> : list.length ? (
        <>
          <View style={st.row}><Icon name="verified" size={20} color={Brand.Teal} /><Txt k="titleMedium" bold>  TripArro stations · live status</Txt></View>
          <Txt k="bodySmall" color={Brand.Muted}>Checked by the TripArro team. Reserve a charger free — you pay the station for the energy.</Txt>
          <Gap h={8} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {list.map((s, i) => {
              const free = int(s, 'chargers_free'), total = int(s, 'chargers_total');
              return (
                <Appear key={int(s, 'id')} index={Math.min(i, 6)}>
                  <Press onPress={() => setOpenId(int(s, 'id'))} style={{ width: 250, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, overflow: 'hidden' }}>
                    <View>
                      <Photo url={str(s, 'photo')} corner={0} style={{ width: 250, height: 120 }} />
                      <View style={{ position: 'absolute', top: 8, left: 8, borderRadius: 50, backgroundColor: free > 0 ? Brand.Teal : Brand.Danger, paddingHorizontal: 10, paddingVertical: 4 }}><Txt k="labelMedium" color="#fff">{free > 0 ? `${free} of ${total} free` : 'All in use'}</Txt></View>
                    </View>
                    <View style={{ padding: 12 }}>
                      <Txt k="titleSmall" numberOfLines={1}>{text(s, 'title')}</Txt>
                      <Txt k="bodySmall" color={Brand.Muted}>{[str(s, 'city'), num(s, 'km') !== null ? `${num(s, 'km')!.toFixed(1)} km` : null].filter(Boolean).join(' · ')}</Txt>
                      <Txt k="labelSmall" color={Brand.InkSoft} numberOfLines={1} style={{ marginTop: 4 }}>{strings(s, 'connectors').join(', ')} · up to {kw(num(s, 'max_kw')) || ''}{num(s, 'price_from') !== null ? ` · from ₹${Math.round(num(s, 'price_from')!)}/kWh` : ''}</Txt>
                    </View>
                  </Press>
                </Appear>
              );
            })}
          </ScrollView>
        </>
      ) : null}
      {openId !== null ? <EvStationSheet id={openId} onClose={() => setOpenId(null)} reserved={mine.reload} /> : null}
    </View>
  );
}

function MyEvReservation({ r, changed }: { r: J; changed: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ borderRadius: 18, backgroundColor: Brand.TealSoft, padding: 12 }}>
      <View style={st.row}>
        <Icon name="ev-station" color={Brand.TealDark} />
        <View style={{ flex: 1, paddingLeft: 10 }}>
          <Txt k="titleSmall" numberOfLines={1}>{text(obj(r, 'station'), 'title')}</Txt>
          <Txt k="bodySmall" color={Brand.InkSoft}>{text(obj(r, 'charger'), 'label')} · {hm(text(r, 'start_at'))} · held until {hm(text(r, 'hold_until'))}</Txt>
        </View>
        <Pill text={text(r, 'state_label')} tone="ok" />
      </View>
      {bool(r, 'can_cancel') ? <LinkButton text="Cancel reservation" color={Brand.Danger} disabled={busy} onPress={async () => {
        setBusy(true);
        try { setMsg(text(await Api.post(`ev/reservations/${text(r, 'ref')}/cancel`), 'message', 'Reservation cancelled.')); } catch (e) { setMsg(errorText(e)); }
        setBusy(false); changed();
      }} /> : null}
      {msg ? <Txt k="bodySmall" color={Brand.InkSoft}>{msg}</Txt> : null}
    </View>
  );
}

function EvStationSheet({ id, onClose, reserved }: { id: number; onClose: () => void; reserved: () => void }) {
  const session = useSession();
  const l = useLoader(async () => obj(await Api.get(`ev/stations/${id}`), 'station'), [id]);
  const [charger, setCharger] = useState<number | null>(null);
  const [inMin, setInMin] = useState(15);
  const [duration, setDuration] = useState(60);
  const [name, setName] = useState(session?.user?.name || '');
  const [phone, setPhone] = useState('');
  const [car, setCar] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const s = l.data;
  const hold = async () => {
    setBusy(true); setErr(null);
    try {
      const d = new Date(Date.now() + inMin * 60000);
      const start = `${isoDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setDone(text(await Api.post('ev/reservations', { charger_id: charger, start, duration, name, phone, vehicle: car.trim() || null }), 'message', 'Charger held for you.'));
      reserved(); l.reload();
    } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  return (
    <Sheet open onClose={onClose}>
      {!s && l.loading ? <Loading /> : !s ? <ErrorBox message={l.error || 'Could not open the station.'} onRetry={l.reload} /> : (
        <View>
          <Txt k="headlineSmall">{text(s, 'title')}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{[str(s, 'address'), str(s, 'city'), str(s, 'opening_hours')].filter(Boolean).join(' · ')}</Txt>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {str(s, 'maps_url') ? <OutlineButton text="Directions" icon="directions" onPress={() => open(str(s, 'maps_url')!)} /> : null}
            {str(s, 'phone') ? <OutlineButton text="Call" icon="call" onPress={() => dial(str(s, 'phone')!)} /> : null}
          </View>
          {objs(s, 'amenities').length ? <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginTop: 8 }}>{objs(s, 'amenities').map((a) => text(a, 'icon') + ' ' + text(a, 'label')).join('   ')}</Txt> : null}
          <Gap h={14} />
          <Txt k="titleMedium">Chargers</Txt>
          <Gap h={6} />
          {objs(s, 'chargers').map((c) => {
            const free = text(c, 'state') === 'available'; const on = charger === int(c, 'id');
            const res = objs(c, 'reserved');
            return (
              <Press key={int(c, 'id')} onPress={() => { setCharger(int(c, 'id')); setDone(null); }} scaleTo={0.98} style={[st.row, { marginBottom: 8, borderRadius: 16, backgroundColor: on ? Brand.SunSoft : '#fff', borderWidth: on ? 2 : 1, borderColor: on ? Brand.Sun : Brand.Line, padding: 12 }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: free ? Brand.Teal : text(c, 'state') === 'offline' ? '#9E9E9E' : Brand.Danger }} />
                <View style={{ flex: 1, paddingLeft: 10 }}>
                  <Txt k="titleSmall">{text(c, 'label')} · {text(c, 'connector')} · {kw(num(c, 'power_kw')) || ''}{bool(c, 'dc') ? ' DC' : ''}</Txt>
                  <Txt k="bodySmall" color={Brand.Muted}>{text(c, 'state_label')}{num(c, 'price_per_kwh') !== null ? ` · ₹${Math.round(num(c, 'price_per_kwh')!)}/kWh` : ''}{res.length ? ' · reserved ' + res.slice(0, 3).map((x) => hm(text(x, 'from')) + '–' + hm(text(x, 'to'))).join(', ') : ''}</Txt>
                </View>
              </Press>
            );
          })}
          {charger !== null ? (
            <>
              <Gap h={8} />
              <Txt k="titleMedium">Reserve this charger</Txt>
              <Gap h={6} />
              <Txt k="labelLarge" color={Brand.InkSoft}>I will arrive in</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
                {([[0, 'Now'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']] as [number, string][]).map(([m, t]) => <Chip key={m} label={t} on={inMin === m} onPress={() => setInMin(m)} />)}
              </ScrollView>
              <Txt k="labelLarge" color={Brand.InkSoft}>Charging for</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
                {([[30, '30 min'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours']] as [number, string][]).map(([m, t]) => <Chip key={m} label={t} on={duration === m} onPress={() => setDuration(m)} />)}
              </ScrollView>
              <Field label="Your name" value={name} onChange={setName} /><Gap h={6} />
              <Field label="Mobile number" value={phone} onChange={(v) => setPhone(v.slice(0, 15))} keyboard="phone-pad" /><Gap h={6} />
              <Field label="Car (optional)" value={car} onChange={(v) => setCar(v.slice(0, 60))} />
              {err ? <><Gap h={8} /><Notice text={err} tone="bad" /></> : null}
              {done ? <><Gap h={8} /><Notice text={done} tone="ok" /></> : null}
              <Gap h={10} />
              {!done ? <PrimaryButton text="Hold this charger" onPress={hold} loading={busy} /> : null}
            </>
          ) : <Txt k="bodySmall" color={Brand.Muted}>Tap a charger to reserve it.</Txt>}
        </View>
      )}
    </Sheet>
  );
}
