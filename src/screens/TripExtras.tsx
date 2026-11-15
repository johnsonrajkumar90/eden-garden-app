/*
 * Add a place from where you are: the phone's live location, named by Google (the nearest places, closest first).
 * When Google can't name the spot, the place is still pinned and the guest types the name.
 * Also: where a place comes from (here / search), and the trip photo sheet (album, camera or web).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Api } from '../core/api';
import { useLoader } from '../core/state';
import { J, bool, int, num, objs, str, text } from '../core/json';
import * as Loc from '../core/location';
import { Brand } from '../theme';
import { Icon, Press, Txt, st } from '../ui/kit';
import { TripCover } from './GroupsUi';

/** Names for a spot from the phone's own map data — the street, the area, the town. */
async function phonePlaces(lat: number, lng: number): Promise<J[]> {
  try {
    const list = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const out: J[] = []; const seen = new Set<string>();
    list.slice(0, 3).forEach((a) => {
      const area = [...new Set([a.district, a.city].filter(Boolean))].join(', ');
      [a.name && /[a-z]/i.test(a.name) && a.name !== a.street ? a.name : null, a.street, a.district, a.city].forEach((n) => {
        if (n && !seen.has(n)) { seen.add(n); out.push({ name: n, address: area === n ? a.region || '' : area, type: '', lat, lng }); }
      });
    });
    return out.slice(0, 4);
  } catch { return []; }
}

/** A location dot with a ring that pulses while the phone is finding its position. */
function PulseDot({ active }: { active: boolean }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!active) return; const l = Animated.loop(Animated.timing(p, { toValue: 1, duration: 1300, useNativeDriver: true })); l.start(); return () => { l.stop(); p.setValue(0); }; }, [active]);
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      {active ? <Animated.View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#D7192A55', opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) }] }} /> : null}
      <LinearGradient colors={['#B3122A', '#FF5A5A']} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Icon name="my-location" size={18} color="#fff" /></LinearGradient>
    </View>
  );
}

