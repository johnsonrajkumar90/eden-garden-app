// Account: sign in, profile, pets, dashboards (hosts, resort owners, pet hosts, partners, admin), help and settings.
import React, { useEffect } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Api } from '../core/api';
import { useAppState, useSession } from '../core/state';
import * as Notifier from '../core/notifier';
import { Brand } from '../theme';
import { Card, Gap, Icon, LinkButton, PrimaryButton, Txt, money, st, TopBar } from '../ui/kit';
import { RED_GRAD } from '../ui/cards';
import { dial } from '../ui/sheets';
import { Nav } from '../nav';

const roleNames: Record<string, string> = { guest: 'Guest', host: 'Host', resort: 'Resort owner', admin: 'Admin', pethost: 'Pet host', referral: 'TripArro Agent', lister: 'Property TripArro Agent' };

function Item({ icon, text, sub, danger, onPress }: { icon: string; text: string; sub?: string | null; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[st.row, { paddingVertical: 11 }]} accessibilityRole="button">
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: danger ? Brand.DangerSoft : Brand.Sky, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={danger ? Brand.Danger : Brand.Blue} />
      </View>
      <View style={{ flex: 1, paddingLeft: 14 }}>
        <Txt k="titleSmall" color={danger ? Brand.Danger : Brand.Ink}>{text}</Txt>
        {sub ? <Txt k="bodySmall" color={Brand.Muted}>{sub}</Txt> : null}
      </View>
      {!danger ? <Icon name="keyboard-arrow-right" size={20} color={Brand.Muted} /> : null}
    </Pressable>
  );
}
const Line = () => <View style={{ height: 1, backgroundColor: Brand.Line }} />;

