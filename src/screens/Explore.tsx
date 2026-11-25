// Explore: find homestays, villas and resorts (search, dates, guests), with favourites and places on the home view.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, errorText } from '../core/api';
import { useAppState, useLoader, useSession } from '../core/state';
import { J, int, obj, objs, str, text } from '../core/json';
import { Brand, Fonts } from '../theme';
import { Appear, EmptyBox, ErrorBox, Gap, HeadButton, Icon, Loading, OutlineButton, LivePhoto, Photo, Press, PrimaryButton, SectionTitle, Txt, st, TopBar, GlassSheen } from '../ui/kit';
import { GlassChip, GlassDates, GlassGuests, WaterGlass } from '../ui/glass';
import { GridRow, PlaceCard, SkeletonGrid, WalletChip, chunk } from '../ui/cards';
import { Nav } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

type Row = { key: string; render: () => React.ReactElement };

export default function ExploreScreen() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<J[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const home = useLoader(() => Api.get('home'));
  const sights = useLoader(() => Api.get('explore', { limit: 10 }));
  const list = useRef<FlatList<Row>>(null);
  const session = useSession();
  const unread = useAppState('unread');
  const first = session?.user?.name?.split(' ')[0];
  const hourlyOn = !!obj(session?.raw, 'features')?.hourly;   // hourly booking is on (Admin → Settings)
  // "Where to next?": suggestions while typing — places, and stays / resorts by name
  const [typing, setTyping] = useState(false);
  const [sugg, setSugg] = useState<{ places: J[]; listings: J[] }>({ places: [], listings: [] });
  useEffect(() => {
    if (!typing) return;
    const term = q.trim();
    let live = true;
    const t = setTimeout(async () => {
      try { const r = await Api.get('destinations', { q: term }); if (live) setSugg({ places: objs(r, 'items').slice(0, 6), listings: term.length >= 2 ? objs(r, 'listings').slice(0, 5) : [] }); } catch { /* suggestions are optional */ }
    }, term ? 220 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q, typing]);
  const pickPlace = (name: string) => { setQ(name); setTyping(false); search(1, kind, name); };

  const search = async (p = 1, k = kind, query = q) => {
    setSearched(true); setLoading(true); setError(null);
    try {
      const r = await Api.get('properties', { q: query.trim(), kind: k === 'hourly' ? 'stay' : k !== 'all' ? k : null, hourly: k === 'hourly' ? 1 : null, check_in: checkIn || null, check_out: checkOut || null, adults, page: p, per_page: 20 });
      setResults((old) => (p === 1 ? objs(r, 'items') : [...old, ...objs(r, 'items')]));
      setTotal(int(r, 'total')); setPage(int(r, 'page', p)); setPages(int(r, 'pages', 1));
      if (str(r, 'date_error')) setError(str(r, 'date_error'));
    } catch (e) { setError(errorText(e)); }
    setLoading(false);
    if (p === 1) setTimeout(() => { try { list.current?.scrollToIndex({ index: 1, animated: true }); } catch {} }, 100);
  };

  const rows: Row[] = [{ key: 'head', render: () => (
    <View>
      <TopBar style={[st.row, { paddingLeft: 16, paddingRight: 12, paddingTop: 8, paddingBottom: 8 }]}>
        <Image source={require('../../assets/logo_white.png')} style={{ height: 32, width: 120 }} contentFit="contain" contentPosition="left" accessibilityLabel="TripArro" />
        <View style={{ flex: 1 }} />
        <WalletChip />
        <View>
          <HeadButton icon="notifications-none" label="Notifications" onPress={() => Nav.navigate(session?.user ? 'notifications' : 'login')} />
          {unread > 0 ? <View pointerEvents="none" style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><Txt k="labelSmall" color={Brand.Ink} style={{ fontSize: 9 }}>{unread > 9 ? '9+' : unread}</Txt></View> : null}
        </View>
      </TopBar>
      <View>
        {/* the logo's arch, faint, behind the greeting */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: 8, width: 190, height: 150, borderTopLeftRadius: 95, borderTopRightRadius: 95, backgroundColor: '#FFE4E1' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 112, top: 96, width: 22, height: 22, borderRadius: 11, backgroundColor: Brand.Sun }} />
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Appear><Txt k="displaySmall" style={{ maxWidth: 280 }}>{first ? `Hi ${first}, where to next?` : 'Where to next?'}</Txt></Appear>
          <Txt color={Brand.Muted} style={{ marginTop: 6, maxWidth: 300 }}>Verified homestays, villas and resorts — the full price before you pay.</Txt>
          <Gap h={20} />
          <Appear index={1}><WaterGlass>
            <View style={[st.row, { marginBottom: 10, paddingHorizontal: 4 }]}>
              <Icon name="water-drop" size={16} color={Brand.Sun} />
              <Txt k="labelLarge" color="#fff" style={{ marginLeft: 6, flex: 1 }}>Find your stay</Txt>
              <Txt k="labelSmall" color="rgba(255,255,255,0.8)">Verified · full price</Txt>
            </View>
            <View style={[st.row, { borderRadius: 20, backgroundColor: '#fff', paddingHorizontal: 14, shadowColor: '#7A0A14', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }]}>
              <Icon name="search" color={Brand.Blue} />
              <TextInput value={q} onChangeText={(v) => { setQ(v); setTyping(true); }} onFocus={() => setTyping(true)} onBlur={() => setTimeout(() => setTyping(false), 200)}
                placeholder="Where to? Ooty, Munnar, Goa…" placeholderTextColor="#A59C97" returnKeyType="search" onSubmitEditing={() => { setTyping(false); search(); }}
                style={{ flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Brand.Ink, paddingVertical: 14, paddingLeft: 8 }} accessibilityLabel="Where to" />
              {q ? <Pressable onPress={() => { setQ(''); setTyping(true); }} hitSlop={8} accessibilityLabel="Clear"><Icon name="close" size={18} color={Brand.Muted} /></Pressable> : null}
            </View>
            {typing && (sugg.places.length || sugg.listings.length) ? (
              <View style={{ marginTop: 8, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1E6DF', paddingVertical: 4, elevation: 4, shadowColor: '#1A1410', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }}>
                {!q.trim() ? <Txt k="labelMedium" color={Brand.Muted} style={{ paddingHorizontal: 14, paddingTop: 6 }}>Popular places</Txt> : null}
                {sugg.places.map((d, i) => (
                  <Pressable key={'p' + i} onPress={() => pickPlace(text(d, 'name'))} style={({ pressed }) => [st.row, { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: pressed ? '#FFF3F1' : 'transparent' }]}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' }}><Icon name="place" size={18} color={Brand.Blue} /></View>
                    <View style={{ flex: 1, paddingLeft: 10 }}><Txt k="titleSmall">{text(d, 'name')}</Txt><Txt k="bodySmall" color={Brand.Muted}>{text(d, 'location')}</Txt></View>
                    <Txt k="labelSmall" color={Brand.Muted}>{int(d, 'count')} {int(d, 'count') === 1 ? 'stay' : 'stays'}</Txt>
                  </Pressable>
                ))}
                {sugg.listings.map((x, i) => (
                  <Pressable key={'l' + i} onPress={() => { setTyping(false); Nav.navigate(`property/${text(x, 'kind')}/${int(x, 'id')}`); }} style={({ pressed }) => [st.row, { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: pressed ? '#FFF3F1' : 'transparent' }]}>
                    <Photo url={str(x, 'image')} corner={10} style={{ width: 34, height: 34 }} />
                    <View style={{ flex: 1, paddingLeft: 10 }}><Txt k="titleSmall" numberOfLines={1}>{text(x, 'title')}</Txt><Txt k="bodySmall" color={Brand.Muted}>{text(x, 'kind') === 'resort' ? 'Resort' : 'Stay'} · {text(x, 'place')}</Txt></View>
                    <Icon name="chevron-right" size={18} color={Brand.Muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Gap h={10} />
            <GlassDates checkIn={checkIn} checkOut={checkOut} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
            <Gap h={10} />
            <GlassGuests value={adults} onChange={setAdults} min={1} max={30} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }}>
              {[['all', 'All', 'apps'], ['stay', 'Homestays', 'cottage'], ['resort', 'Resorts', 'pool'], ...(hourlyOn ? [['hourly', 'Hourly', 'schedule']] : [])].map(([k, l, ic]) => (
                <GlassChip key={k} label={l} icon={ic} on={kind === k} onPress={() => setKind(k)} />
              ))}
            </View>
            <Press onPress={() => search()} disabled={loading && page === 1} accessibilityRole="button" accessibilityLabel="Search stays"
              style={{ minHeight: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#7A0A14', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
              {loading && page === 1 ? <ActivityIndicator color={Brand.Blue} /> : <><View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}><Icon name="search" size={18} color={Brand.Ink} /></View><Txt k="titleMedium" color={Brand.Blue}>Search stays</Txt></>}
            </Press>
          </WaterGlass></Appear>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 18, gap: 2 }}>
        <Shortcut icon="cottage" label="Homestays" tint={Brand.Blue} bg={Brand.Sky} i={2} onPress={() => { setKind('stay'); search(1, 'stay'); }} />
        <Shortcut icon="pool" label="Resorts" tint={Brand.TealDark} bg={Brand.TealSoft} i={3} onPress={() => { setKind('resort'); search(1, 'resort'); }} />
        {hourlyOn ? <Shortcut icon="schedule" label="By the hour" tint={Brand.Blue} bg={Brand.SunSoft} i={4} onPress={() => { setKind('hourly'); search(1, 'hourly'); }} /> : null}
        <Shortcut icon="pets" label="Pet services" tint={Brand.CoralDark} bg={Brand.Sky} i={4} onPress={() => Nav.navigate('pets')} />
        <Shortcut icon="auto-awesome" label="Ask AI" tint={Brand.SunInk} bg={Brand.SunSoft} i={5} onPress={() => Nav.navigate('ai')} />
        <Shortcut icon="ev-station" label="EV chargers" tint="#00704A" bg={Brand.TealSoft} i={6} onPress={() => Nav.navigate('chargers')} />
      </ScrollView>
    </View>
  ) }];

  if (searched) {
    rows.push({ key: 'count', render: () => (
      <View>
        <View style={[st.row, { paddingHorizontal: 16, paddingVertical: 8 }]}>
          <Txt k="titleMedium" style={{ flex: 1 }}>{loading && !results.length ? 'Searching…' : `${total} ${total === 1 ? 'place' : 'places'}`}</Txt>
          <Pressable onPress={() => { setSearched(false); setResults([]); setQ(''); }} style={{ padding: 6 }}><Txt color={Brand.Blue}>Clear</Txt></Pressable>
        </View>
        {error ? <ErrorBox message={error} /> : null}
        {!loading && !results.length && !error ? <EmptyBox title="No places found" text="Try another place, other dates or fewer guests." icon="travel-explore" /> : null}
        {loading && !results.length ? <SkeletonGrid /> : null}
      </View>
    ) });
    chunk(results).forEach((row, i) => rows.push({ key: 'r' + i + row.map((p) => text(p, 'kind') + int(p, 'id')).join('|'), render: () => <GridRow row={row} index={i} /> }));
    if (page < pages) rows.push({ key: 'more', render: () => <View style={{ padding: 16 }}><OutlineButton text={loading ? 'Loading…' : 'Show more'} onPress={() => search(page + 1)} /></View> });
  } else {
    const h = home.data;
    if (home.loading && !h) rows.push({ key: 'load', render: () => <Loading /> });
    if (home.error) rows.push({ key: 'err', render: () => <ErrorBox message={home.error === 'Not found.' ? `We can't reach TripArro right now (${Api.base.replace('https://', '')}). Check your internet connection and try again.` : home.error!} onRetry={home.reload} /> });
    if (h) {
      const places = objs(h, 'destinations');
      if (places.length) rows.push({ key: 'dest', render: () => (
        <View>
          <SectionTitle text="Popular places" sub="Tap a place to see its stays" style={{ paddingHorizontal: 16 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {places.map((d, i) => (
              <Press card key={i} onPress={() => { setQ(text(d, 'name')); search(1, kind, text(d, 'name')); }} style={{ width: 160, height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: Brand.Field, shadowColor: '#1A1410', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }} accessibilityLabel={text(d, 'name')}>
                <LivePhoto url={str(d, 'image')} corner={0} style={{ width: '100%', height: '100%' }} />
                <LinearGradient colors={['transparent', '#000000D9']} locations={[0.4, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
                <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                  <Txt k="titleLarge" color="#fff" numberOfLines={1}>{text(d, 'name')}</Txt>
                  <Txt k="bodySmall" color="#ffffffcc">{int(d, 'count')} {int(d, 'count') === 1 ? 'stay' : 'stays'}</Txt>
                </View>
              </Press>
            ))}
          </ScrollView>
        </View>
      ) });
      const spots = objs(sights.data, 'places');
      if (spots.length) rows.push({ key: 'spots', render: () => (
        <View>
          <SectionTitle text="Places to visit" sub="With today's weather and the best time to go" style={{ paddingHorizontal: 16, paddingTop: 22 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
            {spots.map((pl, i) => <Appear key={i} index={i}><PlaceCard p={pl} style={{ width: 220 }} onPress={() => Nav.navigate(`place/${int(pl, 'id')}`)} /></Appear>)}
          </ScrollView>
        </View>
      ) });
      const fav = objs(h, 'favourites');
      if (fav.length) {
        rows.push({ key: 'favT', render: () => <SectionTitle text="Guest favourites" sub="Loved by guests, rated highly" style={{ paddingHorizontal: 16, paddingTop: 22 }} /> });
        chunk(fav).forEach((row, i) => rows.push({ key: 'f' + i, render: () => <GridRow row={row} index={i} /> }));
      }
      const sp = objs(h, 'sponsored');
      if (sp.length) {
        rows.push({ key: 'spT', render: () => <SectionTitle text="Sponsored" sub="Paid placements, labelled" style={{ paddingHorizontal: 16, paddingTop: 22 }} /> });
        chunk(sp).forEach((row, i) => rows.push({ key: 's' + i, render: () => <GridRow row={row} index={i} /> }));
      }
    }
  }

  return (
    <FlatList ref={list} data={rows} keyExtractor={(r) => r.key} renderItem={({ item }) => item.render()} contentContainerStyle={{ paddingBottom: DOCK_SPACE }}
      keyboardShouldPersistTaps="handled" onScrollToIndexFailed={() => {}} />
  );
}

function Shortcut({ icon, label, tint, bg, i, onPress }: { icon: string; label: string; tint: string; bg: string; i: number; onPress: () => void }) {
  return (
    <Appear index={i}>
      <Press onPress={onPress} style={{ width: 82, alignItems: 'center', paddingVertical: 4 }} accessibilityLabel={label}>
        <View style={{ width: 60, height: 56, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)', overflow: 'hidden', shadowColor: tint, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
          <GlassSheen radius={30} />
          <Icon name={icon} size={26} color={tint} />
        </View>
        <Txt k="labelMedium" numberOfLines={1} style={{ marginTop: 6 }}>{label}</Txt>
      </Press>
    </Appear>
  );
}
