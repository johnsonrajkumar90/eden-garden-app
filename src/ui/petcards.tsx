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
    <Press onPress={onPress} style={[st.glass, { borderRadius: 24, overflow: 'hidden' }]} scaleTo={0.98}>
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

import { GlassListingCard, T_REFUND, T_VERIFIED, isRefundable } from './cards';

/** A pet host as a grid card: the glass listing card. */
export function PetGridCard({ c, onPress }: { c: J; onPress: () => void }) {
  const free = c.free === undefined || c.free === null ? null : int(c, 'free');
  const tags = [...(bool(c, 'verified') ? [T_VERIFIED] : []), ...(isRefundable(c) && c.refundable === true ? [T_REFUND] : [])];
  return (
    <GlassListingCard image={str(c, 'image')} title={text(c, 'title')} place={text(c, 'location')} price={money(num(c, 'price'))} unit={'/night · ' + strings(c, 'pet_types').map((t) => petEmoji[t] || '🐾').join('')}
      tags={tags} rating={num(c, 'rating')} note={free !== null ? (free > 0 ? `${free} free for your dates` : 'Full for your dates') : null} noteTone={free === 0 ? 'warn' : 'ok'} onPress={onPress} />
  );
}
