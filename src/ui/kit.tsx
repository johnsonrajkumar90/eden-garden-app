// The shared look of the app: text, cards, buttons, notices, headers, photos and money / date formatting.
import React, { ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, Easing, Pressable, PressableProps, Share, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, T, Fonts } from '../theme';

/* ---------- Formatting ---------- */
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const money = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '—' : '₹' + inr.format(Math.round(v)));
export const signedMoney = (v: number) => (v < 0 ? '− ' + money(-v) : money(v));
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function parseIso(iso?: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(iso);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
export const prettyDate = (iso?: string | null) => { const d = parseIso(iso); return d ? `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` : iso || '—'; };
export const shortDate = (iso?: string | null) => { const d = parseIso(iso); return d ? `${d.getDate()} ${MON[d.getMonth()]}` : iso || '—'; };
export const dayMonth = (iso?: string | null) => { const d = parseIso(iso); return d ? `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : ''; };
export function clock(d: Date) { const h = d.getHours() % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`; }
export const dateTime = (iso?: string | null) => { const d = parseIso(iso); return d ? `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}, ${clock(d)}` : iso || ''; };
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => isoDate(new Date());
export const addDays = (iso: string, n: number) => { const d = parseIso(iso); if (!d) return iso; d.setDate(d.getDate() + n); return isoDate(d); };
export const MONTHS = MON; export const DAYS = DAY;
/** Initials from a name, letters only: "Priya (Host)" → "P", "Kavya Pet Host" → "KP". */
export const initialsOf = (name: string) => name.replace(/\(.*?\)/g, ' ').split(/\s+/).map((w) => [...w].find((c) => /\p{L}/u.test(c))?.toUpperCase()).filter(Boolean).slice(0, 2).join('') || '?';

/* ---------- Text & icons ---------- */
type Kind = keyof typeof T;
export function Txt({ k = 'bodyMedium', color, bold, semi, center, style, ...p }: TextProps & { k?: Kind; color?: string; bold?: boolean; semi?: boolean; center?: boolean }) {
  return <Text {...p} style={[T[k], color ? { color } : null, bold ? { fontFamily: k.startsWith('display') || k.startsWith('headline') || k === 'titleLarge' ? Fonts.b : Fonts.bold } : null, semi ? { fontFamily: Fonts.semi } : null, center ? { textAlign: 'center' } : null, style]} />;
}

/** Material icon by name ("mc:" prefix = community set, for outlines Material doesn't have). */
export function Icon({ name, size = 22, color = Brand.Ink, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  if (name.startsWith('mc:')) return <MaterialCommunityIcons name={name.slice(3) as any} size={size} color={color} style={style} />;
  return <MaterialIcons name={name as any} size={size} color={color} style={style} />;
}

export const Gap = ({ h = 12, w }: { h?: number; w?: number }) => <View style={w ? { width: w } : { height: h }} />;

/* ---------- Motion ---------- */
/** Pressable that shrinks a little when held (the native app's "pressable"). */
export function Press({ style, children, scaleTo = 0.965, disabled, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...p} disabled={disabled} onPressIn={(e) => { to(scaleTo); p.onPressIn?.(e); }} onPressOut={(e) => { to(1); p.onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Fades and rises in once (cards, list items). */
export function Appear({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 380, delay: Math.min(index, 8) * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [a, index]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

/* ---------- Layout pieces ---------- */
/** A round button in the header: back, share, star (white on the light page, hairline ring). */
export function HeadButton({ icon, label, onPress, tint = Brand.Ink }: { icon: string; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [st.headBtn, pressed ? { backgroundColor: Brand.Field } : null]}>
      <Icon name={icon} size={21} color={tint} />
    </Pressable>
  );
}

/** The top of every inner screen: a round back button, the title, actions — on the page itself, no coloured band. */
export function BackBar({ title, onBack, actions }: { title: string; onBack?: () => void; actions?: ReactNode }) {
  return (
    <View style={st.bar}>
      {onBack ? <HeadButton icon="arrow-back" label="Back" onPress={onBack} /> : <View style={{ width: 4 }} />}
      <Txt k="titleMedium" numberOfLines={1} style={{ flex: 1, marginLeft: 12, fontFamily: Fonts.s, fontSize: 17 }}>{title}</Txt>
      <View style={[st.row, { gap: 4 }]}>{actions}</View>
    </View>
  );
}

/** Main screens: the round back button on top, then a big title on the page (no coloured band). */
export function ColorHeader({ title, sub, onBack, actions, children }: { title: string; sub?: string | null; onBack?: () => void; actions?: ReactNode; children?: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 }}>
      {onBack || actions ? (
        <View style={[st.row, { minHeight: 44, marginBottom: 6 }]}>
          {onBack ? <HeadButton icon="arrow-back" label="Back" onPress={onBack} /> : null}
          <View style={{ flex: 1 }} />
          <View style={[st.row, { gap: 4 }]}>{actions}</View>
        </View>
      ) : null}
      <Txt k="headlineMedium">{title}</Txt>
      {sub ? <Txt k="bodyMedium" color={Brand.Muted} style={{ marginTop: 2 }}>{sub}</Txt> : null}
      {children}
    </View>
  );
}

/** Three bouncing dots in the brand colours. */
export function Loading({ style }: { style?: StyleProp<ViewStyle> }) {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => Animated.loop(Animated.sequence([Animated.delay(i * 120), Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 220, useNativeDriver: true }), Animated.delay(460 - i * 120)])));
    loops.forEach((l) => l.start()); return () => loops.forEach((l) => l.stop());
  }, [vals]);
  return (
    <View style={[{ padding: 40, alignItems: 'center' }, style]} accessibilityLabel="Loading">
      <View style={[st.row, { gap: 8 }]}>
        {[Brand.Blue, Brand.Sun, Brand.Ink].map((c, i) => <Animated.View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c, transform: [{ translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }} />)}
      </View>
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Brand.Field, alignItems: 'center', justifyContent: 'center' }}><Icon name="cloud-off" size={30} color={Brand.Muted} /></View>
      <Gap h={10} />
      <Txt center color={Brand.InkSoft}>{message}</Txt>
      {onRetry ? <><Gap h={14} /><OutlineButton text="Try again" onPress={onRetry} /></> : null}
    </View>
  );
}

