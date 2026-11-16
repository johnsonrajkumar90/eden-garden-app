// Pieces of a details page (stay, resort, pet host, place): photo gallery, title card, facts, sections, amenities, price bar.
import React, { ReactNode, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand } from '../theme';
import { Icon, Photo, Txt, st } from './kit';
import { DOCK_SPACE, Dock } from './dock';

/** Photos across the top of a details page: swipe, dot indicators, a soft shade so the buttons read on any photo. */
export function HeroGallery({ urls, onOpen, actions, ratio = 1.08 }: { urls: string[]; onOpen?: (u: string) => void; actions?: ReactNode; ratio?: number }) {
  const { width } = useWindowDimensions();
  const list = urls.length ? urls : [''];
  const [page, setPage] = useState(0);
  const h = width / ratio;
  const shown = Math.min(list.length, 7);
  return (
    <View style={{ width, height: h }}>
      <FlatList data={list} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Pressable disabled={!onOpen || !item} onPress={() => onOpen?.(item)}>
            <Photo url={item || null} corner={0} style={{ width, height: h }} />
          </Pressable>
        )} />
      <LinearGradient pointerEvents="none" colors={['#00000066', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
      <LinearGradient pointerEvents="none" colors={['transparent', '#00000055']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 }} />
      <View style={[st.row, { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, gap: 8 }]}>{actions}</View>
      {list.length > 1 ? (
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }} pointerEvents="none">
          {Array.from({ length: shown }, (_, i) => <View key={i} style={{ height: 7, width: Math.min(page, shown - 1) === i ? 20 : 7, borderRadius: 4, backgroundColor: Math.min(page, shown - 1) === i ? '#fff' : 'rgba(255,255,255,0.55)' }} />)}
        </View>
      ) : null}
    </View>
  );
}

/** The rating as a small badge: ★ 4.9 · 12 reviews. */
export function RatingBadge({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (!rating || rating <= 0) return <View style={{ alignSelf: 'flex-start', borderRadius: 50, backgroundColor: Brand.TealSoft, paddingHorizontal: 10, paddingVertical: 4 }}><Txt k="labelLarge" color={Brand.TealDark}>New</Txt></View>;
  return (
    <View style={[st.row, { alignSelf: 'flex-start', borderRadius: 50, backgroundColor: '#FFF6E5', paddingHorizontal: 10, paddingVertical: 4 }]}>
      <Icon name="star" size={16} color={Brand.Star} />
      <Txt k="labelLarge" bold> {rating.toFixed(1)}</Txt>
      {count && count > 0 ? <Txt k="labelMedium" color={Brand.InkSoft}> · {count} review{count === 1 ? '' : 's'}</Txt> : null}
    </View>
  );
}

/** The white card with the title that overlaps the photos. */
export function TitleCard({ children }: { children: ReactNode }) {
  return <View style={[st.card, { marginHorizontal: 12, borderRadius: 28, padding: 18 }]}>{children}</View>;
}

/** Quick facts as tiles (icon + text), wrapped over lines. */
export function FactTiles({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([icon, t], i) => (
        <View key={i} style={[st.row, { borderRadius: 14, backgroundColor: Brand.Sky, paddingHorizontal: 12, paddingVertical: 9 }]}>
          <Icon name={icon} size={18} color={Brand.Blue} /><Txt k="labelLarge">  {t}</Txt>
        </View>
      ))}
    </View>
  );
}

