// A tourist place (photos, today's weather and whether to go now, tips, nearest stays) and the weather card.
import React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LiquidLayer } from '../ui/liquid';
import { Api } from '../core/api';
import { useLoader } from '../core/state';
import { J, arr, int, num, obj, objs, str, text } from '../core/json';
import { Brand } from '../theme';
import { Appear, ErrorBox, Gap, Icon, Loading, Notice, PrimaryButton, RoundAction, SectionTitle, Txt, st } from '../ui/kit';
import { Floaty, GridRow, PlaceCard, Pulse, RED_GRAD, catEmoji, chunk, weatherEmoji } from '../ui/cards';
import { HeroGallery } from '../ui/detail';
import { openMaps } from '../ui/sheets';
import { Nav, intParam, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

export default function PlaceScreen() {
  const id = intParam(useParams().id);
  const l = useLoader(() => Api.get(`places/${id}`), [id]);
  const p = l.data;
  if (!p) return <View style={{ flex: 1, paddingTop: 60 }}>{l.loading ? <Loading /> : <ErrorBox message={l.error || 'Could not load this place.'} onRetry={l.reload} />}</View>;
  const photos = objs(p, 'photos').map((x) => str(x, 'url')).filter(Boolean) as string[];
  if (!photos.length && str(p, 'image')) photos.push(str(p, 'image')!);
  const c = arr<number>(p, 'coords');
  const stays = objs(p, 'stays');
  const near = objs(p, 'nearby').filter((x) => int(x, 'id') !== id);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: DOCK_SPACE }}>
      {photos.length ? <HeroGallery urls={photos} actions={<RoundAction icon="arrow-back" label="Back" onPress={Nav.back} />} /> : (
        <LinearGradient colors={RED_GRAD as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={{ height: 220 , overflow: 'hidden' }}>
          <LiquidLayer waves={[{ color: 'rgba(255,255,255,0.11)', h: 0.45, amp: 8, ms: 10000, reverse: true, bob: 3 }, { color: 'rgba(255,199,44,0.12)', h: 0.3, amp: 8, ms: 7000 }, { color: 'rgba(255,255,255,0.08)', h: 0.18, amp: 5, ms: 5000, reverse: true }]} bubbles={4} />
          <View style={{ padding: 12 }}><RoundAction icon="arrow-back" label="Back" onPress={Nav.back} /></View>
          <Floaty distance={10} style={{ position: 'absolute', alignSelf: 'center', top: 70 }}><Text style={{ fontSize: 72 }}>{catEmoji[text(p, 'cat')] || '📍'}</Text></Floaty>
        </LinearGradient>
      )}
      <View style={{ padding: 16 }}>
        <Appear><Txt k="labelMedium" color={Brand.Blue}>{text(p, 'category')}</Txt></Appear>
        <Appear index={1}><Txt k="headlineSmall">{text(p, 'title')}</Txt></Appear>
        <Appear index={2} style={[st.row, { marginTop: 4 }]}><Icon name="place" size={16} color={Brand.Blue} /><Txt k="bodySmall" color={Brand.InkSoft}> {[str(p, 'location'), str(p, 'distance_note')].filter(Boolean).join(' · ')}</Txt></Appear>
        <Gap h={16} />
        {obj(p, 'weather') ? <Appear index={3}><WeatherCard w={obj(p, 'weather')!} /></Appear> : <Notice text="Weather for this place isn't available right now." />}
        <Gap h={16} />
        <Txt color={Brand.InkSoft}>{str(p, 'description') || text(p, 'summary')}</Txt>
        <Gap h={14} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {str(p, 'best_time') ? <InfoTile icon="schedule" label="Best time" text={str(p, 'best_time')!} /> : null}
          {str(p, 'visit_tips') ? <InfoTile icon="tips-and-updates" label="Tips" text={str(p, 'visit_tips')!} /> : null}
        </View>
        <Gap h={14} />
        <PrimaryButton text="Directions" icon="directions" onPress={() => { if (c.length === 2) openMaps(c[0], c[1], text(p, 'title')); else if (str(p, 'map_url')) Linking.openURL(str(p, 'map_url')!).catch(() => {}); }} />
      </View>
      {stays.length ? <><SectionTitle text={`Stays around ${text(p, 'title')}`} sub="Nearest first — homestays and resorts" style={{ paddingHorizontal: 16 }} />{chunk(stays).map((row, i) => <GridRow key={i} row={row} index={i} />)}</> : null}
      {near.length ? (
        <>
          <SectionTitle text="Also nearby" style={{ paddingHorizontal: 16, paddingTop: 18 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
            {near.slice(0, 8).map((n, i) => <PlaceCard key={i} p={n} style={{ width: 200 }} onPress={() => Nav.navigate(`place/${int(n, 'id')}`)} />)}
          </ScrollView>
        </>
      ) : null}
    </ScrollView>
  );
}

function InfoTile({ icon, label, text: t }: { icon: string; label: string; text: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, backgroundColor: '#fff', padding: 12 }}>
      <View style={st.row}><Icon name={icon} size={17} color={Brand.Blue} /><Txt k="titleSmall">  {label}</Txt></View>
      <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginTop: 4 }}>{t}</Txt>
    </View>
  );
}