export function EmptyBox({ title, text, action, icon, onAction }: { title: string; text: string; action?: string; icon?: string; onAction?: () => void }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      {icon ? <View style={{ width: 76, height: 64, borderTopLeftRadius: 38, borderTopRightRadius: 38, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon name={icon} size={34} color={Brand.Blue} /></View> : null}
      <Txt k="titleMedium" center>{title}</Txt>
      <Gap h={6} />
      <Txt center color={Brand.InkSoft}>{text}</Txt>
      {action && onAction ? <><Gap h={14} /><Press onPress={onAction} style={{ backgroundColor: Brand.Blue, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 13 }}><Txt k="labelLarge" color="#fff">{action}</Txt></Press></> : null}
    </View>
  );
}

/** A white card with a hairline edge on the light page. */
export function Card({ children, style, padding = 16, onPress, index = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; padding?: number; onPress?: () => void; index?: number }) {
  const body = <View style={[st.card, { padding }, style]}>{children}</View>;
  return <Appear index={index}>{onPress ? <Press onPress={onPress}>{body}</Press> : body}</Appear>;
}

export function SectionTitle({ text, sub, action, onAction, style }: { text: string; sub?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[st.row, { alignItems: 'flex-end', paddingTop: 4, paddingBottom: 8 }, style]}>
      <View style={{ flex: 1 }}>
        <Txt k="titleLarge">{text}</Txt>
        {sub ? <Txt k="bodySmall" color={Brand.Muted}>{sub}</Txt> : null}
      </View>
      {action && onAction ? <Pressable onPress={onAction} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: Brand.Field }}><Txt k="labelMedium" semi color={Brand.Ink}>{action}</Txt></Pressable> : null}
    </View>
  );
}

