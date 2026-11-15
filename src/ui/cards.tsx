// Listing cards shared by several screens: stays and resorts, tourist places, tags on photos, the wallet chip, loading placeholders.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Api } from '../core/api';
import { J, bool, int, num, obj, str, text } from '../core/json';
import { useAppState, useSession } from '../core/state';
import { Brand, Fonts } from '../theme';
import { Appear, Icon, Photo, Press, Txt, money, st } from './kit';
import { Nav } from '../nav';

/** The logo's coral arch as a gradient (brand moments only). */
export const RED_GRAD = ['#D93338', '#E8474B', '#FF5757'] as const;
export const SUN_GRAD = ['#FFD54A', '#FFC22E', '#FFA81F'] as const;

/** True unless the listing says it is non-refundable (older servers don't say: refundable). */
export const isRefundable = (p: J) => !(p && p.refundable !== undefined && p.refundable !== null && p.refundable === false);

export function RefundTag({ refundable }: { refundable: boolean }) {
  return <View style={{ alignSelf: 'flex-start', borderRadius: 50, backgroundColor: refundable ? '#0B6B3AE6' : '#1E2A44E6', paddingHorizontal: 9, paddingVertical: 4 }}><Txt k="labelSmall" bold color="#fff">{refundable ? 'Refundable' : 'Non-refundable'}</Txt></View>;
}
export function OverlayTag({ text: t }: { text: string }) {
  return <View style={{ alignSelf: 'flex-start', borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelMedium" semi>{t}</Txt></View>;
}

/** A gentle, endless float (icons and badges that should catch the eye). */
export function Floaty({ children, distance = 6, ms = 1800, style }: { children: ReactNode; distance?: number; ms?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-distance, distance] }) }] }]}>{children}</Animated.View>;
}

/** A soft pulse (unread dots, "new" badges). */
export function Pulse({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 700, useNativeDriver: true })])); l.start(); return () => l.stop(); }, []);
  return <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>{children}</Animated.View>;
}