export default function AccountScreen() {
  const session = useSession();
  const unread = useAppState('unread');
  // Someone may have signed in on a web page (one-time code, Google): read the session again
  useEffect(() => { Api.refreshSession().catch(() => {}); }, []);
  const u = session?.user;
  const s = session;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      <TopBar style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}><Txt k="displaySmall" color="#fff">Account</Txt></TopBar>
      <View style={{ margin: 16, marginBottom: 0, borderRadius: 28, backgroundColor: Brand.Blue, overflow: 'hidden', padding: 18 }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -50, bottom: -70, width: 150, height: 130, borderTopLeftRadius: 75, borderTopRightRadius: 75, backgroundColor: '#FF7A6E' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 18, top: 16, width: 14, height: 14, borderRadius: 7, backgroundColor: Brand.Sun }} />
        {!u ? <Txt color="#ffffffcc" style={{ paddingRight: 70 }}>Sign in to book, see your trips and pets, and open your dashboard if you host.</Txt> : (
          <>
            <View style={st.row}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleLarge" color={Brand.Ink}>{u.initials.slice(0, 2).toUpperCase()}</Txt></View>
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Txt k="titleLarge" color="#fff">{u.name}</Txt>
                <Txt k="bodySmall" color="#ffffffb3">{u.email}</Txt>
                <View style={{ alignSelf: 'flex-start', marginTop: 6, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 3 }}><Txt k="labelMedium" color={Brand.Sun}>{roleNames[u.role] || u.role}</Txt></View>
              </View>
            </View>
            {['host', 'resort', 'pethost', 'referral', 'admin'].includes(u.role) ? (
              <>
                <Gap />
                <PrimaryButton icon="dashboard" text={u.role === 'referral' ? 'Open my TripArro Agent portal' : u.role === 'admin' ? 'Open the admin dashboard' : 'Open my hosting'} onPress={() => Nav.navigate('hosting')} />
                <Txt k="bodySmall" color="#ffffffb3" style={{ marginTop: 8 }}>{u.role === 'referral' ? 'Your bookings and commission.' : u.role === 'admin' ? "Today's and tomorrow's arrivals, requests, what is waiting for you, and guest chats." : 'Requests, check-ins, calendar, prices, money and guest chats — all in the app.'}</Txt>
              </>
            ) : null}
          </>
        )}
      </View>
      <View style={{ padding: 16 }}>
        {!u ? (
          <Card>
            <Txt k="titleLarge">Welcome to TripArro</Txt>
            <Gap h={10} />
            <PrimaryButton text="Sign in" onPress={() => Nav.navigate('login')} />
            <Gap h={8} />
            <LinkButton text="New here? Create an account" onPress={() => Nav.navigate('signup')} />
          </Card>
        ) : (
          <Card>
            <Item icon="notifications-none" text={unread > 0 ? `Notifications (${unread} new)` : 'Notifications'} sub="Booking updates, check-in and Pet Stay Diary" onPress={() => Nav.navigate('notifications')} />
            <Line />
            <Item icon="chat-bubble-outline" text="Messages" sub="Your chats with hosts" onPress={() => Nav.navigate('messages')} />
            <Line />
            <Item icon="person-outline" text="Profile and password" onPress={() => Nav.navigate('profile')} />
            <Line />
            <Item icon="notifications-active" text="Notification settings" sub={u.role === 'guest' ? 'Choose what reaches your phone' : 'Guests arriving today / tomorrow, messages, bookings'} onPress={() => Nav.navigate('notifyprefs')} />
            {u.role === 'guest' ? <><Line /><Item icon="account-balance-wallet" text="My wallet" sub={u.wallet !== null ? `Balance ${money(u.wallet)} — use it on your next booking` : 'Rewards for your bookings'} onPress={() => Nav.navigate('wallet')} /></> : null}
            <Line />
            <Item icon="pets" text="My pets" sub="Care notes the host sees when you book" onPress={() => Nav.navigate('mypets')} />
            <Line />
            <Item icon="favorite-border" text="Saved pet hosts" onPress={() => Nav.navigate('saved')} />
          </Card>
        )}
        <Gap />
        <Card>
          <Item icon="home" text="List your property" sub="A homestay, villa or resort — free to join" onPress={() => Nav.navigate('become-host')} />
          <Line />
          <Item icon="pets" text="Become a pet host" sub="Board pets and earn from home" onPress={() => Nav.navigate('become-pet-host')} />
          <Line />
          <Item icon="menu-book" text="Pet services user manual" sub="PDF" onPress={() => Nav.openPdf('assets/manuals/pet-boarding-manual.pdf', 'Pet services user manual')} />
        </Card>
        <Gap />
        <Card>
          {s?.supportPhone ? <><Item icon="call" text="Call customer care" sub={s.supportHours || s.supportPhone} onPress={() => dial(s.supportPhone!)} /><Line /></> : null}
          {s?.supportWhatsapp ? <><Item icon="support-agent" text="WhatsApp us" onPress={() => Linking.openURL('https://wa.me/' + s.supportWhatsapp).catch(() => {})} /><Line /></> : null}
          {s?.supportEmail ? <><Item icon="mail-outline" text="Email us" sub={s.supportEmail} onPress={() => Linking.openURL('mailto:' + s.supportEmail).catch(() => {})} /><Line /></> : null}
          <Item icon="policy" text="Privacy policy" onPress={() => Nav.navigate('page/privacy')} />
          <Line />
          <Item icon="badge" text="Cancellation policy" onPress={() => Nav.navigate('page/cancellation')} />
          {u ? (
            <>
              <Line />
              <Item icon="delete-outline" text="Delete my account" danger onPress={() => Nav.navigate('delete-account')} />
              <Line />
              <Item icon="logout" text="Sign out" danger onPress={async () => { await Api.logout(); await Notifier.reset(); }} />
            </>
          ) : null}
        </Card>
        <Txt k="bodySmall" color={Brand.Muted} style={{ padding: 16 }}>TripArro for {Platform.OS === 'ios' ? 'iPhone' : 'Android'} · version {Constants.expoConfig?.version}</Txt>
      </View>
    </ScrollView>
  );
}