/** A section of a details page: white rounded card with an icon and a title. */
export function DetailSection({ title, icon, sub, children }: { title: string; icon?: string; sub?: string | null; children: ReactNode }) {
  return (
    <View style={{ marginHorizontal: 12, marginVertical: 6, borderRadius: 22, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#EFEDE9' }}>
      <View style={[st.row, { marginBottom: 12 }]}>
        {icon ? <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: Brand.Field, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Icon name={icon} size={19} color={Brand.Blue} /></View> : null}
        <View style={{ flex: 1 }}>
          <Txt k="titleLarge">{title}</Txt>
          {sub ? <Txt k="bodySmall" color={Brand.Muted}>{sub}</Txt> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

/** An icon for an amenity / facility name (Wifi, Pool, Parking, CCTV, Grooming…). */
export function amenityIcon(name: string): string {
  const n = name.toLowerCase(); const has = (...w: string[]) => w.some((x) => n.includes(x));
  if (has('wifi', 'internet')) return 'wifi';
  if (has('pool')) return 'pool';
  if (has('parking')) return 'local-parking';
  if (has('kitchen')) return 'kitchen';
  if (has('breakfast')) return 'free-breakfast';
  if (has('restaurant', 'meal', 'food', 'dining')) return 'restaurant';
  if (has('fire', 'bonfire')) return 'local-fire-department';
  if (has('tv', 'television')) return 'tv';
  if (n === 'ac' || has('air', 'a/c')) return 'ac-unit';
  if (has('view', 'mountain', 'valley')) return 'landscape';
  if (has('garden', 'lawn', 'outdoor')) return 'yard';
  if (has('balcony', 'terrace', 'deck')) return 'deck';
  if (has('laundry', 'washing')) return 'local-laundry-service';
  if (has('spa', 'massage')) return 'spa';
  if (has('hot water', 'geyser', 'shower')) return 'shower';
  if (has('bath')) return 'bathtub';
  if (has('cctv', 'camera')) return 'videocam';
  if (has('vet', 'medic', 'first aid')) return 'medical-services';
  if (has('groom')) return 'content-cut';
  if (has('pickup', 'pick-up', 'drop', 'taxi', 'transfer')) return 'directions-car';
  if (has('power', 'backup', 'generator')) return 'bolt';
  if (has('security', 'guard', '24-hour', 'supervision')) return 'security';
  if (has('lift', 'elevator')) return 'elevator';
  if (has('gym', 'fitness')) return 'fitness-center';
  if (has('game', 'play', 'sport')) return 'sports-tennis';
  if (has('pet', 'dog', 'cat')) return 'pets';
  if (has('room', 'bed')) return 'bed';
  if (has('indoor', 'home')) return 'home';
  if (has('guest')) return 'people';
  return 'check-circle-outline';
}

/** Amenities / facilities in two columns with icons; long lists open with "Show all". */
export function AmenityGrid({ items, first = 8 }: { items: string[]; first?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, first);
  const rows: string[][] = []; for (let i = 0; i < shown.length; i += 2) rows.push(shown.slice(i, i + 2));
  return (
    <View>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', paddingVertical: 7 }}>
          {row.map((a, j) => <View key={j} style={[st.row, { flex: 1 }]}><Icon name={amenityIcon(a)} size={20} color={Brand.TealDark} /><Txt numberOfLines={2} style={{ flex: 1 }}>  {a}</Txt></View>)}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
      {items.length > first ? (
        <Pressable onPress={() => setAll(!all)} style={{ alignSelf: 'flex-start', marginTop: 8, borderRadius: 50, backgroundColor: Brand.Field, paddingHorizontal: 14, paddingVertical: 9 }}>
          <Txt k="titleSmall" color={Brand.Ink}>{all ? 'Show less' : `Show all ${items.length}`}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Two time tiles: check-in / check-out (or drop-off / pick-up). */
export function TimeTiles({ leftLabel, left, rightLabel, right }: { leftLabel: string; left: string; rightLabel: string; right: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {[[leftLabel, left], [rightLabel, right]].map(([l, v], i) => (
        <View key={i} style={{ flex: 1, borderRadius: 16, backgroundColor: Brand.Page, padding: 14 }}>
          <Txt k="labelMedium" color={Brand.Muted}>{l}</Txt><Txt k="titleLarge">{v}</Txt>
        </View>
      ))}
    </View>
  );
}

/** A row that opens to show its text (Things to know). */
export function ExpandRow({ title, text, startOpen }: { title: string; text: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} style={[st.row, { paddingVertical: 12 }]} accessibilityLabel={(open ? 'Hide ' : 'Show ') + title}>
        <Txt k="titleSmall" style={{ flex: 1 }}>{title}</Txt>
        <Icon name={open ? 'expand-less' : 'expand-more'} color={Brand.Muted} />
      </Pressable>
      {open ? <Txt color={Brand.InkSoft} style={{ paddingBottom: 12 }}>{text}</Txt> : null}
      <View style={{ height: 1, backgroundColor: Brand.Line }} />
    </View>
  );
}

/** The refund for cancelling at each point, as a coloured timeline. */
export function RefundTimeline({ rows }: { rows: [string, number][] }) {
  return (
    <View>
      {rows.map(([when, pct], i) => {
        const tone = pct >= 100 ? Brand.Teal : pct > 0 ? Brand.Warn : Brand.Danger;
        return (
          <View key={i} style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tone }} />
              {i < rows.length - 1 ? <View style={{ width: 2, height: 34, backgroundColor: Brand.Line }} /> : null}
            </View>
            <View style={{ paddingLeft: 12, paddingBottom: 8, flex: 1 }}>
              <Txt k="titleSmall" color={tone}>{pct}% refund</Txt>
              <Txt k="bodySmall" color={Brand.InkSoft}>{when}</Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Room at the end of a page for the floating price bar. */
export const PRICE_BAR_SPACE = 100 + DOCK_SPACE;

/** The floating bar at the bottom of a details page: price, a note, and the main button. */
export function PriceBar({ price, unit, was, note, button }: { price: string; unit: string; was?: string | null; note?: string | null; button: ReactNode }) {
  return (
    // floats over the page (the page leaves room for it with PRICE_BAR_SPACE), just above the floating menu
    <View style={[st.row, { position: 'absolute', left: 12, right: 12, bottom: Dock.h + 6, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 30, paddingLeft: 20, paddingRight: 8, paddingVertical: 8, borderWidth: 1.5, borderColor: '#FFFFFF', elevation: 14, shadowColor: '#C8242B', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }]}>
      <View style={{ flex: 1 }}>
        <View style={[st.row, { alignItems: 'flex-end' }]}>
          {was ? <Txt color={Brand.Muted} style={{ textDecorationLine: 'line-through' }}>{was} </Txt> : null}
          <Txt k="headlineSmall">{price}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}> {unit}</Txt>
        </View>
        {note ? <Txt k="labelMedium" color={Brand.TealDark} numberOfLines={1}>{note}</Txt> : null}
      </View>
      {button}
    </View>
  );
}
