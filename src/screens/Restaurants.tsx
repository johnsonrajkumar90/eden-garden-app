/*
 * Restaurants and cafés near a place, from Google: photo cards with rating, reviews, price, open now and distance.
 * Tap a card for Google Maps; [onSave] (group trips) adds it to the trip's favourites.
 */
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Api } from '../core/api';
import { useLoader } from '../core/state';
import { J, bool, int, num, objs, str, text } from '../core/json';
import { Brand } from '../theme';
import { Appear, Icon, Press, Txt, st } from '../ui/kit';
import { Shimmer } from '../ui/cards';

const compact = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n));

export function RestaurantsRow({ lat, lng, title = 'Restaurants nearby', onSave }: { lat: number; lng: number; title?: string; onSave?: (r: J) => void }) {
  const [kind, setKind] = useState('restaurant');
  const l = useLoader(() => Api.get('places/restaurants', { lat, lng, kind, radius: 4000 }), [lat, lng, kind]);
  const d = l.data;
  if (d && !bool(d, 'google') && !l.loading) return null;   // Google isn't set up on this website: nothing to show
  if (!d && !l.loading) return null;                          // signed out, or the website could not answer
  const items = objs(d, 'items');
  return (
    <View>
      <View style={st.row}><Icon name="restaurant" size={20} color={Brand.Blue} /><Txt k="titleMedium" style={{ flex: 1 }}>  {title}</Txt></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
        {[['restaurant', 'Restaurants'], ['veg', 'Pure veg'], ['cafe', 'Cafés & bakeries']].map(([v, t]) => (
          <Pressable key={v} onPress={() => setKind(v)} style={{ borderRadius: 50, backgroundColor: kind === v ? Brand.Blue : Brand.Sky, paddingHorizontal: 14, paddingVertical: 7 }}><Txt k="labelLarge" color={kind === v ? '#fff' : Brand.InkSoft}>{t}</Txt></Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 10, paddingBottom: 6 }}>
        {!d || l.loading ? [0, 1, 2].map((i) => <Shimmer key={i} style={{ width: 220, height: 250, borderRadius: 22 }} />)
          : !items.length ? <Txt k="bodySmall" color={Brand.Muted}>{str(d, 'error') || 'Nothing found close by.'}</Txt>
          : items.slice(0, 12).map((r, i) => <RestaurantCard key={i} r={r} index={i} onSave={onSave} />)}
      </ScrollView>
      {items.length ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Results, ratings and photos from Google</Txt> : null}
    </View>
  );
}

function RestaurantCard({ r, index, onSave }: { r: J; index: number; onSave?: (r: J) => void }) {
  const [saved, setSaved] = useState(false);
  const open = r.open_now === undefined || r.open_now === null ? null : bool(r, 'open_now');
  return (
    <Appear index={index}>
      <Press onPress={() => { const u = str(r, 'maps_url'); if (u) Linking.openURL(u).catch(() => {}); }} style={{ width: 220, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, overflow: 'hidden' }}>
        <View style={{ height: 140, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}>
          {str(r, 'photo_url') ? <Image source={{ uri: str(r, 'photo_url')! }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} contentFit="cover" accessibilityLabel={text(r, 'name')} /> : <Icon name="restaurant" size={40} color={Brand.Coral} />}
          <LinearGradient colors={['transparent', 'transparent', '#00000088']} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          {open !== null ? <View style={{ position: 'absolute', top: 8, left: 8, borderRadius: 50, backgroundColor: open ? '#008A5AE6' : '#5B5B5BCC', paddingHorizontal: 8, paddingVertical: 3 }}><Txt k="labelSmall" bold color="#fff">{open ? 'Open now' : 'Closed now'}</Txt></View> : null}
          {onSave ? (
            <Pressable onPress={() => { if (!saved) { setSaved(true); onSave(r); } }} style={{ position: 'absolute', top: 6, right: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: saved ? Brand.Coral : '#FFFFFFE6', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={saved ? 'Saved' : 'Save to favourites'}>
              <Icon name="favorite" size={18} color={saved ? '#fff' : Brand.Coral} />
            </Pressable>
          ) : null}
          {str(r, 'km') ? <Txt k="labelSmall" color="#fff" style={{ position: 'absolute', right: 8, bottom: 8 }}>{str(r, 'km')} km</Txt> : null}
          {text(r, 'photo_credit') ? <Text numberOfLines={1} style={{ position: 'absolute', left: 8, bottom: 8, width: 130, color: '#FFFFFFCC', fontSize: 9 }}>{text(r, 'photo_credit')}</Text> : null}
        </View>
        <View style={{ padding: 12 }}>
          <Txt k="titleSmall" numberOfLines={1}>{text(r, 'name')}</Txt>
          <View style={[st.row, { marginTop: 2 }]}>
            {num(r, 'rating') !== null ? <><Icon name="star" size={15} color="#F2B01E" /><Txt k="labelMedium" semi> {num(r, 'rating')}{int(r, 'reviews') > 0 ? ` (${compact(int(r, 'reviews'))})` : ''}</Txt></> : null}
            {int(r, 'price') > 0 ? <Txt k="labelMedium" color={Brand.InkSoft}>  ·  {'₹'.repeat(int(r, 'price'))}</Txt> : null}
          </View>
          <Txt k="labelSmall" color={Brand.Blue} numberOfLines={1}>{text(r, 'type')}</Txt>
          <Txt k="labelSmall" color={Brand.Muted} numberOfLines={2}>{text(r, 'address')}</Txt>
        </View>
      </Press>
    </Appear>
  );
}
