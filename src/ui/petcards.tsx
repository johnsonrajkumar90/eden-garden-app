// Pet services pieces shared by several screens: pet emoji, types and sizes, and the pet host card.
import React from 'react';
import { View } from 'react-native';
import { J, bool, int, num, str, strings, text } from '../core/json';
import { Brand } from '../theme';
import { Photo, Pill, Press, Stars, Txt, money, plural, st } from './kit';

export const petEmoji: Record<string, string> = { dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', small: '🐹', other: '🐾' };
export const petTypes: [string, string][] = [['', 'Any pet'], ['dog', 'Dog'], ['cat', 'Cat'], ['bird', 'Bird'], ['rabbit', 'Rabbit'], ['small', 'Small pet'], ['other', 'Other']];
export const petSizes: [string, string][] = [['small', 'Small (up to 10 kg)'], ['medium', 'Medium (10–25 kg)'], ['large', 'Large (25–40 kg)'], ['giant', 'Giant (40 kg +)']];

/** A verified pet host in a list: photo, area, rating, facilities and the real price per night. */
export function PetHostCard({ c, compact, onPress }: { c: J; compact?: boolean; onPress: () => void }) {
  const free = c.free === undefined || c.free === null ? null : int(c, 'free');
  return (
    <Press onPress={onPress} style={{ borderRadius: 18, backgroundColor: '#fff', overflow: 'hidden' }} scaleTo={0.98}>
      {!compact ? <Photo url={str(c, 'image')} corner={0} style={{ width: '100%', aspectRatio: 1.7 }} label={text(c, 'title')} /> : null}
      <View style={{ flexDirection: 'row', padding: 14 }}>
        {compact ? <Photo url={str(c, 'image')} style={{ width: 72, aspectRatio: 1 }} /> : null}
        <View style={{ flex: 1, paddingLeft: compact ? 12 : 0 }}>
          <View style={st.row}>
            <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={1} style={{ flex: 1 }}>{text(c, 'location')}</Txt>
            <Stars rating={num(c, 'rating')} count={int(c, 'reviews')} />
          </View>
          <Txt k="titleMedium" numberOfLines={2}>{text(c, 'title')}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{strings(c, 'pet_types').map((t) => petEmoji[t] || '🐾').join(' ')}  · up to {plural(int(c, 'capacity'), 'pet')}</Txt>
          {!compact && strings(c, 'facilities').length ? <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginTop: 2 }}>{strings(c, 'facilities').slice(0, 4).join(' · ')}</Txt> : null}
          <View style={[st.row, { marginTop: 6, gap: 6, flexWrap: 'wrap' }]}>
            <Txt k="titleMedium" bold color={Brand.BlueDark}>{money(num(c, 'price'))}</Txt>
            <Txt k="bodySmall" color={Brand.Muted}>/ night</Txt>
            {bool(c, 'verified') ? <Pill text="Verified" tone="ok" /> : null}
            {bool(c, 'featured') ? <Pill text="Featured" tone="info" /> : null}
            {bool(c, 'instant') ? <Pill text="Instant" tone="info" /> : null}
          </View>
          {free !== null ? <Txt k="bodySmall" color={free > 0 ? Brand.TealDark : Brand.Warn}>{free > 0 ? `${plural(free, 'place')} free for your dates` : 'Full for your dates'}</Txt> : null}
        </View>
      </View>
    </Press>
  );
}

import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RefundTag, isRefundable } from './cards';

/** A pet host as a grid card: photo, rating, pets they take and the price. */
export function PetGridCard({ c, onPress }: { c: J; onPress: () => void }) {
  const r = num(c, 'rating');
  const free = c.free === undefined || c.free === null ? null : int(c, 'free');
  return (
    <Press onPress={onPress} style={{ borderRadius: 22, backgroundColor: '#fff', elevation: 5, shadowColor: '#1A1410', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }} accessibilityLabel={text(c, 'title')}>
      <View style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }}>
        <Photo url={str(c, 'image')} corner={0} style={{ width: '100%', aspectRatio: 0.95 }} />
        <LinearGradient colors={['transparent', '#300A1099']} locations={[0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 8, left: 8, gap: 4 }}>
          {bool(c, 'verified') ? <View style={{ alignSelf: 'flex-start', borderRadius: 50, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3 }}><Txt k="labelSmall" color={Brand.TealDark}>✓ Verified</Txt></View> : null}
          <RefundTag refundable={isRefundable(c)} />
        </View>
        <Text style={{ position: 'absolute', left: 10, bottom: 10, fontSize: 16 }}>{strings(c, 'pet_types').map((t) => petEmoji[t] || '🐾').join('')}</Text>
        {r && r > 0 ? <Txt k="labelMedium" color="#fff" style={{ position: 'absolute', right: 10, bottom: 10 }}>★ {r.toFixed(1)}</Txt> : null}
      </View>
      <View style={{ paddingHorizontal: 11, paddingTop: 9, paddingBottom: 12 }}>
        <Txt k="titleSmall" numberOfLines={1}>{text(c, 'title')}</Txt>
        <Txt k="labelMedium" color={Brand.Muted} numberOfLines={1}>{text(c, 'location')}</Txt>
        <View style={[st.row, { alignItems: 'flex-end', marginTop: 6 }]}><Txt k="titleSmall" bold color={Brand.BlueDark}>{money(num(c, 'price'))}</Txt><Txt k="labelMedium" color={Brand.Muted}> /night</Txt></View>
        {free !== null ? <Txt k="labelSmall" color={free > 0 ? Brand.TealDark : Brand.Warn}>{free > 0 ? `${free} free for your dates` : 'Full for your dates'}</Txt> : null}
      </View>
    </Press>
  );
}