const TONES: Record<string, [string, string]> = {
  ok: [Brand.TealSoft, Brand.TealDark], success: [Brand.TealSoft, Brand.TealDark], warn: [Brand.WarnSoft, Brand.Warn], warning: [Brand.WarnSoft, Brand.Warn],
  bad: [Brand.DangerSoft, Brand.Danger], danger: [Brand.DangerSoft, Brand.Danger], info: [Brand.Sky, Brand.Blue], muted: [Brand.Field, Brand.InkSoft],
};
export function Pill({ text, tone = 'muted' }: { text: string; tone?: string }) {
  const [bg, fg] = TONES[tone] || TONES.muted;
  return <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 }}><Txt k="bodySmall" semi color={fg}>{text}</Txt></View>;
}
export function Chips({ items }: { items: string[] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{items.map((x, i) => <View key={i} style={{ backgroundColor: Brand.Field, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="bodySmall" color={Brand.InkSoft}>{x}</Txt></View>)}</View>;
}
export function Stars({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (!rating || rating <= 0) return null;
  return <View style={st.row}><Icon name="star" size={16} color={Brand.Star} /><Txt k="bodySmall" semi> {rating.toFixed(1)}</Txt>{count ? <Txt k="bodySmall" color={Brand.Muted}> ({count})</Txt> : null}</View>;
}
export function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={[st.row, { paddingVertical: 2 }]}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => onChange(n)} style={{ padding: 6 }} accessibilityLabel={`${n} stars`}><Icon name={n <= value ? 'star' : 'star-border'} color={n <= value ? Brand.Star : Brand.Muted} /></Pressable>)}
    </View>
  );
}

