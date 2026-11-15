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
  // only refundable listings carry a tag (the host or admin switches it on); non-refundable ones show nothing
  if (!refundable) return null;
  return <View style={{ alignSelf: 'flex-start', borderRadius: 50, backgroundColor: '#0B6B3AE6', paddingHorizontal: 9, paddingVertical: 4 }}><Txt k="labelSmall" bold color="#fff">Refundable</Txt></View>;
}
export function OverlayTag({ text: t }: { text: string }) {
  return <View style={{ alignSelf: 'flex-start', borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelMedium" semi>{t}</Txt></View>;
}
type Tag = { text: string; bg: string; fg: string; icon?: string };
const T_VERIFIED: Tag = { text: 'Verified', bg: '#FFFFFFF2', fg: '#0B6B3A', icon: 'verified' };
const T_REFUND: Tag = { text: 'Refundable', bg: '#0B6B3AE6', fg: '#fff' };
const T_PROPERTY: Tag = { text: 'Pay at property', bg: Brand.Sun, fg: Brand.Ink, icon: 'payments' };

function TagChip({ t }: { t: Tag }) {
  return (
    <View style={[st.row, { alignSelf: 'flex-start', borderRadius: 50, backgroundColor: t.bg, paddingHorizontal: 8, paddingVertical: 3.5 }]}>
      {t.icon ? <Icon name={t.icon} size={12} color={t.fg} style={{ marginRight: 3 }} /> : null}
      <Txt k="labelSmall" bold color={t.fg}>{t.text}</Txt>
    </View>
  );
}

/**
 * The listing card (stays, resorts, pet hosts): a tall photo with a frosted-glass label floating on it — name, place and
 * the price on a red pill; tags on the photo (verified, refundable, pay at property, offer) and the rating in a glass chip.
 */
export function GlassListingCard({ image, title, place, price, unit, was, tags, rating, offer, note, noteTone, onPress, wide }: {
  image?: string | null; title: string; place: string; price: string | null; unit: string; was?: string | null; tags: Tag[]; rating?: number | null;
  offer?: string | null; note?: string | null; noteTone?: 'ok' | 'warn'; onPress: () => void; wide?: boolean;
}) {
  return (
    <Press onPress={onPress} scaleTo={0.975} style={[st.glass, { borderRadius: 28, padding: 6 }]} accessibilityLabel={`${title}, ${place}${price ? ', ' + price + ' ' + unit : ''}`}>
      <View style={{ borderRadius: 23, overflow: 'hidden', aspectRatio: wide ? 1.35 : 0.78, backgroundColor: Brand.Field }}>
        <Photo url={image} corner={0} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} label={title} />
        <LinearGradient pointerEvents="none" colors={['#00000040', 'transparent', 'transparent']} locations={[0, 0.3, 1]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 8, left: 8, right: 52, gap: 4 }}>{tags.map((t, i) => <TagChip key={i} t={t} />)}</View>
        {rating && rating > 0 ? (
          <View style={[st.row, { position: 'absolute', top: 8, right: 8, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 7, paddingVertical: 3.5 }]}>
            <Icon name="star" size={13} color={Brand.SunDark} /><Txt k="labelSmall" bold> {rating.toFixed(1)}</Txt>
          </View>
        ) : null}
        {offer ? <View style={{ position: 'absolute', right: 8, top: rating && rating > 0 ? 36 : 8, borderRadius: 50, backgroundColor: Brand.Sun, paddingHorizontal: 8, paddingVertical: 3.5 }}><Txt k="labelSmall" bold color={Brand.Ink}>{offer}</Txt></View> : null}
        {/* the frosted label */}
        <View style={{ position: 'absolute', left: 6, right: 6, bottom: 6, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 8 }}>
          <Txt k={wide ? 'titleMedium' : 'titleSmall'} numberOfLines={1}>{title}</Txt>
          <View style={[st.row, { marginTop: 1 }]}><Icon name="place" size={12} color={Brand.Blue} /><Txt k="labelSmall" color={Brand.Muted} numberOfLines={1} style={{ flex: 1 }}> {place}</Txt></View>
          {price ? (
            <View style={[st.row, { marginTop: 6, flexWrap: 'wrap' }]}>
              <View style={{ borderRadius: 50, backgroundColor: Brand.Blue, paddingHorizontal: 9, paddingVertical: 3 }}><Txt k="labelMedium" bold color="#fff">{price}</Txt></View>
              <Txt k="labelSmall" color={Brand.Muted}> {unit}</Txt>
              {was ? <Txt k="labelSmall" color={Brand.Muted} style={{ textDecorationLine: 'line-through', marginLeft: 4 }}>{was}</Txt> : null}
            </View>
          ) : null}
          {note ? <Txt k="labelSmall" color={noteTone === 'warn' ? Brand.Warn : '#0B6B3A'} numberOfLines={1} style={{ marginTop: 3 }}>{note}</Txt> : null}
        </View>
      </View>
    </Press>
  );
}