/** Moving light over a placeholder while content loads. */
export function Shimmer({ style }: { style: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, []);
  return (
    <View style={[{ backgroundColor: '#EFEEEB', overflow: 'hidden' }, style]}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 160, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-200, 500] }) }] }}>
        <LinearGradient colors={['#EFEEEB', '#F9F8F6', '#EFEEEB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

/** Placeholder cards while a list loads (two columns). */
export function SkeletonGrid({ rows = 2 }: { rows?: number }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 12, paddingVertical: 6 }}>
          {[0, 1].map((c) => (
            <View key={c} style={{ flex: 1 }}>
              <Shimmer style={{ height: 150, borderRadius: 20 }} />
              <Shimmer style={{ marginTop: 10, width: '80%', height: 14, borderRadius: 7 }} />
              <Shimmer style={{ marginTop: 6, width: '50%', height: 12, borderRadius: 6 }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export const openProperty = (p: J) => Nav.navigate(`property/${text(p, 'kind', 'stay')}/${int(p, 'id')}`);

/** Two listings side by side (left and right); a single last one keeps half the width. */
export function GridRow({ row, index, open = openProperty }: { row: J[]; index: number; open?: (p: J) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
      {row.map((p, j) => <Appear key={j} index={index * 2 + j} style={{ flex: 1 }}><GridPropertyCard p={p} onPress={() => open(p)} /></Appear>)}
      {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
    </View>
  );
}
export const chunk = <T,>(a: T[], n = 2) => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };

/** A stay or resort as a tall grid card: photo with rating and tags, place, name and the honest price. */
export function GridPropertyCard({ p, onPress }: { p: J; onPress: () => void }) {
  const price = obj(p, 'price') || {}; const badges = obj(p, 'badges') || {};
  const offer = num(price, 'offer_nightly'); const nightly = num(price, 'nightly'); const total = obj(price, 'total');
  const rating = num(p, 'rating');
  const bookable = bool(p, 'bookable') || p.bookable === undefined;
  return (
    <Press onPress={onPress} style={[st.card, { borderRadius: 26, padding: 6 }]} accessibilityLabel={text(p, 'title')}>
      <View style={{ borderTopLeftRadius: 72, borderTopRightRadius: 72, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' }}>
        <Photo url={str(p, 'image')} corner={0} style={{ width: '100%', aspectRatio: 0.92 }} label={text(p, 'title')} />
        <LinearGradient colors={['transparent', '#00000080']} locations={[0.6, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 30, left: 8, gap: 4 }}>
          {bool(badges, 'sponsored') ? <OverlayTag text="Sponsored" /> : null}
          {bool(badges, 'favourite') ? <OverlayTag text="★ Favourite" /> : null}
          <RefundTag refundable={isRefundable(p)} />
        </View>
        {offer !== null && nightly !== null && offer < nightly ? (
          <LinearGradient colors={SUN_GRAD as any} style={{ position: 'absolute', bottom: 10, right: 8, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Txt k="labelSmall" bold color={Brand.SunInk}>{Math.round((1 - offer / nightly) * 100)}% OFF</Txt>
          </LinearGradient>
        ) : null}
        <View style={[st.row, { position: 'absolute', left: 10, bottom: 10 }]}>
          {rating && rating > 0 ? <><Icon name="star" size={15} color={Brand.Sun} /><Txt k="labelMedium" bold color="#fff"> {rating.toFixed(1)}</Txt></> : null}
          {bool(badges, 'verified') ? <Icon name="verified" size={15} color="#fff" style={{ marginLeft: 6 }} /> : null}
        </View>
      </View>
      <View style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 }}>
        <Txt k="titleSmall" numberOfLines={1}>{text(p, 'title')}</Txt>
        <View style={[st.row, { marginTop: 2 }]}>
          <Icon name="place" size={13} color={Brand.Muted} />
          <Txt k="labelMedium" color={Brand.Muted} numberOfLines={1} style={{ flex: 1 }}> {str(p, 'area') || str(p, 'location') || ''}</Txt>
        </View>
        {bookable ? (
          <>
            <View style={[st.row, { alignItems: 'flex-end', marginTop: 6 }]}>
              {total ? <><Txt k="titleSmall" bold color={Brand.Ink}>{money(num(total, 'amount'))}</Txt><Txt k="labelMedium" color={Brand.Muted}> · {int(total, 'nights')}n</Txt></>
                : <><Txt k="titleSmall" bold color={Brand.Ink}>{money(offer ?? nightly)}</Txt><Txt k="labelMedium" color={Brand.Muted}> /night</Txt></>}
            </View>
            {!total && offer !== null && nightly !== null && offer < nightly ? <Txt k="labelMedium" color={Brand.Muted} style={{ textDecorationLine: 'line-through' }}>{money(nightly)}</Txt> : null}
          </>
        ) : <Txt k="labelMedium" color={Brand.Warn} style={{ marginTop: 6 }}>Not taking bookings</Txt>}
      </View>
    </Press>
  );
}

/** A stay or resort in a list (full width): photo, badges, place, rating and the honest price. */
export function PropertyCard({ p, onPress }: { p: J; onPress: () => void }) {
  const price = obj(p, 'price') || {}; const badges = obj(p, 'badges') || {};
  const offer = num(price, 'offer_nightly'); const nightly = num(price, 'nightly'); const total = obj(price, 'total');
  const rating = num(p, 'rating');
  const bookable = bool(p, 'bookable') || p.bookable === undefined;
  return (
    <Appear style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Press onPress={onPress} style={[st.card, { borderRadius: 28, padding: 6 }]}>
        <View>
          <Photo url={str(p, 'image')} corner={22} style={{ width: '100%', aspectRatio: 1.55 }} label={text(p, 'title')} />
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
            {bool(badges, 'sponsored') ? <OverlayTag text="Sponsored" /> : null}
            {bool(badges, 'favourite') ? <OverlayTag text="★ Guest favourite" /> : null}
            <RefundTag refundable={isRefundable(p)} />
          </View>
          {rating && rating > 0 ? (
            <View style={[st.row, { position: 'absolute', right: 12, bottom: 12, borderRadius: 50, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5 }]}>
              <Icon name="star" size={15} color={Brand.Star} /><Txt k="labelMedium" bold> {rating.toFixed(1)}</Txt>
              {int(p, 'reviews') > 0 ? <Txt k="labelMedium" color={Brand.Muted}> ({int(p, 'reviews')})</Txt> : null}
            </View>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 12 }}>
          <View style={st.row}><Icon name="place" size={15} color={Brand.Muted} /><Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={1} style={{ flex: 1, marginLeft: 4 }}>{[str(p, 'area'), str(p, 'location')].filter(Boolean).join(', ')}</Txt></View>
          <Txt k="titleLarge" numberOfLines={2} style={{ marginTop: 4 }}>{text(p, 'title')}</Txt>
          <View style={[st.row, { marginTop: 2 }]}>
            <Txt k="bodySmall" color={Brand.Muted}>{[str(p, 'type'), p.max_guests ? `up to ${p.max_guests} guests` : null].filter(Boolean).join(' · ')}</Txt>
            {bool(badges, 'verified') ? <><Icon name="verified" size={14} color={Brand.Teal} style={{ marginLeft: 8 }} /><Txt k="bodySmall" color={Brand.Teal}> Verified</Txt></> : null}
          </View>
          {bookable ? (
            <>
              <View style={[st.row, { alignItems: 'flex-end', marginTop: 8 }]}>
                {total ? <><Txt k="titleMedium" bold color={Brand.Ink}>{money(num(total, 'amount'))}</Txt><Txt k="bodySmall" color={Brand.Muted}>  for {int(total, 'nights')} nights</Txt></> : <>
                  {offer !== null && nightly !== null && offer < nightly ? <Txt k="bodySmall" color={Brand.Muted} style={{ textDecorationLine: 'line-through', marginRight: 6 }}>{money(nightly)}</Txt> : null}
                  <Txt k="titleMedium" bold color={Brand.Ink}>{(bool(price, 'from') ? 'from ' : '') + money(offer ?? nightly)}</Txt><Txt k="bodySmall" color={Brand.Muted}> / night</Txt></>}
              </View>
              {str(p, 'cancellation') ? <Txt k="bodySmall" color={isRefundable(p) ? Brand.TealDark : '#0B3D91'} style={{ marginTop: 2 }}>{str(p, 'cancellation')}</Txt> : null}
            </>
          ) : <Txt k="bodySmall" color={Brand.Warn} style={{ marginTop: 6 }}>Not taking bookings right now</Txt>}
        </View>
      </Press>
    </Appear>
  );
}

export const catEmoji: Record<string, string> = { temple: '🛕', waterfall: '💧', hills: '⛰️', lake: '🏞️', park: '🎡', beach: '🏖️', wildlife: '🐘',
  heritage: '🏛️', museum: '🏛️', garden: '🌿', dam: '🌊', trek: '🥾', church: '⛪', mosque: '🕌', food: '🍛', shopping: '🛍️' };
export const weatherEmoji = (icon?: string | null) => ({ sun: '☀️', cloud_sun: '⛅', cloud: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', heavy_rain: '🌧️', storm: '⛈️', snow: '❄️' } as Record<string, string>)[icon || ''] || '🌤️';

/** A tourist place in a row: photo (or a coloured tile), name, category and how far / when to go. */
export function PlaceCard({ p, onPress, style }: { p: J; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Press onPress={onPress} style={[st.card, { borderRadius: 26, padding: 6 }, style]}>
      <View style={{ height: 124, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' }}>
        {str(p, 'image') ? <Photo url={str(p, 'image')} corner={0} style={{ width: '100%', height: '100%' }} />
          : <LinearGradient colors={RED_GRAD as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Floaty><Text style={{ fontSize: 44 }}>{catEmoji[text(p, 'cat')] || '📍'}</Text></Floaty></LinearGradient>}
        <View style={{ position: 'absolute', bottom: 8, left: 8, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 9, paddingVertical: 4 }}><Txt k="labelSmall">{text(p, 'category')}</Txt></View>
      </View>
      <View style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 }}>
        <Txt k="titleSmall" numberOfLines={1}>{text(p, 'title')}</Txt>
        <Txt k="labelMedium" color={Brand.Muted} numberOfLines={1}>{str(p, 'distance_note') || text(p, 'location')}</Txt>
        {str(p, 'best_time') ? <Txt k="labelMedium" color={Brand.TealDark} numberOfLines={1} style={{ marginTop: 4 }}>🗓 {str(p, 'best_time')}</Txt> : null}
      </View>
    </Press>
  );
}

/** Rewards wallet balance (Explore, top right); "Rewards" for people not signed in. */
export function WalletChip() {
  const session = useSession();
  const tick = useAppState('refreshTick');
  const u = session?.user;
  const [bal, setBal] = useState<number | null>(u?.wallet ?? null);
  useEffect(() => {
    let alive = true;
    Api.get('wallet').then((w) => { if (!alive) return; setBal(!bool(w, 'on') && (num(w, 'balance') || 0) <= 0 ? null : num(w, 'balance')); }).catch(() => {});
    return () => { alive = false; };
  }, [u?.id, tick]);
  if (u && u.role !== 'guest') return null;
  const label = u && bal !== null ? money(bal) : !u ? 'Rewards' : null;
  if (!label) return null;
  return (
    <Pressable onPress={() => Nav.navigate(u ? 'wallet' : 'signup')} style={[st.row, { marginRight: 6, borderRadius: 50, backgroundColor: Brand.Ink, paddingHorizontal: 12, height: 44 }]} accessibilityLabel="Rewards wallet">
      <Icon name="account-balance-wallet" size={18} color={Brand.Sun} />
      <Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: '#fff' }}> {label}</Text>
    </Pressable>
  );
}