export type PriceLine = { label: string; amount: number; note?: string | null };
export function PriceTable({ lines, total, totalLabel = 'Total', extra = [] }: { lines: PriceLine[]; total?: number | null; totalLabel?: string; extra?: [string, string][] }) {
  return (
    <View>
      {lines.map((l, i) => (
        <View key={i} style={[st.row, { paddingVertical: 3, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}><Txt color={Brand.InkSoft}>{l.label}</Txt>{l.note ? <Txt k="bodySmall" color={Brand.Muted}>{l.note}</Txt> : null}</View>
          <Txt color={l.amount < 0 ? Brand.TealDark : Brand.Ink}>{signedMoney(l.amount)}</Txt>
        </View>
      ))}
      {total !== null && total !== undefined ? (
        <><View style={{ height: 1, backgroundColor: Brand.Line, marginVertical: 6 }} />
          <View style={st.row}><Txt k="titleMedium" style={{ flex: 1 }}>{totalLabel}</Txt><Txt k="titleMedium">{money(total)}</Txt></View></>
      ) : null}
      {extra.map(([k, v], i) => <View key={i} style={[st.row, { paddingTop: 3 }]}><Txt color={Brand.InkSoft} style={{ flex: 1 }}>{k}</Txt><Txt>{v}</Txt></View>)}
    </View>
  );
}

export function Photo({ url, style, corner = 14, label }: { url?: string | null; style?: StyleProp<any>; corner?: number; label?: string }) {
  if (!url) return <View style={[{ borderRadius: corner, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}><Txt k="bodySmall" color={Brand.Muted}>TripArro</Txt></View>;
  return <Image source={{ uri: url }} accessibilityLabel={label} contentFit="cover" transition={200} style={[{ borderRadius: corner, backgroundColor: Brand.Sky }, style]} />;
}

/** The main action: a solid red pill with white text (yellow is kept for highlights). */
export function PrimaryButton({ text, onPress, disabled, loading, icon, style }: { text: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: string; style?: StyleProp<ViewStyle>; coral?: boolean }) {
  const on = !disabled && !loading;
  const tint = on || loading ? '#fff' : Brand.Muted;
  return (
    <Press onPress={onPress} disabled={!on} style={[{ minHeight: 54, borderRadius: 27, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on || loading ? Brand.Blue : '#E7E5E2' }, on ? st.redShadow : null, style]} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled: !on, busy: !!loading }}>
      {loading ? <ActivityIndicator color="#fff" /> : <View style={st.row}>{icon ? <Icon name={icon} size={19} color={tint} style={{ marginRight: 8 }} /> : null}<Txt k="labelLarge" bold color={tint}>{text}</Txt></View>}
    </Press>
  );
}
export function OutlineButton({ text, onPress, icon, style, disabled, color = Brand.Blue }: { text: string; onPress: () => void; icon?: string; style?: StyleProp<ViewStyle>; disabled?: boolean; color?: string }) {
  return (
    <Press onPress={onPress} disabled={disabled} style={[{ borderWidth: 1.2, borderColor: '#DAD7D2', borderRadius: 50, minHeight: 46, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity: disabled ? 0.5 : 1 }, style]} accessibilityRole="button">
      {icon ? <Icon name={icon} size={18} color={color} style={{ marginRight: 6 }} /> : null}<Txt k="labelLarge" color={color}>{text}</Txt>
    </Press>
  );
}
export function LinkButton({ text, onPress, color = Brand.Blue, disabled }: { text: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={{ paddingHorizontal: 10, paddingVertical: 8, opacity: disabled ? 0.4 : 1 }} accessibilityRole="button"><Txt k="labelLarge" color={color}>{text}</Txt></Pressable>;
}

export function Notice({ text, tone = 'info', style }: { text: string; tone?: string; style?: StyleProp<ViewStyle> }) {
  const [bg, fg] = TONES[tone === 'info' ? 'infoN' : tone] || [Brand.Sky, Brand.BlueDark];
  return <View style={[{ backgroundColor: bg, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, borderLeftWidth: 3, borderLeftColor: fg }, style]}><Txt color={fg}>{text}</Txt></View>;
}
TONES.infoN = ['#F1F0EE', Brand.InkSoft];

export function KeyValue({ k, v }: { k: string; v: string }) {
  return <View style={[st.row, { paddingVertical: 4, alignItems: 'flex-start' }]}><Txt color={Brand.InkSoft} style={{ width: 120 }}>{k}</Txt><Txt style={{ flex: 1 }}>{v}</Txt></View>;
}
export function Avatar({ initials, size = 44, color = Brand.Blue }: { initials: string; size?: number; color?: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleSmall" color="#fff">{initials.slice(0, 2).toUpperCase()}</Txt></View>;
}
export function Bordered({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const v = <View style={[{ borderWidth: 1, borderColor: Brand.Line, borderRadius: 18, backgroundColor: '#fff', padding: 12 }, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{v}</Pressable> : v;
}
/** A round white button on top of a photo (back, share, save). */
export function RoundAction({ icon, label, onPress, tint = Brand.Ink }: { icon: string; label: string; onPress: () => void; tint?: string }) {
  return <Pressable onPress={onPress} accessibilityLabel={label} style={[{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, st.shadow]}><Icon name={icon} size={21} color={tint} /></Pressable>;
}
/** Share a page with the phone's share sheet (WhatsApp, messages…). */
export function shareLink(title: string, url: string) { Share.share({ message: url ? `${title} — ${url}` : title }).catch(() => {}); }

/** Chip row choice (e.g. categories): the chosen one filled. */
export function ChipChoice<V extends string | number>({ options, value, onChange, tone = 'blue' }: { options: [V, string][]; value: V | null; onChange: (v: V) => void; tone?: 'blue' | 'ink' }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map(([v, l]) => {
        const on = v === value;
        return <Pressable key={String(v)} onPress={() => onChange(v)} style={{ borderRadius: 50, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: on ? (tone === 'ink' ? Brand.Ink : Brand.Blue) : '#fff', borderWidth: 1, borderColor: on ? 'transparent' : Brand.Line }}><Txt k="labelLarge" color={on ? '#fff' : Brand.InkSoft}>{l}</Txt></Pressable>;
      })}
    </View>
  );
}

/** The safe-area spacer at the top (status bar), the page colour by default. */
export function StatusSpace({ color = Brand.Page }: { color?: string }) {
  const i = useSafeAreaInsets();
  return <View style={{ height: i.top, backgroundColor: color }} />;
}

export const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 12, paddingVertical: 8 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line },
  card: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#EFEDE9', shadowColor: '#1A1410', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  sunShadow: { shadowColor: '#1A1410', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  redShadow: { shadowColor: '#D93338', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  page: { flex: 1, backgroundColor: 'transparent' },
});
