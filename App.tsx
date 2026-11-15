/*
 * TripArro app shell: the screens (same addresses as the website links), the bottom tabs, the Group trips button,
 * the welcome screen when nobody is signed in, popups, links that open the app, and phone notifications.
 */
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState as RNAppState, Easing, Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from './src/core/api';
import { AppState, useAppState, useSession } from './src/core/state';
import * as Notifier from './src/core/notifier';
import { int } from './src/core/json';
import { Brand } from './src/theme';
import { Icon, Txt } from './src/ui/kit';
import { Nav, ROUTES, TABS, navRef } from './src/nav';
import { flushPendingLink, handleIncomingLink } from './src/links';
import { SCREENS } from './src/screens/registry';
import Welcome from './src/screens/Welcome';
import { OfferPopup, RewardPopup } from './src/screens/Popups';

SplashScreen.preventAutoHideAsync().catch(() => {});
const Stack = createNativeStackNavigator();

const TAB_INFO: Record<string, [string, string, string]> = {
  explore: ['Explore', 'explore', 'explore'],
  pets: ['Pets', 'pets', 'pets'],
  trips: ['Trips', 'luggage', 'luggage'],
  ai: ['AI', 'auto-awesome', 'auto-awesome'],
  account: ['Account', 'account-circle', 'account-circle'],
};

/** Screens with a web page inside (payment, website pages, PDFs): they appear at once, without a slide. */
const isWebRoute = (r: string) => r === 'pay' || r.startsWith('site?') || r.startsWith('pdf?');

/** The colour behind the status bar: the colour of the screen's own header. */
function topColor(r: string) {
  if (r.startsWith('photo') || r.startsWith('video') || r.startsWith('property/') || r.startsWith('petlisting/') || r.startsWith('place/')) return '#000000';
  return Brand.Matte;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
      <Shell />
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const unread = useAppState('unread');
  const [current, setCurrent] = useState('explore');
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [startLink, setStartLink] = useState<string | null | undefined>(undefined);

  // Start: session, the link that opened the app, notification channels, the background check
  useEffect(() => {
    Api.refreshSession().catch(() => {}).finally(() => SplashScreen.hideAsync().catch(() => {}));
    Linking.getInitialURL().then((u) => { setStartLink(u); if (u) handleIncomingLink(u); }).catch(() => setStartLink(null));
    const sub = Linking.addEventListener('url', (e) => handleIncomingLink(e.url));
    Notifier.createChannels().catch(() => {});
    Notifier.scheduleBackground();
    // a tapped notification: mark it read and open its screen
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const d: any = r.notification.request.content.data || {};
      if (d.id) Api.post('notifications/read', { id: d.id }).then((j) => Notifier.setUnread(int(j, 'unread'))).catch(() => {});
      if (d.link) handleIncomingLink(String(d.link).startsWith('/') ? Api.url(d.link) : d.link); else Nav.navigate('notifications');
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const tap = Notifications.addNotificationResponseReceivedListener(open);
    return () => { sub.remove(); tap.remove(); };
  }, []);

  // Signed in: check for updates now (badge), and ask once for permission to show phone notifications
  const uid = session?.user?.id;
  useEffect(() => {
    if (!uid) return;
    Notifier.check(false).catch(() => {});
    (async () => {
      if (await AsyncStorage.getItem('asked_notify')) return;
      await AsyncStorage.setItem('asked_notify', '1');
      Notifier.askPermission().catch(() => {});
    })();
    // while the app is open: look for new notifications (trip posts, messages) every 30 seconds, so they pop up with sound
    let active = RNAppState.currentState === 'active';
    const t = setInterval(() => { if (active) Notifier.check().catch(() => {}); }, 30_000);
    const s = RNAppState.addEventListener('change', (st) => { const was = active; active = st === 'active'; if (active && !was) Notifier.check().catch(() => {}); });
    return () => { clearInterval(t); s.remove(); };
  }, [uid]);

  const isTab = (TABS as readonly string[]).includes(current);
  const showWelcome = !welcomeDone && !!session && !session.user && startLink === null && current === 'explore';

  return (
    <View style={{ flex: 1, backgroundColor: Brand.Page }}>
      <StatusBar style="light" />
      <GlassBackdrop />
      <View style={{ height: insets.top, backgroundColor: topColor(current) }} />
      <View style={{ flex: 1 }}>
        <NavigationContainer
          ref={navRef}
          theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' } }}
          onReady={() => { setCurrent(Nav.current()); flushPendingLink(); }}
          onStateChange={() => setCurrent(Nav.current())}
        >
          <Stack.Navigator initialRouteName="explore" screenOptions={({ route }) => ({
            headerShown: false, contentStyle: { backgroundColor: 'transparent' },
            animation: isWebRoute(route.name) ? 'none' : (TABS as readonly string[]).includes(route.name) ? 'fade' : 'slide_from_right',
          })}>
            {ROUTES.map((r) => <Stack.Screen key={r} name={r} component={SCREENS[r]} />)}
          </Stack.Navigator>
        </NavigationContainer>
        {['explore', 'pets', 'account'].includes(current) ? <GroupTripsFab onPress={() => Nav.navigate('groups')} /> : null}
      </View>
      {isTab ? <TabBar current={current} unread={unread} bottom={insets.bottom} /> : <View style={{ height: insets.bottom }} />}
      {showWelcome ? (
        <Welcome welcome={session?.welcome || null}
          onEmail={() => { setWelcomeDone(true); Nav.navigate('login'); }}
          onExplore={() => setWelcomeDone(true)}
          onPage={(slug) => { setWelcomeDone(true); Nav.navigate('page/' + slug); }} />
      ) : null}
      <OfferPopup offer={session?.user || welcomeDone ? session?.offerPopup || null : null} open={(l) => Nav.openLink(l.startsWith('/') ? Api.url(l) : l)} />
      <RewardPopup reward={session?.user?.reward || null} openWallet={() => Nav.navigate('wallet')} />
    </View>
  );
}

