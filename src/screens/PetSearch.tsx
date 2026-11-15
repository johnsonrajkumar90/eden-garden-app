// Pet services: verified pet hosts by city or near you, dates, pet, filters, and the AI assistant.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, errorText } from '../core/api';
import { AppState } from '../core/state';
import { J, int, objs } from '../core/json';
import * as Loc from '../core/location';
import { Brand, Fonts } from '../theme';
import { Appear, EmptyBox, ErrorBox, Gap, Icon, LinkButton, Press, PrimaryButton, Txt, st, TopBar } from '../ui/kit';
import { Choice, DateRangeField, Stepper } from '../ui/inputs';
import { Floaty, SUN_GRAD, SkeletonGrid, chunk } from '../ui/cards';
import { PetGridCard, petEmoji, petTypes } from '../ui/petcards';
import { Nav } from '../nav';

const facilityChips: [string, string][] = [['pickup', 'Pickup & drop'], ['ac', 'AC'], ['cctv', 'CCTV'], ['grooming', 'Grooming'], ['vet', 'Vet help'],
  ['supervision', '24-hour care'], ['outdoor', 'Outdoor play'], ['indoor', 'Indoor'], ['private_room', 'Private room']];

export default function PetSearchScreen() {
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [type, setType] = useState('');
  const [pets, setPets] = useState(1);
  const [sort, setSort] = useState('relevance');
  const [instant, setInstant] = useState(false);
  const [daycare, setDaycare] = useState(false);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [near, setNear] = useState<[number, number] | null>(null);
  const [items, setItems] = useState<J[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locFix, setLocFix] = useState<null | 'settings' | 'location'>(null);
  const list = useRef<FlatList<any>>(null);
  const f = useRef<any>({}); f.current = { city, checkIn, checkOut, type, pets, sort, instant, daycare, facilities, near };

  const search = async (scroll = false, over: Partial<typeof f.current> = {}) => {
    const v = { ...f.current, ...over };
    setLoading(true); setError(null);
    try {
      const r = await Api.get('pets/search', { city: v.city.trim() || null, check_in: v.checkIn || null, check_out: v.checkOut || null, type: v.type || null, pets: v.pets, sort: v.sort,
        instant: v.instant, daycare: v.daycare, facilities: v.facilities.join(',') || null, lat: v.near?.[0], lng: v.near?.[1], radius_km: v.near && !v.city.trim() ? 50 : null });
      setItems(objs(r, 'items'));
    } catch (e) { setError(errorText(e)); }
    setLoading(false);
    if (scroll) setTimeout(() => { try { list.current?.scrollToIndex({ index: 2, animated: true }); } catch {} }, 100);
  };
  useEffect(() => { if (!items) search(); }, []);

  const locate = async () => {
    setLocating(true); setLocFix(null); setInfo('Finding your location…');
    const r = await Loc.current();
    if (r.kind === 'found') { setNear([r.lat, r.lng]); setCity(''); setSort('distance'); setInfo('Showing pet hosts near you.'); search(true, { near: [r.lat, r.lng], city: '', sort: 'distance' }); }
    else if (r.kind === 'off') { setInfo('Location is switched off on your phone. Turn it on, then tap the location button again.'); setLocFix('location'); }
    else if (r.kind === 'denied') { setInfo('Location is not allowed — allow it in the app settings, or type a city.'); setLocFix('settings'); }
    else setInfo("We couldn't find your location just now (weak signal?). Try again outdoors or type a city.");
    setLocating(false);
  };
  const toggle = (k: string) => { const nf = facilities.includes(k) ? facilities.filter((x) => x !== k) : [...facilities, k]; setFacilities(nf); search(true, { facilities: nf }); };

  const rows: { key: string; el: React.ReactElement }[] = [];
  rows.push({ key: 'head', el: (
    <View>
      <TopBar style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Image source={require('../../assets/logo_white.png')} style={{ height: 30, width: 112 }} contentFit="contain" contentPosition="left" accessibilityLabel="TripArro" />
      </TopBar>
      <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: 70, width: 190, height: 150, borderTopLeftRadius: 95, borderTopRightRadius: 95, backgroundColor: '#FFF1C7' }} />
      <Floaty distance={6} ms={2400} style={{ position: 'absolute', right: 40, top: 70, opacity: 0.8, transform: [{ rotate: '18deg' }] }}><Text style={{ fontSize: 40 }}>🐾</Text></Floaty>
      <Floaty distance={5} ms={2100} style={{ position: 'absolute', right: 110, top: 140, opacity: 0.6 }}><Text style={{ fontSize: 24 }}>🦴</Text></Floaty>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Gap h={8} />
        <Appear><Txt k="displaySmall" style={{ maxWidth: 260 }}>A loving home for your pet</Txt></Appear>
        <Appear index={1}><Txt color={Brand.Muted} style={{ marginTop: 6 }}>Verified pet hosts · daily photo diary · secure payment</Txt></Appear>
        <Gap h={16} />
        <Appear index={2} style={[st.card, { borderRadius: 28, padding: 14, shadowOpacity: 0.08, shadowRadius: 18, elevation: 6 }]}>
          <View style={[st.row, { borderRadius: 18, backgroundColor: Brand.Field, paddingLeft: 14 }]}>
            <Icon name="search" color={Brand.Ink} />
            <TextInput value={city} onChangeText={(v) => { setCity(v); setNear(null); }} placeholder={near ? 'Near my location' : 'City or area, e.g. Coimbatore'} placeholderTextColor="#A59C97"
              returnKeyType="search" onSubmitEditing={() => search(true)} style={{ flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Brand.Ink, paddingVertical: 14, paddingHorizontal: 8 }} accessibilityLabel="City or area" />
            {locating ? <ActivityIndicator color={Brand.Teal} style={{ marginRight: 14 }} /> : <Pressable onPress={locate} style={{ padding: 12 }} accessibilityLabel="Use my location"><Icon name="my-location" color={Brand.Teal} /></Pressable>}
          </View>
          <Gap h={10} />
          <DateRangeField checkIn={checkIn} checkOut={checkOut} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
          <Gap h={10} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {petTypes.map(([k, l]) => (
              <Press key={k} onPress={() => setType(k)} style={{ borderRadius: 50, overflow: 'hidden' }}>
                <LinearGradient colors={type === k ? (SUN_GRAD as any) : [Brand.Page, Brand.Page]} style={[st.row, { paddingHorizontal: 12, paddingVertical: 8 }]}>
                  <Text style={{ fontSize: 16 }}>{(petEmoji[k] || '🐾') + ' '}</Text><Txt k="labelLarge" color={type === k ? Brand.SunInk : Brand.InkSoft}>{l}</Txt>
                </LinearGradient>
              </Press>
            ))}
          </ScrollView>
          <Stepper label="Pets" value={pets} onChange={setPets} min={1} max={6} />
          <Gap h={4} />
          <PrimaryButton text="Find pet hosts" icon="search" onPress={() => search(true)} loading={loading} />
        </Appear>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 16 }}>
        <PetTile emoji="✨" label="Ask AI" bg={Brand.SunSoft} i={3} onPress={() => { AppState.set({ aiMode: 'pets' }); Nav.navigate('ai'); }} />
        <PetTile emoji="🐶" label="My pets" bg={Brand.Sky} i={4} onPress={() => Nav.navigate('mypets')} />
        <PetTile emoji="🏡" label="Pet host" bg={Brand.TealSoft} i={5} onPress={() => Nav.navigate('become-pet-host')} />
      </View>
    </View>
  ) });
  rows.push({ key: 'filters', el: (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <FChip label="⚡ Instant" on={instant} onPress={() => { setInstant(!instant); search(true, { instant: !instant }); }} />
        <FChip label="☀️ Daycare" on={daycare} onPress={() => { setDaycare(!daycare); search(true, { daycare: !daycare }); }} />
        {facilityChips.map(([k, l]) => <FChip key={k} label={l} on={facilities.includes(k)} onPress={() => toggle(k)} />)}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Choice label="Sort" value={sort} options={[['relevance', 'Best match'], ['price_asc', 'Lowest price'], ['rating', 'Top rated'], ['distance', 'Nearest']]} onChange={(v) => { setSort(v); search(true, { sort: v }); }} />
      </View>
      {info ? <Txt k="bodySmall" color={Brand.InkSoft} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{info}</Txt> : null}
      {locFix ? <LinkButton text={locFix === 'location' ? 'Turn on location' : 'Open app settings'} onPress={() => (locFix === 'location' ? Loc.openLocationSettings() : Loc.openAppSettings())} /> : null}
    </View>
  ) });
  if (!items && loading) rows.push({ key: 'sk', el: <SkeletonGrid /> });
  else if (error) rows.push({ key: 'err', el: <ErrorBox message={error} onRetry={() => search()} /> });
  else if (items && !items.length) rows.push({ key: 'empty', el: <EmptyBox title="No pet hosts found" text="Try another area, other dates or fewer filters." icon="pets" /> });
  else if (items) {
    rows.push({ key: 'count', el: <Txt k="titleMedium" style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>{items.length} verified pet {items.length === 1 ? 'host' : 'hosts'}</Txt> });
    chunk(items).forEach((row, i) => rows.push({ key: 'r' + row.map((c) => int(c, 'id')).join('|'), el: (
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
        {row.map((c, j) => <Appear key={j} index={i * 2 + j} style={{ flex: 1 }}><PetGridCard c={c} onPress={() => Nav.navigate(`petlisting/${int(c, 'id')}`)} /></Appear>)}
        {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    ) }));
  }
  return <FlatList ref={list} data={rows} keyExtractor={(r) => r.key} renderItem={({ item }) => item.el} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" onScrollToIndexFailed={() => {}} />;
}

function PetTile({ emoji, label, bg, i, onPress }: { emoji: string; label: string; bg: string; i: number; onPress: () => void }) {
  return (
    <Appear index={i} style={{ flex: 1 }}>
      <Press card onPress={onPress} style={{ borderRadius: 20, backgroundColor: '#fff', paddingVertical: 12, alignItems: 'center', elevation: 3, shadowColor: '#1A1410', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>
        <Txt k="labelMedium" numberOfLines={1} style={{ marginTop: 6 }}>{label}</Txt>
      </Press>
    </Appear>
  );
}
function FChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return <Press onPress={onPress} style={{ borderRadius: 50, backgroundColor: on ? Brand.Matte : '#fff', borderWidth: 1, borderColor: on ? Brand.Matte : Brand.Line, paddingHorizontal: 14, paddingVertical: 8 }}><Txt k="labelLarge" color={on ? '#fff' : Brand.InkSoft}>{label}</Txt></Press>;
}
