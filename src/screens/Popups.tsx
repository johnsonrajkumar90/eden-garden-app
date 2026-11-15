/*
 * Popups over the whole app: the admin's offer picture (shown once, then again after the admin's number of days) and
 * "You got ₹200!" when a reward lands in the wallet (shown once per reward).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  const close = () => setVisible(false);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <BlurView intensity={30} tint="dark" style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(30,8,10,0.45)', justifyContent: 'center', padding: 22 }} onPress={close}>
          <PopIn>
            <Pressable onPress={() => {}} style={{ borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1.5, borderColor: '#fff', padding: 8, shadowColor: '#C8242B', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 }}>
              <Pressable onPress={() => { if (link) { close(); open(link); } }} accessibilityLabel="Offer">
                <Image source={{ uri: text(offer, 'image') }} onLoad={(e) => e.source.width && setRatio(e.source.width / e.source.height)} style={{ width: '100%', aspectRatio: ratio, borderRadius: 26 }} contentFit="cover" />
              </Pressable>
              <View style={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6 }}>
                {link ? <PrimaryButton text={text(offer, 'button') || 'Claim this offer'} icon="redeem" onPress={() => { close(); open(link); }} /> : null}
                <LinkButton text="Maybe later" color={Brand.InkSoft} onPress={close} />
              </View>
              <Pressable onPress={close} hitSlop={8} style={{ position: 'absolute', top: -10, right: -10, width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.Blue, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 18 }} accessibilityLabel="Close">
                <Icon name="close" color="#fff" size={20} />
              </Pressable>
            </Pressable>
          </PopIn>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

/** The popup card springs in (grows and rises a little). */
function PopIn({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>{children}</Animated.View>;
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
      <BlurView intensity={30} tint="dark" style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(30,8,10,0.45)', justifyContent: 'center', padding: 22 }}>
          <PopIn>
            <View style={{ borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden', shadowColor: '#C8242B', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 }}>
              {/* red-to-sun top with falling confetti and the gold coin */}
              <LinearGradient colors={['#C8242B', '#E8474B', '#FF8A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 190, alignItems: 'center', justifyContent: 'center' }}>
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {bits.map(([x, sp, c], i) => (
                    <Animated.View key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: 0, width: 6, height: 10, borderRadius: 2, backgroundColor: ['#FFE27A', '#FFFFFF', '#FFC72C', '#FFD3CF'][c], opacity: 0.9,
                      transform: [{ translateY: fall.interpolate({ inputRange: [0, 1 - sp, Math.min(1, 1 - sp + 0.001), 1], outputRange: [sp * 200, 200, 0, sp * 200] }) },
                        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: [`${sp * 360}deg`, `${sp * 360 + 540}deg`] }) }] }} />
                  ))}
                </View>
                <View pointerEvents="none" style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)' }} />
                <Animated.View style={{ transform: [{ scale: coin }, { rotate: coin.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) }] }}>
                  <LinearGradient colors={['#FFF1B0', Brand.Sun, Brand.SunDark]} style={{ width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.75)' }}>
                    <Text style={{ fontSize: 58, fontFamily: Fonts.b, color: Brand.SunInk, marginTop: -4 }}>₹</Text>
                  </LinearGradient>
                </Animated.View>
                <Pressable onPress={close} hitSlop={8} style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Close">
                  <Icon name="close" color="#fff" size={20} />
                </Pressable>
              </LinearGradient>
              <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18, alignItems: 'center' }}>
                <View style={{ borderRadius: 50, backgroundColor: Brand.SunSoft, paddingHorizontal: 12, paddingVertical: 4 }}><Txt k="labelMedium" bold color={Brand.SunInk}>🎁 {text(reward, 'title') || 'Added to your TripArro wallet'}</Txt></View>
                <Text style={{ fontFamily: Fonts.b, fontSize: 52, lineHeight: 60, color: Brand.Ink, marginTop: 10 }}>₹{count}</Text>
                <Txt k="titleMedium" center>is in your wallet</Txt>
                <Txt color={Brand.Muted} center style={{ marginTop: 6 }}>{text(reward, 'text') || 'Use it on your next stay — it is taken off the price when you book.'}</Txt>
                <View style={{ height: 18 }} />
                <PrimaryButton text="See my wallet" icon="account-balance-wallet" onPress={() => { close(); openWallet(); }} style={{ alignSelf: 'stretch' }} />
                <LinkButton text="Later" color={Brand.InkSoft} onPress={close} />
              </View>
            </View>
          </PopIn>
        </View>
      </BlurView>
    </Modal>
  );
}