/** [onSpot] gets the spot: a chosen Google place (name, lat, lng) or just the position (empty name) to type a name for. */
export function LiveSpot({ onSpot }: { onSpot: (name: string, lat: number, lng: number) => void }) {
  const [state, setState] = useState('start');   // start, locating, naming, named, unnamed, denied, off, notfound
  const [options, setOptions] = useState<J[]>([]);
  const [chosen, setChosen] = useState(0);
  const [fromPhone, setFromPhone] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      setState('locating');
      const r = await Loc.current(12000, true);
      if (!alive) return;
      if (r.kind !== 'found') { setState(r.kind === 'denied' ? 'denied' : r.kind === 'off' ? 'off' : 'notfound'); return; }
      setState('naming');
      let opts: J[] = [];
      try { opts = objs(await Api.get('places/here', { lat: r.lat, lng: r.lng }), 'items'); } catch {}
      let phone = false;
      if (!opts.length) { opts = await phonePlaces(r.lat, r.lng); phone = opts.length > 0; }   // Google couldn't: the phone's own map names the street / area
      if (!alive) return;
      setOptions(opts); setFromPhone(phone); setChosen(0);
      if (opts.length) { setState('named'); onSpot(text(opts[0], 'name'), num(opts[0], 'lat') || r.lat, num(opts[0], 'lng') || r.lng); }
      else { setState('unnamed'); onSpot('', r.lat, r.lng); }
    })();
    return () => { alive = false; };
  }, [round]);
  const title = ({ locating: 'Finding where you are…', start: 'Finding where you are…', naming: 'Getting the name from Google…', named: "You're here", unnamed: 'Got your location', denied: "Location isn't allowed", off: 'Location is switched off' } as Record<string, string>)[state] || "Couldn't find your location";
  const sub = ({ named: 'Pick the right place — or change the name below.', unnamed: "Google couldn't name this spot. Type its name below — it's pinned on the map.", denied: 'Allow location for TripArro, or search for the place instead.', off: 'Turn on location on your phone, then try again.', notfound: 'Step outside or try again — or search for the place.' } as Record<string, string>)[state] || "Uses your phone's live location.";
  return (
    <LinearGradient colors={['#FFF1EE', '#FFF8F0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#D7192A22', padding: 14 }}>
      <View style={st.row}>
        <PulseDot active={state === 'locating' || state === 'naming'} />
        <View style={{ flex: 1, paddingLeft: 12 }}><Txt k="titleSmall" bold>{title}</Txt><Txt k="bodySmall" color={Brand.InkSoft}>{sub}</Txt></View>
        {['named', 'unnamed', 'notfound', 'off', 'denied'].includes(state) ? (
          <Pressable onPress={() => { if (state === 'off') Loc.openLocationSettings(); else if (state === 'denied' && round > 0) Loc.openAppSettings(); else setRound((x) => x + 1); }} style={{ padding: 8 }} accessibilityLabel="Try again">
            <Icon name="refresh" color={Brand.Matte} />
          </Pressable>
        ) : null}
      </View>
      {state === 'named' ? (
        <View style={{ paddingTop: 10 }}>
          {options.slice(0, 5).map((p, i) => {
            const on = i === chosen; const m = p.metres !== undefined ? int(p, 'metres') : null;
            const s = [text(p, 'type'), text(p, 'address')].filter(Boolean).join(' · ');
            return (
              <Pressable key={i} onPress={() => { setChosen(i); onSpot(text(p, 'name'), num(p, 'lat') || 0, num(p, 'lng') || 0); }}
                style={[st.row, { marginTop: 6, borderRadius: 14, backgroundColor: on ? '#fff' : '#FFFFFF80', borderWidth: on ? 1.5 : 1, borderColor: on ? Brand.Matte : Brand.Line, paddingHorizontal: 12, paddingVertical: 10 }]}>
                <Icon name={on ? 'check-circle' : 'place'} size={20} color={on ? Brand.Matte : Brand.Muted} />
                <View style={{ flex: 1, paddingLeft: 10 }}>
                  <Txt semi numberOfLines={1}>{text(p, 'name')}</Txt>
                  {s ? <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1}>{s}</Txt> : null}
                </View>
                {m !== null ? <Txt k="labelSmall" color={Brand.InkSoft}>{m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`}</Txt> : null}
              </Pressable>
            );
          })}
          <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>{fromPhone ? "Names from your phone's map — change the name if it isn't right" : 'Place names from Google'}</Txt>
        </View>
      ) : null}
    </LinearGradient>
  );
}

/** Where to take the place from: where you are now, or a search. */
export function PlaceSource({ here, onHere }: { here: boolean; onHere: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', borderRadius: 50, backgroundColor: Brand.Sky, padding: 4 }}>
      {([[true, "I'm here now", 'my-location'], [false, 'Search a place', 'search']] as [boolean, string, string][]).map(([v, l, ic]) => {
        const on = v === here;
        return (
          <Pressable key={l} onPress={() => onHere(v)} style={[st.row, { flex: 1, justifyContent: 'center', borderRadius: 50, backgroundColor: on ? '#fff' : 'transparent', paddingVertical: 9 }]}>
            <Icon name={ic} size={17} color={on ? Brand.Matte : Brand.InkSoft} /><Txt k="labelLarge" semi={on} color={on ? Brand.Matte : Brand.InkSoft}> {l}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function SourceTile({ icon, label, colors, enabled, onPress }: { icon: string; label: string; colors: string[]; enabled: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} disabled={!enabled} style={{ flex: 1, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, paddingVertical: 14, alignItems: 'center' }}>
      <LinearGradient colors={colors as any} style={{ width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color="#fff" /></LinearGradient>
      <Txt k="labelLarge" semi numberOfLines={1} style={{ marginTop: 8 }}>{label}</Txt>
    </Press>
  );
}

/**
 * The trip photo: a big preview, then where the new one comes from — the photo album, the camera, or the web
 * (Google photos of the place, with the automatic match first). Everyone in the trip sees it.
 */
export function CoverSheet({ id, g, busy, onAlbum, onCamera, onWeb, onDesign }: { id: number; g: J; busy: boolean; onAlbum: () => void; onCamera: () => void; onWeb: (photo: string | null) => void; onDesign: (key: string) => void }) {
  const opts = useLoader(() => Api.get(`trip-groups/${id}/cover-options`), [id]);
  const o = opts.data; const items = objs(o, 'items');
  return (
    <View>
      <Txt k="titleLarge" bold>Trip photo</Txt>
      <Txt k="bodySmall" color={Brand.InkSoft}>Everyone in the trip sees it at the top and on the trip card.</Txt>
      <View style={{ marginTop: 14, height: 200, borderRadius: 26, overflow: 'hidden' }}>
        <TripCover cover={str(g, 'cover')} name={text(g, 'title') + ' ' + text(g, 'destination')} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} iconSize={140} />
        <LinearGradient colors={['#00000000', '#15161CCC']} locations={[0.45, 1]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <Txt k="headlineSmall" bold color="#fff" numberOfLines={2} style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>{text(g, 'title')}</Txt>
        <View style={{ position: 'absolute', top: 12, left: 12, borderRadius: 50, backgroundColor: '#00000066', paddingHorizontal: 10, paddingVertical: 5 }}>
          <Txt k="labelMedium" color="#fff">{({ photo: 'Your photo', web: 'From the web', design: 'TripArro design' } as Record<string, string>)[text(g, 'cover_kind')] || 'No photo yet'}</Txt>
        </View>
        {busy ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <SourceTile icon="photo-library" label="Upload from gallery" colors={['#7C3AED', '#C084FC']} enabled={!busy} onPress={onAlbum} />
        <SourceTile icon="photo-camera" label="Camera" colors={['#0E7490', '#22D3EE']} enabled={!busy} onPress={onCamera} />
        <SourceTile icon="auto-awesome" label="Auto from web" colors={['#B3122A', '#FF8A3D']} enabled={!busy} onPress={() => onWeb(null)} />
      </View>
      {objs(g, 'cover_designs').length ? (
        <>
          <Txt k="titleMedium" bold style={{ marginTop: 20, marginBottom: 8 }}>Cover designs</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {objs(g, 'cover_designs').map((d) => {
              const current = str(g, 'cover') === str(d, 'url');
              return (
                <Pressable key={text(d, 'key')} disabled={busy} onPress={() => onDesign(text(d, 'key'))} style={{ width: '31.8%' }} accessibilityLabel={`Cover design: ${text(d, 'label')}`}>
                  <View style={{ aspectRatio: 1.45, borderRadius: 14, overflow: 'hidden', borderWidth: current ? 3 : 0, borderColor: Brand.Ink, backgroundColor: Brand.Field }}>
                    <Image source={{ uri: str(d, 'url') || undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    {current ? <View style={{ position: 'absolute', top: 4, right: 4, borderRadius: 12, backgroundColor: Brand.Ink }}><Icon name="check-circle" size={20} color={Brand.Sun} /></View> : null}
                  </View>
                  <Txt k="labelSmall" numberOfLines={1} style={{ marginTop: 3 }}>{text(d, 'label')}</Txt>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <Txt k="titleMedium" bold style={{ marginTop: 20, marginBottom: 8 }}>Photos from the web</Txt>
      {!o && opts.loading ? <Txt k="bodySmall" color={Brand.Muted}>Looking for photos of {text(g, 'destination') || text(g, 'title')}…</Txt>
        : o && !bool(o, 'google') ? <Txt k="bodySmall" color={Brand.Muted}>Web photos show here once Google Places is set up for the site. You can still use a photo from your album or camera.</Txt>
        : !items.length ? <Txt k="bodySmall" color={Brand.Muted}>No photos found for this trip's name. Add a destination to the trip, or use your own photo.</Txt>
        : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {items.map((it, i) => {
                const current = str(o, 'current') === text(it, 'photo');
                return (
                  <View key={i} style={{ width: 150 }}>
                    <Pressable disabled={busy} onPress={() => onWeb(text(it, 'photo'))} style={{ height: 110, borderRadius: 18, overflow: 'hidden', borderWidth: current ? 3 : 0, borderColor: Brand.Matte, backgroundColor: Brand.Sky }}>
                      <Image source={{ uri: str(it, 'photo_url') || undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={text(it, 'label')} />
                      {current ? <View style={{ position: 'absolute', top: 6, right: 6, borderRadius: 12, backgroundColor: Brand.Matte }}><Icon name="check-circle" color="#fff" /></View> : null}
                    </Pressable>
                    <Txt k="labelMedium" numberOfLines={1} style={{ marginTop: 4 }}>{text(it, 'label')}</Txt>
                    {text(it, 'credit') ? <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1}>Photo: {text(it, 'credit')}</Txt> : null}
                  </View>
                );
              })}
            </ScrollView>
            <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Photos from Google</Txt>
          </>
        )}
    </View>
  );
}
