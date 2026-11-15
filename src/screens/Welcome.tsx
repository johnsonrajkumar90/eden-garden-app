/*
 * The first screen when the app opens and nobody is signed in: a full-screen picture, three real stays, a few words
 * about TripArro, and Continue with Google / email — or look around first.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { Icon, Txt } from '../ui/kit';
import { Fonts } from '../theme';
import { J, objs, str, text } from '../core/json';
import { GoogleButton, startGoogleSignIn } from './Auth';

const slides = [
  { title: "Stays you'll love,\nchecked in person", sub: 'Homestays, villas and resorts — every one visited by our local team.' },
  { title: 'Plan your trip\nwith TripArro AI', sub: 'Ask in your own words. It finds stays, checks live dates and books when you say yes.' },
  { title: 'Travel together\nwith family & friends', sub: 'Make a group trip, share bookings and pick places on the map together.' },
];

export default function Welcome({ welcome, onEmail, onExplore, onPage }: { welcome: J | null; onEmail: () => void; onExplore: () => void; onPage: (slug: string) => void }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const zoom = useRef(new Animated.Value(1)).current;

  useEffect(() => {  // each slide shows for 4.5 seconds (timed by the clock, so it also works with animations switched off)
    const start = Date.now();
    fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 4500);
      setProgress(p);
      if (p >= 1) { clearInterval(t); setPage((x) => (x + 1) % slides.length); }
    }, 40);
    return () => clearInterval(t);
  }, [page]);
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(zoom, { toValue: 1.08, duration: 16000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(zoom, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }),
    ])).start();
  }, []);

  const bg = str(welcome, 'background');
  const s = slides[page];
  return (
    <Modal visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onExplore}>
      <View style={{ flex: 1, backgroundColor: '#8FD3F4' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
          {bg ? <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <HillCountry />}
        </Animated.View>
        <LinearGradient style={StyleSheet.absoluteFill} colors={['#BFE6FACC', '#FFFFFF00', '#00000000', '#081A24D9']} locations={[0, 0.42, 0.62, 1]} />
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: 24, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', width: 220, marginTop: 14, gap: 6 }}>
            {slides.map((_, i) => (
              <Pressable key={i} onPress={() => setPage(i)} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: '#10203040', overflow: 'hidden' }}>
                <View style={{ width: `${(i < page ? 1 : i === page ? progress : 0) * 100}%`, height: 4, backgroundColor: '#14232E' }} />
              </Pressable>
            ))}
          </View>
          <View style={{ height: 30 }} />
          <CardFan cards={objs(welcome, 'cards')} />
          <View style={{ height: 26 }} />
          <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
            <Text style={{ fontFamily: Fonts.b, fontSize: 32, lineHeight: 38, color: '#14232E', textAlign: 'center' }}>{s.title}</Text>
            <Txt color="#2B3D48" center style={{ marginTop: 10 }}>{s.sub}</Txt>
          </Animated.View>
          <View style={{ flex: 1 }} />
          <Image source={require('../../assets/logo_white.png')} style={{ height: 40, width: 160 }} contentFit="contain" />
          <View style={{ height: 22 }} />
          <GoogleButton label="Continue with Google" onPress={async () => setErr(await startGoogleSignIn())} />
          <View style={{ height: 12 }} />
          <Pressable onPress={onEmail} style={{ alignSelf: 'stretch', height: 56, borderRadius: 28, backgroundColor: '#D93338', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mail-outline" color="#fff" />
            <Txt k="titleMedium" color="#fff">  Continue with email</Txt>
          </Pressable>
          {err ? <Txt k="bodySmall" color="#FFD6D6" style={{ marginTop: 8 }}>{err}</Txt> : null}
          <Pressable onPress={onExplore} style={{ marginTop: 14, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Txt k="titleMedium" color="#fff">Look around first</Txt>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Icon name="lock-outline" size={14} color="#FFFFFFCC" />
            <Txt k="labelMedium" color="#FFFFFFCC"> We never share your details</Txt>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 16 }}>
            <Txt k="labelMedium" color="#FFFFFFCC" style={{ textDecorationLine: 'underline' }} onPress={() => onPage('cancellation')}>Cancellation policy</Txt>
            <Txt k="labelMedium" color="#FFFFFFCC"> & </Txt>
            <Txt k="labelMedium" color="#FFFFFFCC" style={{ textDecorationLine: 'underline' }} onPress={() => onPage('privacy')}>Privacy policy</Txt>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Three real stays as tilted photo cards, each with its place name. */