function TabBar({ current, unread, bottom }: { current: string; unread: number; bottom: number }) {
  return (
    <View style={{ paddingBottom: bottom, backgroundColor: 'rgba(255,255,255,0.86)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.Line, flexDirection: 'row' }}>
      {TABS.map((t) => {
        const [label, icon] = TAB_INFO[t];
        const on = current === t;
        return (
          <Pressable key={t} onPress={() => (t === 'explore' ? Nav.home() : Nav.navigate(t))} style={{ flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t === 'account' && unread > 0 ? `${label}, ${unread} new` : label}>
            <View style={{ width: 60, height: 32, borderRadius: 16, backgroundColor: on ? Brand.Sun : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} color={on ? Brand.SunInk : Brand.Muted} size={24} />
              {t === 'account' && unread > 0 ? (
                <View style={{ position: 'absolute', top: -2, right: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Brand.Coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Txt k="labelSmall" color="#fff">{unread > 99 ? '99+' : unread}</Txt>
                </View>
              ) : null}
            </View>
            <Txt k="labelMedium" semi={on} color={on ? Brand.Blue : Brand.Muted} style={{ marginTop: 4 }}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Group trips, one tap away from the main screens: a round red button with the TripArro mark. */
export function GroupTripsFab({ onPress }: { onPress: () => void }) {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([0, 1].map(() => Animated.sequence([Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }), Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true })]))).start();
  }, []);
  return (
    <View style={{ position: 'absolute', right: 16, bottom: 16, width: 68, height: 68, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 62, height: 62, borderRadius: 31, backgroundColor: '#E8452F',
        opacity: ring.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.45, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] }} />
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Group trips"
        style={{ width: 62, height: 62, borderRadius: 31, elevation: 12, shadowColor: Brand.Matte, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
        <LinearGradient colors={[Brand.Matte, '#E0182D', '#E8452F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: 31, borderWidth: 2, borderColor: '#FFFFFF55', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('./assets/logo_mark_white.png')} style={{ width: 46, height: 46 }} contentFit="contain" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/** The colour backdrop: warm cream with soft red, sun-yellow and sky blobs drifting slowly (cards are frosted glass over it). */
function GlassBackdrop() {
  const { width: w, height: h } = useWindowDimensions();
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: true }),
    ])).start();
    loop(a, 18000); loop(b, 24000);
  }, []);
  const blob = (cx: [number, number], cy: [number, number], r: number, c: string, vx: Animated.Value, vy: Animated.Value, k: number) => (
    <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', left: -r, top: -r, width: r * 2, height: r * 2,
      transform: [{ translateX: vx.interpolate({ inputRange: [0, 1], outputRange: [w * cx[0], w * cx[1]] }) }, { translateY: vy.interpolate({ inputRange: [0, 1], outputRange: [h * cy[0], h * cy[1]] }) }] }}>
      <RadialBlob color={c} size={r * 2} />
    </Animated.View>
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#FFF4EE', '#FDF1E4', '#F2F4FA']} style={StyleSheet.absoluteFill} />
      {blob([0.15, 0.4], [0.12, 0.2], w * 0.75, '#FF6A5C', a, b, 1)}
      {blob([0.95, 0.65], [0.3, 0.4], w * 0.7, '#FFC72C', b, a, 2)}
      {blob([0.25, 0.45], [0.62, 0.54], w * 0.8, '#7CC8F0', b, a, 3)}
      {blob([0.85, 0.65], [0.88, 0.83], w * 0.7, '#D7192A', a, b, 4)}
    </View>
  );
}

import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
function RadialBlob({ color, size }: { color: string; size: number }) {
  const id = 'g' + color.slice(1);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.36} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}
