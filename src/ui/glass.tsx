// Glass search panel: a coral "water" backdrop with slow rolling waves and rising bubbles, and frosted-glass controls on top.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Icon, Txt, addDays, shortDate } from './kit';
import { DateRangeSheet } from './inputs';

export const GLASS = {
  fill: 'rgba(255,255,255,0.18)',
  fillStrong: 'rgba(255,255,255,0.28)',
  edge: 'rgba(255,255,255,0.55)',
  text: '#FFFFFF',
  soft: 'rgba(255,255,255,0.78)',
};

function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setR);
    return () => sub.remove();
  }, []);
  return r;
}

/** A looping value 0→1 (native driver), or a still 0 when motion is reduced. */
function useLoop(ms: number, still: boolean, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) { v.setValue(0); return; }
    const a = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [still]);
  return v;
}

/** Two sine periods side by side, so sliding left by one period loops seamlessly. */
function wavePath(w: number, h: number, amp: number) {
  const m = amp + 2;
  return `M0 ${m} Q ${w / 4} ${m - amp} ${w / 2} ${m} T ${w} ${m} T ${w * 1.5} ${m} T ${w * 2} ${m} L ${w * 2} ${h} L 0 ${h} Z`;
}

function Wave({ w, h, amp, color, ms, still, bottom, reverse }: { w: number; h: number; amp: number; color: string; ms: number; still: boolean; bottom: number; reverse?: boolean }) {
  const t = useLoop(ms, still);
  const bob = useLoop(ms * 0.8, still);
  const x = t.interpolate({ inputRange: [0, 1], outputRange: reverse ? [-w, 0] : [0, -w] });
  const y = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom, width: w * 2, height: h, transform: [{ translateX: x }, { translateY: y }] }}>
      <Svg width={w * 2} height={h}><Path d={wavePath(w, h, amp)} fill={color} /></Svg>
    </Animated.View>
  );
}

function Bubble({ left, size, ms, delay, rise, still }: { left: number; size: number; ms: number; delay: number; rise: number; still: boolean }) {
  const t = useLoop(ms, still, delay);
  if (still) return null;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left, bottom: 8, width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.18)',
      opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) }, { translateX: t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, 5, -4, 2] }) }],
    }} />
  );
}

/** The panel: deep coral water, waves rolling along the bottom, bubbles rising, a glass sheen on top. */
export function WaterGlass({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const still = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  return (
    <View onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
      style={[{ borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: '#E2373C', shadowColor: '#B3141B', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 }, style]}>
      <LinearGradient pointerEvents="none" colors={['#FF7A59', '#F0454B', '#C81E2C']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {/* soft light blobs, like sun through water */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,199,44,0.28)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 90, left: -70, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      {w > 0 ? <>
        <Wave w={w} h={Math.max(80, h * 0.32)} amp={10} color="rgba(255,255,255,0.10)" ms={9000} still={still} bottom={0} reverse />
        <Wave w={w} h={Math.max(64, h * 0.24)} amp={12} color="rgba(120,8,20,0.22)" ms={6500} still={still} bottom={0} />
        <Wave w={w} h={Math.max(44, h * 0.15)} amp={8} color="rgba(255,255,255,0.14)" ms={4800} still={still} bottom={0} reverse />
        <Bubble left={w * 0.12} size={10} ms={5200} delay={0} rise={h * 0.55} still={still} />
        <Bubble left={w * 0.34} size={6} ms={4300} delay={1400} rise={h * 0.4} still={still} />
        <Bubble left={w * 0.63} size={12} ms={6100} delay={700} rise={h * 0.6} still={still} />
        <Bubble left={w * 0.85} size={7} ms={4800} delay={2300} rise={h * 0.45} still={still} />
      </> : null}
      {/* the glass sheen along the top edge */}
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 70 }} />
      <View style={{ padding: 14, paddingBottom: 30 }}>{children}</View>
    </View>
  );
}

/** A frosted-glass box for a control on the water. */
export function GlassBox({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const box: ViewStyle = { borderRadius: 20, backgroundColor: GLASS.fill, borderWidth: 1, borderColor: GLASS.edge, overflow: 'hidden' };
  const sheen = <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.02)']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
  if (!onPress) return <View style={[box, style]}>{sheen}{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [box, pressed ? { backgroundColor: GLASS.fillStrong } : null, style]}>
      {sheen}{children}
    </Pressable>
  );
}

/** Check-in → check-out on glass; opens the usual calendar sheet. */
export function GlassDates({ checkIn, checkOut, onChange }: { checkIn: string; checkOut: string; onChange: (a: string, b: string) => void }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(checkIn); const [b, setB] = useState(checkOut);
  const cell = (icon: string, title: string, value: string) => (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color="#fff" /></View>
      <View style={{ marginLeft: 9, flex: 1 }}>
        <Txt k="labelSmall" color={GLASS.soft}>{title}</Txt>
        <Txt k="titleSmall" color="#fff" numberOfLines={1}>{value}</Txt>
      </View>
    </View>
  );
  return (
    <>
      <GlassBox onPress={() => { setA(checkIn); setB(checkOut); setOpen(true); }} label="Choose dates" style={{ flexDirection: 'row' }}>
        {cell('login', 'Check-in', checkIn ? shortDate(checkIn) : 'Add date')}
        <View style={{ width: 1, marginVertical: 10, backgroundColor: 'rgba(255,255,255,0.45)' }} />
        {cell('logout', 'Check-out', checkOut ? shortDate(checkOut) : 'Add date')}
      </GlassBox>
      <DateRangeSheet open={open} start={a} end={b} title="Check-in and check-out" onClose={() => setOpen(false)}
        onPick={(x, y) => { setA(x); setB(y); }} onDone={() => { if (a) onChange(a, b && b > a ? b : addDays(a, 1)); setOpen(false); }} />
    </>
  );
}

/** Guests − n + on glass. */
export function GlassGuests({ value, onChange, min = 1, max = 30 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn = (icon: string, on: boolean, f: () => void, a: string) => (
    <Pressable onPress={f} disabled={!on} accessibilityLabel={a} hitSlop={6}
      style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (pressed ? '#fff' : 'rgba(255,255,255,0.92)') : 'rgba(255,255,255,0.2)' })}>
      <Icon name={icon} size={18} color={on ? '#D93338' : 'rgba(255,255,255,0.6)'} />
    </Pressable>
  );
  return (
    <GlassBox style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}><Icon name="group" size={18} color="#fff" /></View>
      <View style={{ flex: 1, marginLeft: 9 }}>
        <Txt k="labelSmall" color={GLASS.soft}>Guests</Txt>
        <Txt k="titleSmall" color="#fff">{value} {value === 1 ? 'guest' : 'guests'}</Txt>
      </View>
      {btn('remove', value > min, () => onChange(value - 1), 'Fewer guests')}
      <Txt k="titleMedium" color="#fff" center style={{ width: 34 }}>{value}</Txt>
      {btn('add', value < max, () => onChange(value + 1), 'More guests')}
    </GlassBox>
  );
}

/** A pill on glass; the chosen one turns solid white. */
export function GlassChip({ label, icon, on, onPress }: { label: string; icon?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 50, borderWidth: 1, borderColor: on ? '#fff' : GLASS.edge, backgroundColor: on ? '#fff' : GLASS.fill, paddingHorizontal: 13, paddingVertical: 7 }}>
      {icon ? <Icon name={icon} size={16} color={on ? '#D93338' : '#fff'} /> : null}
      <Txt k="labelLarge" color={on ? '#D93338' : '#fff'}>{label}</Txt>
    </Pressable>
  );
}