function CardFan({ cards }: { cards: J[] }) {
  if (!cards.length) return <View style={{ height: 150 }} />;
  const angles = [-10, 0, 10]; const shifts = [-96, 0, 96];
  return (
    <View style={{ alignSelf: 'stretch', height: 170, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 2, 1].filter((i) => i < cards.length).map((i) => {
        const c = cards[i];
        return (
          <View key={i} style={{ position: 'absolute', transform: [{ translateX: shifts[i] }, { translateY: i === 1 ? -6 : 8 }, { rotate: `${angles[i]}deg` }],
            borderRadius: 22, backgroundColor: '#fff', padding: 5, elevation: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Image source={{ uri: text(c, 'image') }} style={{ width: 112, height: 146, borderRadius: 18, backgroundColor: '#DDEFF7' }} contentFit="cover" />
            {text(c, 'label') ? (
              <View style={{ position: 'absolute', left: 12, bottom: 12, borderRadius: 50, backgroundColor: '#FFFFFFF2', borderWidth: 1, borderColor: '#00000014', paddingHorizontal: 9, paddingVertical: 3, maxWidth: 100 }}>
                <Txt k="labelMedium" color="#14232E" numberOfLines={1}>{text(c, 'label')}</Txt>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** A drawn hill-country view (sky, misty blue hills, tea-green slopes, a lake) — used until the admin sets a photo. */
function HillCountry() {
  const { width: w, height: h } = useWindowDimensions();
  const H = h + 80;
  const ridge = (base: number, amp: number, seed: number) => {
    let d = `M0 ${H} L0 ${H * base}`;
    for (let x = 0; x <= w + 20; x += w / 40) {
      const y = H * base - amp * H * (0.55 + 0.45 * Math.sin((x / w) * 6.3 + seed) * Math.cos((x / w) * 2.1 + seed * 1.7));
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d + ` L${w} ${H} Z`;
  };
  const pine = (cx: number, base: number, s: number) => `M${cx} ${base - s * 2.6} L${cx - s * 0.75} ${base} L${cx + s * 0.75} ${base} Z`;
  return (
    <Svg width={w} height={H}>
      <Defs>
        <SvgGrad id="sky" x1="0" y1="0" x2="0" y2={H * 0.62} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#7CC8F0" /><Stop offset="0.5" stopColor="#BFE6FA" /><Stop offset="1" stopColor="#F3E9D2" />
        </SvgGrad>
        <SvgGrad id="mist" x1="0" y1={H * 0.52} x2="0" y2={H * 0.66} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fff" stopOpacity="0" /><Stop offset="0.5" stopColor="#fff" stopOpacity="0.33" /><Stop offset="1" stopColor="#fff" stopOpacity="0" />
        </SvgGrad>
        <SvgGrad id="lake" x1="0" y1={H * 0.8} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#3FA7B5" /><Stop offset="0.5" stopColor="#1C6F80" /><Stop offset="1" stopColor="#0E3F4C" />
        </SvgGrad>
      </Defs>
      <Rect width={w} height={H} fill="url(#sky)" />
      <Circle cx={w * 0.78} cy={H * 0.3} r={w * 0.22} fill="#FFF6D8" fillOpacity={0.4} />
      <Circle cx={w * 0.78} cy={H * 0.3} r={w * 0.09} fill="#FFF3C8" />
      <Path d={ridge(0.56, 0.1, 0.6)} fill="#9DBFD6" />
      <Path d={ridge(0.62, 0.09, 2.1)} fill="#6E9FB8" />
      <Rect y={H * 0.52} width={w} height={H * 0.14} fill="url(#mist)" />
      <Path d={ridge(0.7, 0.08, 4.0)} fill="#3F8F5F" />
      <Path d={ridge(0.76, 0.06, 5.3)} fill="#2F7A4C" />
      {Array.from({ length: 9 }, (_, i) => { const y = H * (0.74 + i * 0.012); return <Line key={'t' + i} x1={w * (0.05 + i * 0.02)} y1={y} x2={w * (0.55 - i * 0.015)} y2={y + H * 0.01} stroke="#fff" strokeOpacity={0.16} strokeWidth={1.2} />; })}
      <Rect y={H * 0.8} width={w} height={H * 0.2} fill="url(#lake)" />
      {Array.from({ length: 7 }, (_, i) => { const y = H * (0.83 + i * 0.022); return <Line key={'l' + i} x1={w * (0.2 + (i % 3) * 0.12)} y1={y} x2={w * (0.42 + (i % 3) * 0.12)} y2={y} stroke="#fff" strokeOpacity={0.2} strokeWidth={1} />; })}
      {([[0.04, 18], [0.11, 13], [0.17, 15], [0.86, 17], [0.93, 20]] as const).map(([x, s], i) => <Path key={'p' + i} d={pine(w * x, H * 0.8, s)} fill="#1D5A3A" />)}
    </Svg>
  );
}