/** Today's weather at the place, the next days, and plain advice: go now, or when to go. */
export function WeatherCard({ w }: { w: J }) {
  const verdict = text(w, 'verdict');
  const [top, accent] = verdict === 'bad' ? [['#3A3F55', '#5B6178'], '#FFB4A8'] : verdict === 'caution' ? [['#4F6D8F', '#7FA0C2'], Brand.Sun] : [['#FF9A3D', '#FFC42E'], '#fff'];
  const now = obj(w, 'now') || {};
  return (
    <View style={[{ borderRadius: 24, backgroundColor: '#fff', overflow: 'hidden' }, st.shadow]}>
      <LinearGradient colors={top as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 , overflow: 'hidden' }}>
        <LiquidLayer waves={[{ color: 'rgba(255,255,255,0.11)', h: 0.45, amp: 8, ms: 10000, reverse: true, bob: 3 }, { color: 'rgba(255,199,44,0.12)', h: 0.3, amp: 8, ms: 7000 }, { color: 'rgba(255,255,255,0.08)', h: 0.18, amp: 5, ms: 5000, reverse: true }]} bubbles={4} />
        <View style={st.row}>
          <Floaty distance={4}><Text style={{ fontSize: 46 }}>{weatherEmoji(str(now, 'icon'))}</Text></Floaty>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Txt k="titleLarge" color="#fff">{(num(now, 'temp') !== null ? `${Math.round(num(now, 'temp')!)}°C` : '—') + '  ' + text(now, 'label')}</Txt>
            <Txt k="labelMedium" color="#FFFFFFE6">{[num(now, 'feels') !== null ? `Feels ${Math.round(num(now, 'feels')!)}°` : null, num(now, 'humidity') !== null ? `Humidity ${Math.round(num(now, 'humidity')!)}%` : null, num(now, 'wind') !== null ? `Wind ${Math.round(num(now, 'wind')!)} km/h` : null].filter(Boolean).join(' · ')}</Txt>
          </View>
        </View>
        <Gap />
        <View style={st.row}><Pulse><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent as string }} /></Pulse><Txt k="titleMedium" bold color="#fff">  {text(w, 'headline')}</Txt></View>
        <Txt color="#FFFFFFF2" style={{ marginTop: 4 }}>{text(w, 'advice')}</Txt>
      </LinearGradient>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 8 }}>
        {objs(w, 'days').map((d, i) => (
          <View key={i} style={{ width: 62, borderRadius: 16, backgroundColor: text(d, 'rating') === 'bad' ? Brand.DangerSoft : text(d, 'rating') === 'caution' ? Brand.WarnSoft : Brand.TealSoft, paddingVertical: 8, alignItems: 'center' }}>
            <Txt k="labelSmall" color={Brand.InkSoft}>{i === 0 ? 'Today' : text(d, 'day')}</Txt>
            <Text style={{ fontSize: 22, marginVertical: 2 }}>{weatherEmoji(str(d, 'icon'))}</Text>
            <Txt k="labelLarge">{int(d, 'max')}°</Txt>
            <Txt k="labelSmall" color={Brand.Muted}>{int(d, 'min')}°</Txt>
            {int(d, 'rain_chance') >= 30 ? <Txt k="labelSmall" color="#2B6CB0">💧{int(d, 'rain_chance')}%</Txt> : null}
          </View>
        ))}
      </ScrollView>
      {str(w, 'season') ? <Txt k="bodySmall" color={Brand.TealDark} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>🗓 {str(w, 'season')}</Txt> : null}
      <Txt k="labelSmall" color={Brand.Muted} style={{ paddingLeft: 16, paddingBottom: 12 }}>Forecast: {text(w, 'source', 'Open-Meteo')}</Txt>
    </View>
  );
}
