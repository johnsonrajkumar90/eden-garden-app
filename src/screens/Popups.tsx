/*
 * Popups over the whole app: the admin's offer picture (shown once, then again after the admin's number of days) and
 * "You got ₹200!" when a reward lands in the wallet (shown once per reward).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { J, int, num, str, text } from '../core/json';
import { Brand, Fonts } from '../theme';
import { Icon, LinkButton, PrimaryButton, Txt } from '../ui/kit';

export function OfferPopup({ offer, open }: { offer: J | null; open: (link: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(1);
  const shown = useRef(false);
  const id = text(offer, 'id');
  useEffect(() => {
    if (!offer || !id || shown.current) return;
    let alive = true;
    (async () => {
      const key = `offer_seen_${id}`;
      const last = Number((await AsyncStorage.getItem(key)) || 0);
      const days = int(offer, 'days', 1);
      if (last > 0 && days > 0 && Date.now() - last < days * 86_400_000) return;
      // load the picture first: the popup opens complete, and a picture that can't load never leaves an empty dialog
      try { const ok = await Image.prefetch(text(offer, 'image')); if (!ok) return; } catch { return; }
      await new Promise((r) => setTimeout(r, 600));
      if (!alive) return;
      shown.current = true; setVisible(true);
      await AsyncStorage.setItem(key, String(Date.now()));
    })();
    return () => { alive = false; };
  }, [id]);
  if (!visible || !offer) return null;
  const link = str(offer, 'link');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }} onPress={() => setVisible(false)}>
        <Pressable onPress={() => { if (link) { setVisible(false); open(link); } }}>
          <Image source={{ uri: text(offer, 'image') }} onLoad={(e) => e.source.width && setRatio(e.source.width / e.source.height)} style={{ width: '100%', aspectRatio: ratio, borderRadius: 26 }} contentFit="cover" accessibilityLabel="Offer" />
          <Pressable onPress={() => setVisible(false)} style={{ position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Close">
            <Icon name="close" />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const COLORS = [Brand.Sun, Brand.Blue, Brand.Coral, Brand.Teal];

export function RewardPopup({ reward, openWallet }: { reward: J | null; openWallet: () => void }) {
  const id = int(reward, 'id');
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const coin = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;
  const bits = useRef(Array.from({ length: 36 }, () => [Math.random(), Math.random(), Math.floor(Math.random() * 4)] as const)).current;
  useEffect(() => {
    if (id <= 0) return;
    (async () => {
      if (await AsyncStorage.getItem(`reward_seen_${id}`)) return;
      await AsyncStorage.setItem(`reward_seen_${id}`, '1');
      setVisible(true);
    })();
  }, [id]);
  useEffect(() => {
    if (!visible) return;
    const amount = num(reward, 'amount') || 0;
    Animated.spring(coin, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(fall, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true })).start();
    const start = Date.now() + 350;
    const t = setInterval(() => {
      const p = Math.max(0, Math.min(1, (Date.now() - start) / 1200));
      setCount(Math.round(amount * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [visible]);
  if (!visible || !reward) return null;
  const close = () => setVisible(false);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ borderRadius: 28, backgroundColor: '#fff', overflow: 'hidden' }}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {bits.map(([x, s, c], i) => (
              <Animated.View key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: 0, width: 5, height: 9, backgroundColor: COLORS[c], opacity: 0.85,
                // falls from its own start height to the bottom, then wraps round to the top
                transform: [{ translateY: fall.interpolate({ inputRange: [0, 1 - s, Math.min(1, 1 - s + 0.001), 1], outputRange: [s * 460, 460, 0, s * 460] }) },
                  { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: [`${s * 360}deg`, `${s * 360 + 540}deg`] }) }] }} />
            ))}
          </View>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale: coin }] }}>
              <LinearGradient colors={['#FFE27A', Brand.Sun, Brand.SunDark]} style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 56, fontFamily: Fonts.b, color: Brand.SunInk }}>₹</Text>
              </LinearGradient>
            </Animated.View>
            <Txt k="headlineMedium" bold center style={{ marginTop: 16 }}>You got ₹{count}!</Txt>
            <Txt k="titleMedium" color={Brand.Blue} center style={{ marginTop: 4 }}>{text(reward, 'title') || 'Added to your TripArro wallet'}</Txt>
            <Txt color={Brand.Muted} center style={{ marginTop: 8 }}>{text(reward, 'text') || 'Use it on your next stay — it is taken off the price when you book.'}</Txt>
            <View style={{ height: 18 }} />
            <PrimaryButton text="See my wallet" onPress={() => { close(); openWallet(); }} style={{ alignSelf: 'stretch' }} />
            <LinkButton text="Later" color={Brand.InkSoft} onPress={close} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
