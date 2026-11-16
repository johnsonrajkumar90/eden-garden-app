// The guest's TripArro wallet (balance, how rewards are earned, refer & earn, history) and notification settings.
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, errorText } from '../core/api';
import { useLoader } from '../core/state';
import { J, bool, num, obj, objs, str, text } from '../core/json';
import * as Notifier from '../core/notifier';
import { Brand } from '../theme';
import { BackBar, ErrorBox, Gap, Icon, Loading, Notice, PrimaryButton, Txt, money, shareLink, st } from '../ui/kit';
import { Nav } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

export function WalletScreen() {
  const l = useLoader(() => Api.get('wallet'));
  const w = l.data;
  const r = obj(w, 'rules') || {};
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="My wallet" onBack={Nav.back} />
      {!w && l.loading ? <Loading /> : !w ? <ErrorBox message={l.error || 'Could not load your wallet.'} onRetry={l.reload} /> : (
        <FlatList data={objs(w, 'items')} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: DOCK_SPACE }}
          ListHeaderComponent={<View style={{ gap: 12, marginBottom: 12 }}>
            <LinearGradient colors={['#161616', '#2A2A2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20 }}>
              <View style={st.row}><Icon name="account-balance-wallet" color="#fff" /><Txt bold color="#FFE3DE">  TripArro wallet</Txt></View>
              <Txt k="displaySmall" bold color="#fff">{money(num(w, 'balance'))}</Txt>
              <Txt color="#FFE3DE">Rewards earned so far: {money(num(w, 'rewards_earned'))}</Txt>
            </LinearGradient>
            <ReferCard />
            {bool(w, 'on') ? (
              <View style={{ borderRadius: 18, backgroundColor: '#fff', padding: 16 }}>
                <Txt bold>How you earn</Txt>
                {(num(r, 'signup') || 0) > 0 ? <Txt>🎁 {money(num(r, 'signup'))} when you sign up (after confirming your email)</Txt> : null}
                {(num(r, 'refer') || 0) > 0 ? <Txt>🤝 {money(num(r, 'refer'))} for every friend you invite who completes a stay</Txt> : null}
                {(num(r, 'first_booking') || 0) > 0 ? <Txt>🏡 {money(num(r, 'first_booking'))} after {text(r, 'booking_mode') === 'first' ? 'your first stay' : 'every stay'} — added once you have checked out</Txt> : null}
                <Gap h={6} />
                <Txt k="bodySmall" color={Brand.Muted}>{text(r, 'text')}</Txt>
              </View>
            ) : <Notice text="Wallet rewards are paused right now. Your balance is kept." />}
            <Txt bold>History</Txt>
          </View>}
          ListEmptyComponent={<Txt color={Brand.Muted}>Nothing yet.</Txt>}
          renderItem={({ item: i }) => {
            const amt = num(i, 'amount') || 0;
            return (
              <View style={[st.row, { borderRadius: 16, backgroundColor: '#fff', padding: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Txt bold>{text(i, 'label')}</Txt>
                  <Txt k="bodySmall" color={Brand.Muted}>{[str(i, 'note'), text(i, 'date').slice(0, 16).replace('T', ' ')].filter(Boolean).join(' · ')}</Txt>
                </View>
                <Txt bold color={amt >= 0 ? Brand.TealDark : Brand.Danger}>{(amt >= 0 ? '+' : '−') + money(Math.abs(amt))}</Txt>
              </View>
            );
          }} />
      )}
    </View>
  );
}

/** Refer & earn in the app: the guest's invite link, a share button, how it works and how many friends joined. */
function ReferCard() {
  const l = useLoader(() => Api.get('refer'));
  const r = l.data;
  if (!r || !bool(r, 'on') || !str(r, 'link')) return null;
  const friendTotal = (num(r, 'signup_reward') || 0) + (num(r, 'friend_gets') || 0);
  return (
    <View style={{ borderRadius: 20, backgroundColor: Brand.SunSoft, padding: 16 }}>
      <Txt k="titleMedium" bold color={Brand.SunInk}>🎁 Refer & earn {money(num(r, 'you_get'))}</Txt>
      <Txt color={Brand.SunInk}>Invite friends with your link. They start with {money(friendTotal)} in their wallet, and you get {money(num(r, 'you_get'))} when they complete their first stay.</Txt>
      <Gap h={8} />
      <Txt bold>Your code: {text(r, 'code')}</Txt>
      <Gap h={8} />
      <PrimaryButton text="Share my invite link" onPress={() => shareLink(text(r, 'share_text'), text(r, 'link'))} />
      <Gap h={8} />
      <Txt k="bodySmall" color={Brand.InkSoft}>1. Share your link  ·  2. Your friend signs up and confirms their email  ·  3. After their first stay (check-out) you get the bonus  ·  Wallet pays up to {Math.round(num(r, 'wallet_max_percent') || 50)}% of a homestay booking</Txt>
      <Gap h={6} />
      <Txt k="labelLarge">{r.invited || 0} invited · {r.stayed || 0} stayed · {money(num(r, 'earned'))} earned</Txt>
    </View>
  );
}

/** Which notifications reach the phone: guests arriving today / tomorrow, messages, bookings… (saved on the website). */
export function NotifyPrefsScreen() {
  const l = useLoader(async () => objs(await Api.get('notify-prefs'), 'topics'));
  const [topics, setTopics] = useState<J[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [snd, setSnd] = useState(true);
  useEffect(() => { Notifier.canPost().then(setAllowed); Notifier.soundOn().then(setSnd); }, []);
  const list = topics || l.data;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Notification settings" onBack={Nav.back} />
      {!list && l.loading ? <Loading /> : !list ? <ErrorBox message={l.error || 'Could not load your settings.'} onRetry={l.reload} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: DOCK_SPACE }}>
          {!allowed ? <Notice tone="warn" text="Notifications are switched off for TripArro on this phone — allow them in the phone's settings to get these." /> : null}
          <Txt k="bodySmall" color={Brand.Muted}>Choose what reaches your phone. Everything still shows in Notifications in the app.</Txt>
          <View style={[st.row, { borderRadius: 18, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10 }]}>
            <View style={{ flex: 1 }}><Txt semi>Sound</Txt><Txt k="labelSmall" color={Brand.Muted}>Play a sound for new messages and updates</Txt></View>
            <Switch value={snd} onValueChange={async (v) => { setSnd(v); await Notifier.setSound(v); if (v) Notifier.chime(); }} trackColor={{ true: Brand.Teal }} />
          </View>
          <View style={{ borderRadius: 18, backgroundColor: '#fff' }}>
            {list.map((t, i) => (
              <View key={text(t, 'key')}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: Brand.Line }} /> : null}
                <View style={[st.row, { paddingHorizontal: 16, paddingVertical: 10 }]}>
                  <Txt semi style={{ flex: 1 }}>{text(t, 'label')}</Txt>
                  <Switch value={bool(t, 'on')} trackColor={{ true: Brand.Teal }} onValueChange={async (on) => {
                    const key = text(t, 'key');
                    setTopics(list.map((x) => (text(x, 'key') === key ? { ...x, on } : x)));
                    try { setTopics(objs(await Api.post('notify-prefs', { [key]: on }), 'topics')); setErr(null); } catch (e) { setErr(errorText(e)); }
                  }} />
                </View>
              </View>
            ))}
          </View>
          {err ? <Notice text={err} tone="bad" /> : null}
          <Txt k="labelSmall" color={Brand.Muted}>Guests arriving today and tomorrow are sent in the morning (Admin → Notifications sets the hour). The app checks about every 15 minutes.</Txt>
        </ScrollView>
      )}
    </View>
  );
}