/** The tags for a stay or resort card. */
export function listingTags(p: J): Tag[] {
  const badges = obj(p, 'badges') || {};
  const out: Tag[] = [];
  if (bool(badges, 'sponsored')) out.push({ text: 'Sponsored', bg: '#000000AA', fg: '#fff' });
  if (bool(badges, 'verified')) out.push(T_VERIFIED);
  if (p && p.refundable === true) out.push(T_REFUND);
  if (bool(p, 'pay_at_property')) out.push(T_PROPERTY);
  return out.slice(0, 3);
}
export { T_VERIFIED, T_REFUND, T_PROPERTY };

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

/** A stay or resort as a tall grid card (glass label on the photo). */
export function GridPropertyCard({ p, onPress }: { p: J; onPress: () => void }) {
  const price = obj(p, 'price') || {};
  const offer = num(price, 'offer_nightly'); const nightly = num(price, 'nightly'); const total = obj(price, 'total');
  const bookable = bool(p, 'bookable') || p.bookable === undefined;
  return (
    <GlassListingCard image={str(p, 'image')} title={text(p, 'title')} place={str(p, 'area') || str(p, 'location') || ''}
      price={!bookable ? null : total ? money(num(total, 'amount')) : money(offer ?? nightly)} unit={total ? `· ${int(total, 'nights')}n` : '/night'}
      was={!total && offer !== null && nightly !== null && offer < nightly ? money(nightly) : null}
      offer={offer !== null && nightly !== null && offer < nightly ? `${Math.round((1 - offer / nightly) * 100)}% OFF` : null}
      tags={listingTags(p)} rating={num(p, 'rating')} note={!bookable ? 'Not taking bookings' : null} noteTone="warn" onPress={onPress} />
  );
}

/** A stay or resort in a list (full width): the same glass card, wider. */
export function PropertyCard({ p, onPress }: { p: J; onPress: () => void }) {
  const price = obj(p, 'price') || {};
  const offer = num(price, 'offer_nightly'); const nightly = num(price, 'nightly'); const total = obj(price, 'total');
  const bookable = bool(p, 'bookable') || p.bookable === undefined;
  return (
    <Appear style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <GlassListingCard wide image={str(p, 'image')} title={text(p, 'title')} place={[str(p, 'area'), str(p, 'location')].filter(Boolean).join(', ')}
        price={!bookable ? null : total ? money(num(total, 'amount')) : (bool(price, 'from') ? 'from ' : '') + money(offer ?? nightly)}
        unit={total ? `for ${int(total, 'nights')} nights` : '/ night'} was={!total && offer !== null && nightly !== null && offer < nightly ? money(nightly) : null}
        offer={offer !== null && nightly !== null && offer < nightly ? `${Math.round((1 - offer / nightly) * 100)}% OFF` : null}
        tags={listingTags(p)} rating={num(p, 'rating')} note={!bookable ? 'Not taking bookings right now' : str(p, 'cancellation')} noteTone={!bookable ? 'warn' : 'ok'} onPress={onPress} />
    </Appear>
  );
}

export const catEmoji: Record<string, string> = { temple: '🛕', waterfall: '💧', hills: '⛰️', lake: '🏞️', park: '🎡', beach: '🏖️', wildlife: '🐘',
  heritage: '🏛️', museum: '🏛️', garden: '🌿', dam: '🌊', trek: '🥾', church: '⛪', mosque: '🕌', food: '🍛', shopping: '🛍️' };
export const weatherEmoji = (icon?: string | null) => ({ sun: '☀️', cloud_sun: '⛅', cloud: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', heavy_rain: '🌧️', storm: '⛈️', snow: '❄️' } as Record<string, string>)[icon || ''] || '🌤️';

/** A tourist place in a row: photo (or a coloured tile), name, category and how far / when to go. */
export function PlaceCard({ p, onPress, style }: { p: J; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Press onPress={onPress} style={[st.glass, { borderRadius: 26, padding: 6 }, style]}>
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
    <Pressable onPress={() => Nav.navigate(u ? 'wallet' : 'signup')} style={[st.row, { marginRight: 6, borderRadius: 50, backgroundColor: Brand.Blue, paddingHorizontal: 12, height: 44 }]} accessibilityLabel="Rewards wallet">
      <Icon name="account-balance-wallet" size={18} color={Brand.Sun} />
      <Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: '#fff' }}> {label}</Text>
    </Pressable>
  );
}
