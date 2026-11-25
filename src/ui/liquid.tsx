// Liquid motion: rolling waves and rising bubbles, drawn with plain Animated (native driver) + SVG. Still when the phone asks for reduced motion.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setR);
    return () => sub.remove();
  }, []);
  return r;
}

/** A looping value 0→1 (native driver), or a still 0 when motion is reduced. */
export function useLoop(ms: number, still: boolean, delay = 0) {
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

export function Wave({ w, h, amp, color, ms, still, bottom, reverse, bobPx = 6 }: { w: number; h: number; amp: number; color: string; ms: number; still: boolean; bottom: number; reverse?: boolean; bobPx?: number }) {
  const t = useLoop(ms, still);
  const bob = useLoop(ms * 0.8, still || !bobPx);
  const x = t.interpolate({ inputRange: [0, 1], outputRange: reverse ? [-w, 0] : [0, -w] });
  const y = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -bobPx, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom, width: w * 2, height: h, transform: [{ translateX: x }, { translateY: y }] }}>
      <Svg width={w * 2} height={h}><Path d={wavePath(w, h, amp)} fill={color} /></Svg>
    </Animated.View>
  );
}

export function Bubble({ left, size, ms, delay, rise, still, bottom = 8, color = 'rgba(255,255,255,0.75)', fill = 'rgba(255,255,255,0.18)' }: { left: number; size: number; ms: number; delay: number; rise: number; still: boolean; bottom?: number; color?: string; fill?: string }) {
  const t = useLoop(ms, still, delay);
  if (still) return null;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left, bottom, width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color, backgroundColor: fill,
      opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) }, { translateX: t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, 5, -4, 2] }) }],
    }} />
  );
}


export type WaveSpec = { color: string; h: number; amp: number; ms: number; reverse?: boolean; bob?: number };

/**
 * Fills its parent (absolute) with waves along the bottom and, optionally, bubbles rising.
 * Wave heights may be numbers (px) or fractions of the parent's height (< 1).
 */
export function LiquidLayer({ waves, bubbles = 0, bubbleColor, style }: { waves: WaveSpec[]; bubbles?: number; bubbleColor?: string; style?: StyleProp<ViewStyle> }) {
  const still = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  const px = (v: number) => (v < 1 ? Math.round(h * v) : v);
  return (
    <View pointerEvents="none" onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
      style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }, style]}>
      {w > 0 && h > 0 ? <>
        {waves.map((x, i) => <Wave key={i} w={w} h={px(x.h)} amp={x.amp} color={x.color} ms={x.ms} still={still} bottom={0} reverse={x.reverse} bobPx={x.bob ?? 0} />)}
        {Array.from({ length: bubbles }, (_, i) => {
          const f = [0.1, 0.32, 0.55, 0.78, 0.9, 0.2, 0.66][i % 7];
          return <Bubble key={'b' + i} left={w * f} size={[8, 5, 10, 6, 7, 4, 9][i % 7]} ms={4200 + (i * 913) % 2600} delay={(i * 1170) % 3000} rise={h * 0.75} still={still} bottom={4} color={bubbleColor} />;
        })}
      </> : null}
    </View>
  );
}
