/*
 * My hosting — the whole hosting dashboard in the app (hosts, resort owners, pet hosts):
 * Today · Bookings (requests to approve, check-in / check-out) · Calendar (close dates, prices) ·
 * Listings (price, live / paused) · Money · Messages with guests. TripArro Agents see their portal.
 */
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LiquidLayer } from '../ui/liquid';
import { Api, ApiError, errorText } from '../core/api';
import { ForceHostCard } from './ForceSearch';
import { useAppState, useLoader, useSession } from '../core/state';
import { J, bool, int, num, obj, objs, str, strings, text } from '../core/json';
import { Brand } from '../theme';
import { Appear, Card, HeadButton, ColorHeader, EmptyBox, ErrorBox, Gap, Icon, Loading, Notice, OutlineButton, Photo, Pill, Press, PrimaryButton, SectionTitle, Txt, addDays, money, parseIso, plural, shortDate, st, today, TopBar, GlassSheen } from '../ui/kit';
import { Field, Stepper } from '../ui/inputs';
import { Dialog, Sheet, dial } from '../ui/sheets';
import { RED_GRAD, SUN_GRAD } from '../ui/cards';
import { Nav } from '../nav';
import { ChatList } from './Chat';
import { AllListingsCalendar, HostToolsTab, MonthHead, WeekHead, addMonths, leadDays, stateColor, thisMonth, weeks } from './HostTools';
import { CalDay, DayPills, LaneDay, LaneKey, LaneMonth, MonthMeter, MonthTitle, NightDay, NightKey, NightMonth, bookedPct, laneColor } from './HostCalendar';

const longDay = (iso: string) => parseIso(iso)?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) || iso;

export default function HostingScreen() {
  const s = useSession();
  const role = s?.user?.role || '';
  if (['host', 'resort', 'pethost', 'admin'].includes(role)) return <HostDashboard role={role} />;
  if (role === 'referral') return <AgentPortal />;
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="My hosting" sub={s?.user?.name} onBack={Nav.back} />
      <View style={{ padding: 16 }}>
        <Notice text="My hosting is for hosts, resort owners and pet hosts. List your property to get started." />
        <Gap /><PrimaryButton text="List your property" onPress={() => Nav.navigate('become-host')} />
      </View>
    </View>
  );
}

import { KycBanner } from './HostKyc';
import { DOCK_SPACE } from '../ui/dock';

/** Soft colours for the dashboard's tiles (one per idea, the same everywhere). */
export const PASTEL = {
  peach: ['#FFE9E1', '#C2410C'], mint: ['#DDF6E9', '#047857'], lavender: ['#EDE7FF', '#5B3FC4'], sky: ['#E1F0FF', '#1D5FB4'],
  butter: ['#FFF4C7', '#8A5A00'], rose: ['#FFE3E8', '#BE1840'],
} as const;
type Tone = keyof typeof PASTEL;

function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

function StatTile({ emoji, value, label, tone }: { emoji: string; value: string; label: string; tone: Tone }) {
  const [bg, fg] = PASTEL[tone];
  return (
    <View style={{ flex: 1, borderRadius: 22, backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 11, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}>
      <LiquidLayer waves={[{ color: fg + '14', h: 0.5, amp: 5, ms: 8000, reverse: true }, { color: fg + '1F', h: 0.32, amp: 5, ms: 5600 }]} />
      <Txt style={{ fontSize: 18 }}>{emoji}</Txt>
      <Txt k="titleLarge" color={fg} numberOfLines={1} style={{ marginTop: 2 }}>{value}</Txt>
      <Txt k="labelSmall" color={fg} numberOfLines={1} style={{ opacity: 0.85 }}>{label}</Txt>
    </View>
  );
}

function HostDashboard({ role }: { role: string }) {
  const pets = role === 'pethost';
  const tabs: [string, string, string, Tone][] = [['today', 'Today', 'wb-sunny', 'butter'], ['bookings', 'Bookings', 'event-note', 'sky']];
  if (!pets) tabs.push(['calendar', 'Calendar', 'calendar-month', 'mint']);
  tabs.push(['listings', pets ? 'Listings' : 'Stays', 'home', 'peach'], ['money', 'Money', 'account-balance-wallet', 'lavender']);
  if (!pets) tabs.push(['chats', 'Chats', 'chat-bubble-outline', 'rose']);
  tabs.push(['more', 'More', 'widgets', 'sky']);
  const [tab, setTab] = useState('today');
  const [tick, setTick] = useState(0);
  const home = useLoader(() => Api.get('hostapp/home'), [tick]);
  const h = home.data;
  const changed = () => setTick((t) => t + 1);
  const m = obj(h, 'month') || {};
  const name = (text(h, 'name') || Api.session?.user?.name || '').split(' ')[0];
  const title = pets ? 'Pet hosting' : role === 'resort' ? 'My resort' : role === 'admin' ? 'Admin dashboard' : 'My hosting';
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#E8474B', '#F2675A', '#FF9466']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
        <LiquidLayer waves={[{ color: 'rgba(255,255,255,0.12)', h: 0.5, amp: 9, ms: 10000, reverse: true, bob: 4 }, { color: 'rgba(150,12,24,0.16)', h: 0.34, amp: 10, ms: 7000, bob: 3 }, { color: 'rgba(255,255,255,0.10)', h: 0.2, amp: 6, ms: 5200, reverse: true }]} bubbles={6} />
        {/* soft bubbles */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: '#ffffff22' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 70, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFC72C55' }} />
        <View style={st.row}>
          <Pressable onPress={Nav.back} accessibilityLabel="Back" hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-back" size={18} color="#fff" /></Pressable>
          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Txt k="labelSmall" color="#FFE7E1">{greet()}{name ? `, ${name}` : ''} 👋</Txt>
            <Txt k="titleLarge" color="#fff" numberOfLines={1}>{title}</Txt>
          </View>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFC72C' }}>
            <Txt k="titleSmall" bold color={Brand.Blue}>{(name || '?').slice(0, 1).toUpperCase()}</Txt>
          </View>
        </View>
        {/* this month, at a glance */}
        <View style={{ flexDirection: 'row', marginTop: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', paddingVertical: 9 }}>
          {[['💰', money(num(m, 'earnings') || 0), `Earned · ${text(m, 'label', 'this month').split(' ')[0].slice(0, 3)}`], ['🧳', String(int(m, 'bookings')), 'Bookings'], [pets ? '🐾' : '🛏️', String(int(h, 'staying')), pets ? 'Pets now' : 'Staying now']].map(([e, v, l], i) => (
            <View key={l} style={{ flex: i ? 1 : 1.3, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: '#ffffff44' }}>
              <Txt k="titleMedium" bold color="#fff" numberOfLines={1}>{e} {v}</Txt>
              <Txt k="labelSmall" color="#FFE7E1" numberOfLines={1}>{l}</Txt>
            </View>
          ))}
        </View>
      </LinearGradient>
      <Gap h={8} />
      {role === 'host' ? <KycBanner /> : null}
      {/* the sections: one row of round icons, always all in view */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginBottom: 2, paddingVertical: 6, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', overflow: 'hidden' }}>
        <GlassSheen />
        {tabs.map(([k, label, icon, tone]) => {
          const on = tab === k;
          const badge = k === 'bookings' ? objs(h, 'requests').length : k === 'chats' ? int(h, 'unread_chats') : 0;
          const [bg, fg] = PASTEL[tone];
          return (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: on ? fg : bg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: on ? 1.06 : 1 }] }}>
                <Icon name={icon} size={20} color={on ? '#fff' : fg} />
                {badge > 0 ? <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Brand.Blue, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><Txt k="labelSmall" color="#fff" style={{ fontSize: 9, lineHeight: 11 }}>{badge > 9 ? '9+' : badge}</Txt></View> : null}
              </View>
              <Txt k="labelSmall" color={on ? Brand.Ink : Brand.Muted} style={{ marginTop: 3, fontSize: 10.5 }} numberOfLines={1}>{label}</Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'today' ? <TodayTab home={home} pets={pets} changed={changed} go={setTab} />
          : tab === 'bookings' ? <BookingsTab pets={pets} changed={changed} />
          : tab === 'calendar' ? <CalendarTab />
          : tab === 'listings' ? <ListingsTab pets={pets} changed={changed} />
          : tab === 'money' ? <MoneyTab />
          : tab === 'chats' ? <ChatsTab />
          : <HostToolsTab />}
      </View>
    </View>
  );
}

/** A heading with a little emoji bubble. */
function Head({ emoji, text: t, sub, tone = 'butter' }: { emoji: string; text: string; sub?: string; tone?: Tone }) {
  return (
    <View style={[st.row, { marginTop: 6, marginBottom: 10 }]}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: PASTEL[tone][0], alignItems: 'center', justifyContent: 'center' }}><Txt style={{ fontSize: 17 }}>{emoji}</Txt></View>
      <View style={{ flex: 1, paddingLeft: 10 }}><Txt k="titleLarge">{t}</Txt>{sub ? <Txt k="labelSmall" color={Brand.Muted}>{sub}</Txt> : null}</View>
    </View>
  );
}

/** Nothing to show — said kindly. */
function Quiet({ emoji, text: t }: { emoji: string; text: string }) {
  return (
    <View style={[st.row, { borderRadius: 20, backgroundColor: '#ffffffd9', borderWidth: 1, borderColor: '#F3E9E4', borderStyle: 'dashed', padding: 14, marginBottom: 6 }]}>
      <Txt style={{ fontSize: 22 }}>{emoji}</Txt><Txt k="bodyMedium" color={Brand.Muted} style={{ flex: 1, paddingLeft: 10 }}>{t}</Txt>
    </View>
  );
}

function QuickAction({ emoji, label, tone, onPress, badge }: { emoji: string; label: string; tone: Tone; onPress: () => void; badge?: number }) {
  const [bg] = PASTEL[tone];
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}><Press onPress={onPress} style={{ alignItems: 'center', width: '100%' }} accessibilityLabel={label}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <LiquidLayer style={{ borderRadius: 27 }} waves={[{ color: 'rgba(255,255,255,0.7)', h: 0.42, amp: 3, ms: 4600 }]} />
        <Txt style={{ fontSize: 22 }}>{emoji}</Txt>
        {badge ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Brand.Blue, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Txt k="labelSmall" color="#fff" style={{ fontSize: 9, lineHeight: 11 }}>{badge > 9 ? '9+' : badge}</Txt></View> : null}
      </View>
      <Txt k="labelSmall" color={Brand.InkSoft} center numberOfLines={2} style={{ marginTop: 5, fontSize: 10.5, width: '100%' }}>{label}</Txt>
    </Press></View>
  );
}

/* ---------- Today ---------- */
function TodayTab({ home, pets, changed, go }: { home: { data: J | null; loading: boolean; error: string | null; reload: () => void }; pets: boolean; changed: () => void; go: (t: string) => void }) {
  const h = home.data;
  if (!h && home.loading) return <Loading />;
  if (!h) return <View style={{ padding: 16 }}><ErrorBox message={home.error || 'Could not load your dashboard.'} onRetry={home.reload} /></View>;
  const req = objs(h, 'requests'); const tod = objs(h, 'today'); const tom = objs(h, 'tomorrow'); const up = objs(h, 'upcoming');
  const admin = obj(h, 'admin');
  const role = Api.session?.user?.role || '';
  const list = (bs: J[]) => bs.map((b, i) => <Appear key={text(b, 'kind') + int(b, 'id')} index={i} style={{ marginBottom: 10 }}><BookingCard b={b} changed={changed} /></Appear>);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: DOCK_SPACE }}>
      {/* quick things a host does every day */}
      <View style={{ flexDirection: 'row', marginBottom: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', paddingVertical: 12, paddingHorizontal: 4, overflow: 'hidden' }}>
        <GlassSheen />
        {!pets && ['host', 'admin'].includes(role) ? <QuickAction emoji="🙋" label="Book a guest" tone="rose" onPress={() => Nav.navigate('bookguest')} /> : null}
        {!pets ? <QuickAction emoji="📅" label="Close dates" tone="mint" onPress={() => go('calendar')} /> : null}
        {role === 'host' ? <QuickAction emoji="🏡" label="Add a stay" tone="peach" onPress={() => Nav.navigate('listingform/stay')} /> : null}
        {pets ? <QuickAction emoji="🐶" label="Add boarding" tone="peach" onPress={() => Nav.navigate('listingform/pet')} /> : null}
        <QuickAction emoji="💬" label="Messages" tone="sky" badge={int(h, 'unread_chats')} onPress={() => (pets ? Nav.navigate('messages') : go('chats'))} />
        <QuickAction emoji="💰" label="Money" tone="lavender" onPress={() => go('money')} />
      </View>
      {req.length ? <><Head emoji="🔔" text="Waiting for your answer" sub="Approve or decline before the time runs out" tone="rose" />{list(req)}<Gap h={4} /></> : null}
      {admin ? <><AdminCards a={admin} /><Gap h={10} /></> : null}
      <Head emoji="🏡" text="Today" sub={longDay(today())} tone="butter" />
      {!tod.length ? <Quiet emoji="☕" text={pets ? 'No pets arriving or leaving today — enjoy a calm day.' : 'Nobody arriving or leaving today — enjoy a calm day.'} /> : null}
      {list(tod)}
      <Gap h={8} />
      <Head emoji="🌙" text="Arriving tomorrow" sub={longDay(addDays(today(), 1))} tone="lavender" />
      {!tom.length ? <Quiet emoji="🌿" text={pets ? 'No pets arriving tomorrow.' : 'Nobody arriving tomorrow.'} /> : null}
      {list(tom)}
      <Gap h={8} />
      <Head emoji="📆" text="Coming up" tone="sky" />
      {!up.length ? <Quiet emoji="✨" text="No upcoming bookings yet. Keep your calendar open and prices fresh." /> : null}
      {list(up)}
      {!pets && role === 'host' ? <><Gap h={8} /><Head emoji="📡" text="Force search" sub="Guests who need a stay tonight" tone="rose" /><ForceHostCard /></> : null}
    </ScrollView>
  );
}

/** The admin's cards on the app dashboard: this month and what is waiting (opens the website's admin page). */
function AdminCards({ a }: { a: J }) {
  const m = obj(a, 'month') || {};
  const w = obj(a, 'wallet');
  const waiting = objs(a, 'waiting');
  const tiles: [string, string, string, Tone][] = [['🧳', String(int(m, 'bookings')), 'Bookings', 'sky'], ['💎', money(num(m, 'bookings_value') || 0), 'Booking value', 'lavender'],
    ['🏦', money(num(m, 'platform') || 0), 'Fee + commission', 'mint'], ['🙂', String(int(m, 'new_guests')), 'New guests', 'peach']];
  return (
    <View>
      <Head emoji="📊" text="This month" sub="All stays and resorts" tone="lavender" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tiles.map(([e, v, k, t]) => <View key={k} style={{ flexBasis: '47%', flexGrow: 1 }}><StatTile emoji={e} value={v} label={k} tone={t} /></View>)}
      </View>
      {w ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 8 }}>👛 Guest wallets: {money(num(w, 'in_wallets') || 0)} unused · {money(num(w, 'used') || 0)} used on bookings</Txt> : null}
      {waiting.length ? (
        <>
          <Gap h={12} /><Head emoji="📝" text="Waiting for you" sub="Opens the website's admin page" tone="butter" />
          <View style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', overflow: 'hidden' }}>
            {waiting.map((x, i) => (
              <Pressable key={i} onPress={() => Linking.openURL(Api.url(text(x, 'link'))).catch(() => {})} style={[st.row, { padding: 13, borderTopWidth: i ? 1 : 0, borderTopColor: '#F3EEEA' }]}>
                <Txt semi style={{ flex: 1 }}>{text(x, 'label')}</Txt>
                <View style={{ minWidth: 28, borderRadius: 14, backgroundColor: PASTEL.butter[0], paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center' }}><Txt bold color={PASTEL.butter[1]}>{int(x, 'count')}</Txt></View>
                <Icon name="chevron-right" size={18} color={Brand.Muted} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/* ---------- One booking, with what the host can do now ---------- */
const ACT_LABEL: Record<string, string> = { approve: 'Approve', decline: 'Decline', check_in: 'Check in', check_out: 'Check out', complete: 'Complete' };

export function BookingCard({ b, changed }: { b: J; changed: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<[string, boolean] | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [balance, setBalance] = useState(false);
  const run = async (action: string, extra: Record<string, any> = {}) => {
    setBusy(action); setMsg(null);
    try {
      const r = await Api.post(`hostapp/bookings/${text(b, 'kind')}/${int(b, 'id')}/${action}`, extra);
      setMsg([text(r, 'message', 'Done.'), true]); changed();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'balance_due') setBalance(true); else setMsg([errorText(e), false]);
    }
    setBusy(null);
  };
  const state = text(b, 'state');
  const stTone: Tone = state === 'request' ? 'butter' : state === 'checked_in' ? 'mint' : state === 'cancelled' ? 'rose' : state === 'checked_out' ? 'lavender' : 'sky';
  const pet = text(b, 'kind') === 'pet';
  const who = pet ? `${int(b, 'pets')} pet${int(b, 'pets') === 1 ? '' : 's'}` : `${int(b, 'guests')} guest${int(b, 'guests') === 1 ? '' : 's'}`;
  const acts = strings(b, 'actions');
  const phone = str(b, 'phone');
  const [details, setDetails] = useState(false);
  const due = (num(b, 'balance') || 0) > 0 && state !== 'cancelled';
  return (
    <View style={{ borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1.2, borderColor: '#fff', overflow: 'hidden', elevation: 3, shadowColor: '#D93338', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
      <Pressable onPress={() => setDetails(true)} style={{ padding: 14 }} accessibilityRole="button" accessibilityLabel={`${text(b, 'guest')}, ${text(b, 'state_label')}. Open booking details`}>
        <View style={st.row}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: PASTEL[stTone][0], alignItems: 'center', justifyContent: 'center' }}>
            <Txt k="titleLarge" color={PASTEL[stTone][1]}>{(text(b, 'guest') || '?').slice(0, 1).toUpperCase()}</Txt>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Txt k="titleMedium" numberOfLines={1}>{text(b, 'guest')}</Txt>
            <Txt k="labelMedium" color={Brand.Muted} numberOfLines={1}>{text(b, 'listing')}</Txt>
          </View>
          <View style={{ borderRadius: 50, backgroundColor: PASTEL[stTone][0], paddingHorizontal: 10, paddingVertical: 4 }}><Txt k="labelSmall" color={PASTEL[stTone][1]}>{text(b, 'state_label')}</Txt></View>
        </View>
        {/* when */}
        {obj(b, 'hourly') ? (
          <View style={[st.row, { gap: 6, marginTop: 12 }]}>
            <View style={[st.row, { flex: 1, borderRadius: 16, backgroundColor: PASTEL.butter[0], padding: 10 }]}><Txt>⏱️</Txt><View style={{ paddingLeft: 8 }}><Txt k="labelSmall" color={PASTEL.butter[1]}>Hourly · {shortDate(str(b, 'check_in'))}</Txt><Txt k="titleSmall">{text(obj(b, 'hourly'), 'label')}</Txt></View></View>
          </View>
        ) : (
          <View style={[st.row, { gap: 6, marginTop: 12 }]}>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: PASTEL.mint[0], paddingHorizontal: 10, paddingVertical: 8 }}><Txt k="labelSmall" color={PASTEL.mint[1]}>Check-in</Txt><Txt k="titleSmall">{shortDate(str(b, 'check_in'))}{str(b, 'arrival_time') ? ` · ${str(b, 'arrival_time')}` : ''}</Txt></View>
            <View style={{ alignItems: 'center' }}><Txt k="labelSmall" color={Brand.Muted}>🌙 {int(b, 'nights')}</Txt><Icon name="arrow-forward" size={16} color={Brand.Muted} /></View>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: PASTEL.peach[0], paddingHorizontal: 10, paddingVertical: 8 }}><Txt k="labelSmall" color={PASTEL.peach[1]}>Check-out</Txt><Txt k="titleSmall">{shortDate(str(b, 'check_out'))}</Txt></View>
          </View>
        )}
        {/* who and money */}
        <View style={[st.row, { marginTop: 10 }]}>
          <Txt k="labelMedium" color={Brand.InkSoft} style={{ flex: 1 }}>{pet ? '🐾' : '👥'} {who}</Txt>
          <View style={[st.row, { borderRadius: 50, backgroundColor: due ? PASTEL.butter[0] : PASTEL.mint[0], paddingHorizontal: 10, paddingVertical: 4 }]}>
            <Txt k="labelSmall" color={due ? PASTEL.butter[1] : PASTEL.mint[1]}>{due ? 'Due ' : 'Guest pays '}</Txt>
            <Txt k="titleSmall" color={due ? PASTEL.butter[1] : PASTEL.mint[1]}>{money(num(b, 'guest_pays') ?? num(b, 'total') ?? 0)}</Txt>
          </View>
        </View>
        {text(b, 'guest_pays_note') || text(b, 'payment') ? <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1} style={{ marginTop: 4, textAlign: 'right' }}>{text(b, 'guest_pays_note') || text(b, 'payment')}</Txt> : null}
        {b.gst !== undefined ? <View style={{ alignItems: 'flex-end' }}><GstTag b={b} light /></View> : null}
        {str(b, 'requests') ? <View style={{ marginTop: 8, borderRadius: 14, backgroundColor: '#F8F5F2', padding: 10 }}><Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={3}>💭 “{str(b, 'requests')}”</Txt></View> : null}
      </Pressable>
      {acts.length || phone ? (
        <View style={[st.row, { gap: 8, paddingHorizontal: 14, paddingBottom: 14 }]}>
          {phone ? <Press onPress={() => dial(phone)} accessibilityLabel={`Call ${text(b, 'guest')}`} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: Brand.TealSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="call" color={Brand.TealDark} /></Press> : null}
          {acts.map((a) => {
            const idCheckin = a === 'check_in' && text(b, 'kind') === 'stay';   // stays: with the guest's ID (camera or photo)
            const label = idCheckin ? 'Check in · ID' : ACT_LABEL[a] || a;
            if (a === 'decline') return <OutlineButton key={a} text={label} color={Brand.Danger} onPress={() => { setNote(''); setAsk(a); }} style={{ flex: 1 }} />;
            return <PrimaryButton key={a} text={label} loading={busy === a} style={{ flex: 1 }} onPress={() => { if (idCheckin) Nav.navigate(`hostcheckin/${int(b, 'id')}`); else if (a === 'approve') { setNote(''); setAsk(a); } else run(a); }} />;
          })}
        </View>
      ) : null}
      {msg ? <Notice text={msg[0]} tone={msg[1] ? 'ok' : 'bad'} style={{ marginHorizontal: 14, marginBottom: 14 }} /> : null}
      <Dialog open={!!ask} onClose={() => setAsk(null)} title={ask === 'approve' ? 'Approve this request?' : 'Decline this request?'}
        text={ask === 'approve' ? `${text(b, 'guest')} gets a message to pay. The booking is confirmed when the payment succeeds.` : `${text(b, 'guest')} is told and the dates are free again.`}
        actions={[['Not now', () => setAsk(null)], [ask === 'approve' ? 'Approve' : 'Decline', () => { const a = ask!; setAsk(null); run(a, { note: note.trim() || null }); }, ask === 'approve' ? Brand.TealDark : Brand.Danger]]}>
        <Field label={ask === 'approve' ? 'A note for the guest (optional)' : 'Reason (optional)'} value={note} onChange={setNote} />
      </Dialog>
      <BookingDetails b={b} open={details} onClose={() => setDetails(false)} />
      <Dialog open={balance} onClose={() => setBalance(false)} title="Balance received?" text="The guest still owes part of the price. Check out only after you received it."
        actions={[['Cancel', () => setBalance(false)], ['Yes, received — check out', () => { setBalance(false); run('check_out', { collected: true }); }]]} />
    </View>
  );
}

/** Everything about one booking, in a popup: what the guest pays, the stay, the people, contact, money and the booking itself. */
function BookingDetails({ b, open, onClose }: { b: J; open: boolean; onClose: () => void }) {
  const pet = text(b, 'kind') === 'pet';
  const phone = str(b, 'phone'); const email = str(b, 'email');
  const row = (icon: string, label: string, value: string | null | undefined) => value ? (
    <View style={[st.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3E9E5' }]}>
      <Icon name={icon} size={18} color={Brand.Blue} />
      <Txt k="bodyMedium" color={Brand.Muted} style={{ width: 120, marginLeft: 10 }}>{label}</Txt>
      <Txt k="bodyMedium" semi style={{ flex: 1, textAlign: 'right' }}>{value}</Txt>
    </View>
  ) : null;
  const ppl = pet ? `${int(b, 'pets')} pet${int(b, 'pets') === 1 ? '' : 's'}`
    : num(b, 'adults') != null ? `${int(b, 'adults')} adult${int(b, 'adults') === 1 ? '' : 's'}${int(b, 'children') ? ` · ${int(b, 'children')} child${int(b, 'children') === 1 ? '' : 'ren'}` : ''}` : `${int(b, 'guests')} guest${int(b, 'guests') === 1 ? '' : 's'}`;
  const due = (num(b, 'balance') || 0) > 0 && text(b, 'state') !== 'cancelled';
  return (
    <Sheet open={open} onClose={onClose}>
      {open ? (
        <View>
          <View style={st.row}>
            <Photo url={str(b, 'image')} style={{ width: 58, height: 58 }} corner={16} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Txt k="titleLarge" numberOfLines={1}>{text(b, 'guest')}</Txt>
              <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={1}>{text(b, 'listing')}</Txt>
            </View>
            <Pill text={text(b, 'state_label')} tone={text(b, 'state') === 'cancelled' ? 'bad' : text(b, 'state') === 'request' ? 'warn' : 'info'} />
          </View>
          <Gap h={12} />
          <LinearGradient colors={['#C8242B', '#E8474B', '#FF8A5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 16, overflow: 'hidden' }}>
            <LiquidLayer waves={[{ color: 'rgba(255,255,255,0.12)', h: 0.45, amp: 7, ms: 9000, reverse: true }, { color: 'rgba(120,8,20,0.16)', h: 0.3, amp: 7, ms: 6200 }]} bubbles={4} />
            <Txt k="labelMedium" color="#FFE3E1">Guest pays</Txt>
            <Txt k="displaySmall" color="#fff">{money(num(b, 'guest_pays') ?? num(b, 'total') ?? 0)}</Txt>
            <Txt k="bodyMedium" color="#fff" style={{ marginTop: 2 }}>{text(b, 'guest_pays_note') || text(b, 'payment')}</Txt>
            {b.gst !== undefined ? <GstTag b={b} /> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[['Paid', money(num(b, 'paid') || 0)], ['Balance', money(num(b, 'balance') || 0)]].map(([l, v]) => (
                <View key={l} style={{ flex: 1, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', padding: 8 }}>
                  <Txt k="labelSmall" color="#FFE3E1">{l}</Txt>
                  <Txt k="titleSmall" color={l === 'Balance' && due ? Brand.Sun : '#fff'}>{v}</Txt>
                </View>
              ))}
            </View>
          </LinearGradient>
          <Gap h={12} />
          <Txt k="titleSmall">Stay</Txt>
          {obj(b, 'hourly') ? <>
            {row('schedule', 'Hourly booking', `${shortDate(str(b, 'check_in'))} · ${text(obj(b, 'hourly'), 'label')}`)}
          </> : <>
          {row('event', 'Check-in', `${shortDate(str(b, 'check_in'))}${str(b, 'arrival_time') ? ' · around ' + str(b, 'arrival_time') : ''}`)}
          {row('event-available', 'Check-out', `${shortDate(str(b, 'check_out'))}${str(b, 'checkout_time') ? ' · ' + str(b, 'checkout_time') : ''}`)}
          {row('nights-stay', 'Nights', String(int(b, 'nights')))}
          </>}
          {row(pet ? 'pets' : 'group', pet ? 'Pets' : 'Guests', ppl)}
          {row('login', 'Checked in', str(b, 'checked_in_at') ? shortDate(str(b, 'checked_in_at')!.slice(0, 10)) : null)}
          {row('logout', 'Checked out', str(b, 'checked_out_at') ? shortDate(str(b, 'checked_out_at')!.slice(0, 10)) : null)}
          <Gap h={10} />
          <Txt k="titleSmall">Money</Txt>
          {row('receipt-long', 'Total', money(num(b, 'total') || 0))}
          {row('credit-card', 'Payment', text(b, 'payment'))}
          {(num(b, 'service_fee') || 0) > 0 ? row('percent', 'Guest service fee', money(num(b, 'service_fee'))) : null}
          {(num(b, 'commission') || 0) > 0 ? row('account-balance', 'TripArro commission', money(num(b, 'commission'))) : null}
          {row('local-offer', 'Coupon', str(b, 'coupon'))}
          <Gap h={10} />
          <Txt k="titleSmall">Booking</Txt>
          {row('confirmation-number', 'Reference', text(b, 'ref'))}
          {row('public', 'Booked on', bool(b, 'by_agent') ? 'A TripArro Agent' : ({ website: 'TripArro website / app', host: 'You (dashboard)', referral: 'A TripArro Agent', admin: 'TripArro team' } as Record<string, string>)[text(b, 'source')] || text(b, 'source'))}
          {row('schedule', 'Booked at', str(b, 'booked_on') ? shortDate(str(b, 'booked_on')!.slice(0, 10)) + ' · ' + str(b, 'booked_on')!.slice(11, 16) : null)}
          {row('info-outline', 'Cancelled because', str(b, 'cancel_reason'))}
          {str(b, 'requests') ? <><Gap h={10} /><Txt k="titleSmall">Guest's note</Txt><View style={{ marginTop: 6, borderRadius: 16, backgroundColor: '#FFF6D6', padding: 12 }}><Txt>“{str(b, 'requests')}”</Txt></View></> : null}
          {phone || email ? (
            <>
              <Gap h={12} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {phone ? <PrimaryButton text="Call" icon="call" style={{ flex: 1 }} onPress={() => dial(phone)} /> : null}
                {phone ? <OutlineButton text="WhatsApp" icon="chat" style={{ flex: 1 }} onPress={() => Linking.openURL('https://wa.me/' + phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')).catch(() => {})} /> : null}
                {!phone && email ? <OutlineButton text="Email" icon="mail" style={{ flex: 1 }} onPress={() => Linking.openURL('mailto:' + email).catch(() => {})} /> : null}
              </View>
              {email && phone ? <Txt k="bodySmall" color={Brand.Muted} center style={{ marginTop: 8 }} onPress={() => Linking.openURL('mailto:' + email).catch(() => {})}>{email}</Txt> : null}
            </>
          ) : text(b, 'state') === 'request' ? <><Gap h={10} /><Txt k="bodySmall" color={Brand.Muted}>The guest's phone and email show after you approve the request.</Txt></> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

/** GST on a booking: a sun-yellow tag with the amount, or a clear "No GST". */
function GstTag({ b, light }: { b: J; light?: boolean }) {
  const g = num(b, 'gst') || 0, r = num(b, 'gst_rate');
  const byHost = ['host', 'admin', 'owner'].includes(text(b, 'source'));
  return g > 0 ? (
    <View style={[st.row, { alignSelf: 'flex-start', gap: 5, marginTop: 8, borderRadius: 50, backgroundColor: Brand.Sun, paddingHorizontal: 10, paddingVertical: 4 }]}>
      <Txt style={{ fontSize: 12 }}>🧾</Txt><Txt k="labelMedium" bold color="#3A2900">Includes GST {money(g)}{r ? ` (${r}%)` : ''}</Txt>
    </View>
  ) : (
    <View style={[st.row, { alignSelf: 'flex-start', gap: 5, marginTop: 8, borderRadius: 50, backgroundColor: light ? '#E8F6EF' : 'rgba(255,255,255,0.92)', borderWidth: light ? 1 : 0, borderColor: '#BFE6D2', paddingHorizontal: 10, paddingVertical: 4 }]}>
      <Txt style={{ fontSize: 12 }}>🚫</Txt><Txt k="labelMedium" bold color="#0B6B3A">No GST{byHost ? ' · booked by host' : ''}</Txt>
    </View>
  );
}

/** A booking found by its reference (a booked night in the calendar), in the same popup. */
function BookingByRef({ refCode, onClose, changed }: { refCode: string | null; onClose: () => void; changed: () => void }) {
  const [b, setB] = useState<J | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setB(null); setErr(null);
    if (!refCode) return;
    Api.get('hostapp/booking', { ref: refCode }).then((j) => setB(obj(j, 'booking'))).catch((e) => setErr(errorText(e)));
  }, [refCode]);
  if (!refCode) return null;
  if (b) return <BookingDetails b={b} open onClose={onClose} />;
  return <Sheet open onClose={onClose}>{err ? <Notice text={err} tone="bad" /> : <Loading />}</Sheet>;
}

/* ---------- Bookings ---------- */
function BookingsTab({ pets, changed }: { pets: boolean; changed: () => void }) {
  const [which, setWhich] = useState('upcoming');
  const [tick, setTick] = useState(0);
  const l = useLoader(() => Api.get('hostapp/bookings', { which }), [which, tick]);
  const d = l.data;
  const opts: [string, string][] = [['upcoming', '📆 Upcoming'], ['requests', '🔔 Requests'], ['today', '🏡 Today'], ['in_house', pets ? '🐾 Pets now' : '🛏️ Staying now'], ['past', '🕰️ Past']];
  return (
    <View style={{ flex: 1 }}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          {opts.map(([k, lab]) => {
            const on = which === k;
            return <Press key={k} onPress={() => setWhich(k)} style={{ borderRadius: 50, backgroundColor: on ? PASTEL.sky[1] : '#fff', borderWidth: 1, borderColor: on ? PASTEL.sky[1] : '#EFE7E3', paddingHorizontal: 14, paddingVertical: 8 }}><Txt k="labelLarge" color={on ? '#fff' : Brand.InkSoft}>{lab}</Txt></Press>;
          })}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: DOCK_SPACE }}>
        {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load bookings.'} onRetry={l.reload} />
          : !objs(d, 'bookings').length ? <EmptyBox title="Nothing here" icon="list-alt" text={which === 'requests' ? 'No requests waiting for you.' : which === 'past' ? 'No past bookings yet.' : 'No bookings in this list.'} />
          : objs(d, 'bookings').map((b, i) => <Appear key={text(b, 'kind') + int(b, 'id')} index={i} style={{ marginBottom: 10 }}><BookingCard b={b} changed={() => { setTick((t) => t + 1); changed(); }} /></Appear>)}
      </ScrollView>
    </View>
  );
}

/* ---------- Calendar: close dates, open them again, set prices ---------- */
function CalendarTab() {
  const [listing, setListing] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [tick, setTick] = useState(0);
  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [msg, setMsg] = useState<[string, boolean] | null>(null);
  const [priceAsk, setPriceAsk] = useState(false);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [openRef, setOpenRef] = useState<string | null>(null);   // a booked night tapped: that booking's details
  const [reopen, setReopen] = useState<J | null>(null);   // a closed night tapped: open it again?
  const l = useLoader(() => Api.get('hostapp/calendar', { listing: listing || null, month }), [listing, month, tick]);
  const d = l.data;
  useEffect(() => { if (!listing) { const t = str(obj(d, 'listing'), 'tag'); if (t) setListing(t); } }, [d]);
  const act = async (path: string, body: Record<string, any>) => {
    setBusy(true); setMsg(null);
    try { setMsg([text(await Api.post(path, body), 'message', 'Saved.'), true]); setFirst(null); setLast(null); setTick((t) => t + 1); } catch (e) { setMsg([errorText(e), false]); }
    setBusy(false);
  };
  if (!d) return <View style={{ padding: 16 }}>{l.loading ? <Loading /> : <ErrorBox message={l.error || 'Could not load the calendar.'} onRetry={l.reload} />}</View>;
  const ls = objs(d, 'listings');
  const all = bool(d, 'all');
  const cur = obj(d, 'listing');
  const tag = text(cur, 'tag', listing);
  const pick = (t: string) => { setListing(t); setFirst(null); setLast(null); };
  const chip = (key: string, label: string, on: boolean, onPress: () => void, dot?: string) => (
    <Press key={key} onPress={onPress}>
      <View style={[st.row, { gap: 7, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: on ? '#1D1B1A' : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: on ? '#1D1B1A' : '#F1E7E3' }]}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot || (on ? '#fff' : Brand.Ink) }} />
        <Txt k="labelLarge" color={on ? '#fff' : Brand.Ink} numberOfLines={1} style={{ maxWidth: 140 }}>{label}</Txt>
      </View>
    </Press>
  );
  const days = objs(d, 'days');
  const t0 = today();
  const kind = text(cur, 'kind');
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
      {ls.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {chip('all', 'All', all, () => pick('all'))}
          {ls.map((x, i) => chip(text(x, 'tag'), text(x, 'title'), !all && text(x, 'tag') === tag, () => pick(text(x, 'tag')), laneColor(i)))}
        </ScrollView>
      ) : null}
      <Gap h={12} />
      {all ? <AllListingsCalendar d={d} month={month} onMonth={setMonth} onListing={pick} /> : (
        <>
          {(() => {
            const li = Math.max(0, ls.findIndex((x) => text(x, 'tag') === tag));
            const col = laneColor(li);
            const nd: NightDay[] = days.map((c) => { const p = num(c, 'price'); return { date: text(c, 'date'), state: text(c, 'state', 'free'), key: str(c, 'ref') || text(c, 'state') + '|' + text(c, 'label'), label: str(c, 'label'),
              price: kind === 'stay' && p != null ? '₹' + (p >= 1000 ? (p / 1000).toFixed(p % 1000 ? 1 : 0) + 'k' : Math.round(p)) : kind === 'resort' ? `${int(c, 'rooms_free')}/${int(c, 'rooms_total')}` : null }; });
            return (
              <>
                <MonthTitle label={text(d, 'label')} month={month} onMonth={setMonth} />
                <MonthMeter days={nd} color={col} />
                <View style={{ borderRadius: 24, backgroundColor: '#fff', paddingHorizontal: 6, paddingTop: 8, paddingBottom: 2 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => <Txt key={i} k="labelSmall" color={i === 0 || i === 6 ? Brand.Blue : Brand.Muted} center style={{ flex: 1 }}>{x}</Txt>)}</View>
                  <NightMonth days={nd} color={col} selected={(x) => !!first && x >= first && x <= (last || first)}
                    onDay={(cd) => {
                      const c = days.find((x) => text(x, 'date') === cd.date); if (!c) return;
                      const date = cd.date, s = text(c, 'state');
                      if (date < t0) return;
                      if (s === 'closed' && int(c, 'block_id') > 0) { setFirst(null); setLast(null); setReopen(c); }
                      else if (s !== 'free') { if (str(c, 'ref')) setOpenRef(str(c, 'ref')); else setMsg([str(c, 'label') || 'Booked', true]); }
                      else if (!first || last || date < first) { setFirst(date); setLast(null); }
                      else setLast(date);
                    }} />
                </View>
                <NightKey color={col} />
              </>
            );
          })()}
          <Gap h={12} />
          {first && kind === 'stay' ? (() => {
            const end = last || first;
            const nights = Math.round(((parseIso(end)?.getTime() || 0) - (parseIso(first)?.getTime() || 0)) / 86400000) + 1;
            const stayId = parseInt(tag.split(':')[1] || '', 10);
            const out = addDays(end, 1);   // the morning after the last night
            return (
              <View style={{ borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1.2, borderColor: '#fff', padding: 14, overflow: 'hidden', shadowColor: Brand.Blue, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
                <View style={st.row}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.Blue, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleMedium" bold color="#fff">{nights}</Txt></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Txt k="titleSmall">{nights === 1 ? '1 night' : `${nights} nights`} picked</Txt>
                    <Txt k="bodySmall" color={Brand.Muted}>Check-in {shortDate(first)} · check-out {shortDate(out)}</Txt>
                  </View>
                  <Pressable onPress={() => { setFirst(null); setLast(null); }} hitSlop={8} accessibilityLabel="Clear" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4EEEB', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={18} color={Brand.InkSoft} /></Pressable>
                </View>
                {!last ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>👆 Tap another night to make it longer</Txt> : null}
                <Gap h={12} />
                {stayId && (Api.session?.user?.role || '') !== 'pethost' ? <PrimaryButton text="Book a guest for these nights" icon="person-add-alt" onPress={() => Nav.navigate(`bookguest?property=${stayId}&check_in=${first}&check_out=${out}`)} /> : null}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <OutlineButton text="🔒 Close nights" style={{ flex: 1 }} disabled={busy} onPress={() => act('hostapp/calendar/close', { listing: tag, first, last: end, reason: 'Closed in the app' })} />
                  <OutlineButton text="₹ Set price" style={{ flex: 1 }} onPress={() => { const p = num(cur, 'price'); setPrice(p ? String(Math.round(p)) : ''); setPriceAsk(true); }} />
                </View>
              </View>
            );
          })() : kind === 'stay' ? (
            <View style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: '#fff', padding: 12, gap: 8 }}>
              {[['touch-app', 'Tap a green night, then another, to pick dates'], ['person-add-alt', 'Book a guest, close the nights or change the price'], ['event-busy', 'Tap a coloured band to see the guest; a grey one to open it again']].map(([ic, t]) => (
                <View key={t} style={[st.row, { gap: 10 }]}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={17} color={Brand.Blue} /></View>
                  <Txt k="bodySmall" color={Brand.InkSoft} style={{ flex: 1 }}>{t}</Txt>
                </View>
              ))}
            </View>
          )
            : kind === 'resort' ? <Txt k="bodySmall" color={Brand.Muted}>Each day shows how many rooms are still free.</Txt> : null}
        </>
      )}
      {msg ? <><Gap h={8} /><Notice text={msg[0]} tone={msg[1] ? 'ok' : 'bad'} /></> : null}
      <BookingByRef refCode={openRef} onClose={() => setOpenRef(null)} changed={() => setTick((t) => t + 1)} />
      <Dialog open={!!reopen} onClose={() => setReopen(null)} title="Open these nights again?" text={reopen ? `${text(reopen, 'label') || 'Closed'} — guests can book them again.` : ''}
        actions={[['Keep closed', () => setReopen(null)], ['Open again', () => { const c = reopen!; setReopen(null); act('hostapp/calendar/open', { block_id: int(c, 'block_id') }); }, Brand.TealDark]]} />
      <Dialog open={priceAsk} onClose={() => setPriceAsk(false)} title="Price per night"
        actions={[['Cancel', () => setPriceAsk(false)], ['Save', () => { setPriceAsk(false); act('hostapp/calendar/price', { listing: tag, first, last: last || first, price: parseInt(price, 10) || null }); }]]}>
        <Field label="Price (₹)" value={price} onChange={(v) => setPrice(v.replace(/\D/g, '').slice(0, 7))} keyboard="number-pad" />
      </Dialog>
    </ScrollView>
  );
}

/* ---------- Listings ---------- */
const hm12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`; };
function ListingsTab({ pets, changed }: { pets: boolean; changed: () => void }) {
  const [tick0, setTick] = useState(0);
  const refresh = useAppState('refreshTick');   // a listing added or edited in the form screen
  const tick = tick0 + (refresh || 0) * 1000;
  const l = useLoader(() => Api.get('hostapp/home'), [tick]);
  const [msg, setMsg] = useState<[string, boolean] | null>(null);
  const [edit, setEdit] = useState<J | null>(null);
  const [price, setPrice] = useState('');
  const [hEdit, setHEdit] = useState<J | null>(null);   // hourly booking: price per hour and cleaning gap
  const [hPrice, setHPrice] = useState('');
  const [hGap, setHGap] = useState('60');
  const [bEdit, setBEdit] = useState<J | null>(null);   // beds in each bedroom
  const [bRooms, setBRooms] = useState<Record<string, number>[]>([]);
  const [bCommon, setBCommon] = useState(0);
  const openBeds = (x: J) => { const b = obj(x, 'beds'); const n = int(b, 'bedrooms'); const l = ((b?.layout as any[]) || []).map((r) => (r && !Array.isArray(r) ? { ...r } : {})); while (l.length < n) l.push({}); setBRooms(l.slice(0, Math.max(n, 0))); setBCommon(int(b, 'common_baths')); setBEdit(x); };
  const bedText = (r: Record<string, number>, types: J[]): string => { const p = types.filter((t) => r[text(t, 'type')] > 0).map((t) => `${r[text(t, 'type')]} ${text(t, 'label').toLowerCase()}${r[text(t, 'type')] > 1 ? (text(t, 'type') === 'mattress' ? 'es' : 's') : ''}`); return p.length > 1 ? p.slice(0, -1).join(', ') + ' & ' + p[p.length - 1] : p[0] || 'No beds chosen yet'; };
  const openHourly = (x: J) => { const h = obj(x, 'hourly'); setHPrice(num(h, 'price') ? String(Math.round(num(h, 'price')!)) : ''); setHGap(String(int(h, 'gap', 60))); setHEdit(x); };
  const save = async (x: J, body: Record<string, any>) => {
    setMsg(null);
    try { setMsg([text(await Api.post(`hostapp/listings/${text(x, 'kind')}/${int(x, 'id')}`, body), 'message', 'Saved.'), true]); setTick((t) => t + 1); changed(); } catch (e) { setMsg([errorText(e), false]); }
  };
  const d = l.data;
  // add / edit listings (stays, services, pet boarding) — what this account may add, and its services
  const fm = useLoader(() => Api.get('hostapp/forms').catch(() => null), [tick]);
  const can = obj(fm.data, 'can') || {};
  const addBtn = (k: string, label: string, icon: string) => (
    <Press key={k} onPress={() => Nav.navigate(`listingform/${k}`)} style={{ flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: Brand.Blue, borderStyle: 'dashed', backgroundColor: '#FFF6F5', paddingHorizontal: 12, paddingVertical: 11 }}>
      <Icon name={icon} size={20} color={Brand.Blue} /><Txt k="titleSmall" bold color={Brand.BlueDark}>{label}</Txt>
    </Press>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
      {msg ? <><Notice text={msg[0]} tone={msg[1] ? 'ok' : 'bad'} /><Gap h={10} /></> : null}
      {bool(can, 'stay') || bool(can, 'service') || bool(can, 'pet') ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {bool(can, 'stay') && !pets ? addBtn('stay', 'Add a stay', 'add-home') : null}
          {bool(can, 'pet') ? addBtn('pet', 'Add pet boarding', 'pets') : null}
          {bool(can, 'service') && !pets ? addBtn('service', 'Add a service', 'local-taxi') : null}
        </View>
      ) : null}
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your listings.'} onRetry={l.reload} />
        : !objs(d, 'listings').length ? <EmptyBox title="No listings yet" text="Your listings show here once they are added." icon="home" />
        : objs(d, 'listings').map((x, i) => {
          const active = bool(x, 'active');
          const p = num(x, 'price');
          return (
            <Appear key={text(x, 'kind') + int(x, 'id')} index={i} style={{ marginBottom: 12 }}>
              <View style={{ borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1.2, borderColor: '#fff', overflow: 'hidden', elevation: 3, shadowColor: '#1A1410', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                <View>
                  <Photo url={str(x, 'image')} style={{ width: '100%', aspectRatio: 3.2 }} corner={0} />
                  <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 }}>
                    <Pill text={active ? 'Live' : ({ pending: 'Being checked', rejected: 'Not approved', draft: 'Draft' } as Record<string, string>)[text(x, 'approval')] || 'Paused'} tone={active ? 'ok' : 'warn'} />
                    {bool(x, 'verified') ? <Pill text="Verified" tone="info" /> : null}
                  </View>
                </View>
                <View style={{ padding: 14 }}>
                  <View style={st.row}>
                    <View style={{ flex: 1 }}>
                      <Txt k="titleMedium">{text(x, 'title')}</Txt>
                      <Txt k="bodySmall" color={Brand.Muted}>{text(x, 'location')}</Txt>
                    </View>
                    {text(x, 'kind') !== 'resort' ? (
                      <Press onPress={() => Nav.navigate(`listingform/${text(x, 'kind')}?id=${int(x, 'id')}`)} style={[st.row, { borderRadius: 50, borderWidth: 1.2, borderColor: Brand.Line, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 }]}>
                        <Icon name="edit" size={16} color={Brand.Ink} /><Txt k="labelLarge"> Edit</Txt>
                      </Press>
                    ) : null}
                  </View>
                  {bool(x, 'hidden_for_dues') ? <Txt k="labelMedium" color={Brand.Danger}>Hidden: a settlement is overdue (Money tab).</Txt> : null}
                  <View style={[st.row, { marginTop: 10 }]}>
                    {p != null ? (
                      <Press onPress={() => { setPrice(String(Math.round(p))); setEdit(x); }} style={{ flex: 1, borderRadius: 14, backgroundColor: Brand.SunSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Txt k="titleSmall" bold color={Brand.SunInk}>{money(p)} / night</Txt>
                        <Txt k="labelSmall" color={Brand.Warn}>Tap to change</Txt>
                      </Press>
                    ) : <View style={{ flex: 1 }} />}
                    {text(x, 'kind') !== 'pet' ? (
                      <View style={[st.row, { marginLeft: 12 }]}>
                        <Txt k="labelLarge" color={Brand.InkSoft}>{active ? 'Live ' : 'Paused '}</Txt>
                        <Switch value={active} onValueChange={(on) => save(x, { active: on })} trackColor={{ true: Brand.Teal }} accessibilityLabel="Listing live" />
                      </View>
                    ) : null}
                  </View>
                  {obj(x, 'beds') ? (
                    <Press onPress={() => openBeds(x)} style={[st.row, { marginTop: 10, borderRadius: 14, backgroundColor: Brand.Page, paddingHorizontal: 12, paddingVertical: 8 }]}>
                      <Icon name="king-bed" size={20} color={Brand.Blue} />
                      <View style={{ flex: 1, paddingLeft: 10 }}>
                        <Txt k="titleSmall" bold>{plural(int(obj(x, 'beds'), 'bedrooms'), 'bedroom')}</Txt>
                        <Txt k="labelSmall" color={Brand.Muted} numberOfLines={2}>{text(obj(x, 'beds'), 'summary') || 'Add the beds in each bedroom'}</Txt>
                      </View>
                      <Icon name="chevron-right" size={20} color={Brand.Muted} />
                    </Press>
                  ) : null}
                  {obj(x, 'hourly') ? (() => { const h = obj(x, 'hourly')!; const on = bool(h, 'on'); return (
                    <View style={[st.row, { marginTop: 10, borderRadius: 14, backgroundColor: on ? '#FDECEC' : Brand.Page, paddingHorizontal: 12, paddingVertical: 8 }]}>
                      <Press onPress={() => openHourly(x)} style={{ flex: 1 }}>
                        <Txt k="titleSmall" bold color={on ? Brand.BlueDark : Brand.InkSoft}>⏱️ Hourly booking{on ? ` · ${money(num(h, 'price') || 0)} / hour` : ''}</Txt>
                        {/* the price per hour and gap show only once hourly booking is on */}
                        <Txt k="labelSmall" color={Brand.Muted}>{on ? `${int(h, 'gap') ? `${int(h, 'gap')} min cleaning gap · ` : ''}Tap to change` : 'Let guests book a few hours'}</Txt>
                      </Press>
                      <Switch value={on} onValueChange={(v) => (v && !num(h, 'price') ? openHourly(x) : save(x, { hourly_on: v }))} trackColor={{ true: Brand.Teal }} accessibilityLabel="Hourly booking" />
                    </View>
                  ); })() : null}
                </View>
              </View>
            </Appear>
          );
        })}
      {!pets && objs(fm.data, 'services').length ? (
        <>
          <Gap h={6} />
          <Txt k="titleLarge">Your services</Txt>
          <Gap h={8} />
          {objs(fm.data, 'services').map((sv) => (
            <Press key={int(sv, 'id')} onPress={() => Nav.navigate(`listingform/service?id=${int(sv, 'id')}`)} style={[st.row, { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', padding: 10, marginBottom: 8, elevation: 2, shadowColor: '#1A1410', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }]}>
              <Photo url={str(sv, 'image')} style={{ width: 56, height: 56 }} corner={12} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Txt k="titleSmall" numberOfLines={1}>{text(sv, 'title')}</Txt>
                <Txt k="bodySmall" color={Brand.Muted} numberOfLines={1}>{[text(sv, 'category'), text(sv, 'location')].filter(Boolean).join(' · ')}</Txt>
                <Txt k="labelSmall" color={bool(sv, 'active') ? Brand.TealDark : Brand.Warn}>{!bool(sv, 'approved') ? 'Waiting for approval' : bool(sv, 'active') ? 'Live' : 'Hidden'}</Txt>
              </View>
              <Icon name="edit" size={18} color={Brand.Muted} />
            </Press>
          ))}
        </>
      ) : null}
      <Sheet open={!!bEdit} onClose={() => setBEdit(null)} title="Bedrooms & bathrooms">
        {bEdit ? (() => { const types = objs(obj(bEdit, 'beds'), 'types'); return (
          <>
            <Txt k="bodySmall" color={Brand.Muted}>{text(bEdit, 'title')} — e.g. Bedroom 1: 1 double cot bed, Bedroom 2: 2 single cot beds.</Txt>
            <Gap h={8} />
            {bRooms.map((r, i) => (
              <View key={i} style={{ marginTop: 10, borderRadius: 18, borderWidth: 1, borderColor: '#EFDCD5', backgroundColor: '#FFFAF7', padding: 12 }}>
                <View style={st.row}>
                  <Txt k="titleSmall" bold style={{ flex: 1 }}>Bedroom {i + 1}</Txt>
                  <Pressable onPress={() => setBRooms((l) => l.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Remove bedroom ${i + 1}`}><Icon name="close" size={20} color={Brand.Muted} /></Pressable>
                </View>
                <Txt k="labelSmall" color={Brand.Muted}>{bedText(r, types)}</Txt>
                {types.map((t) => { const k = text(t, 'type'); return (
                  <Stepper key={k} label={`${text(t, 'icon')} ${text(t, 'label')}`} value={r[k] || 0} min={0} max={10}
                    onChange={(n) => setBRooms((l) => l.map((x, j) => { if (j !== i) return x; const y = { ...x, [k]: n }; if (!n) delete y[k]; return y; }))} />
                ); })}
                <Pressable onPress={() => setBRooms((l) => l.map((x, j) => { if (j !== i) return x; const y = { ...x }; if (y.bath) delete y.bath; else y.bath = 1; return y; }))}
                  style={[st.row, { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ECD9D2' }]} accessibilityRole="checkbox" accessibilityState={{ checked: !!r.bath }}>
                  <Icon name={r.bath ? 'check-box' : 'check-box-outline-blank'} size={22} color={r.bath ? Brand.Blue : Brand.Muted} />
                  <Txt k="titleSmall" style={{ marginLeft: 8 }}>🚿 Attached bathroom</Txt>
                </Pressable>
              </View>
            ))}
            <Gap h={10} />
            <OutlineButton text="＋ Add a bedroom" onPress={() => setBRooms((l) => (l.length < 50 ? [...l, {}] : l))} />
            <Gap h={6} />
            <Stepper label="🚿 Common bathrooms" note="Shared, not inside a bedroom" value={bCommon} min={0} max={20} onChange={setBCommon} />
            <Txt k="labelSmall" color={Brand.Muted}>{plural(bRooms.length, 'bedroom')} · {plural(bRooms.filter((r) => r.bath).length + bCommon, 'bathroom')} in all</Txt>
            <Gap />
            <PrimaryButton text="Save rooms" onPress={() => { const x = bEdit; setBEdit(null); save(x, { bedrooms: bRooms.length, bed_layout: bRooms, common_baths: bCommon }); }} />
          </>
        ); })() : null}
      </Sheet>
      <Dialog open={!!hEdit} onClose={() => setHEdit(null)} title="Hourly booking" text={text(hEdit, 'title')}
        actions={[['Cancel', () => setHEdit(null)], ['Save', () => { const x = hEdit!; setHEdit(null); save(x, { hourly_on: true, hourly_price: parseInt(hPrice, 10) || 0, hourly_gap: parseInt(hGap, 10) }); }]]}>
        <Field label="Price per hour (₹)" value={hPrice} onChange={(v) => setHPrice(v.replace(/\D/g, '').slice(0, 6))} keyboard="number-pad" />
        <Gap h={8} />
        <Txt k="labelMedium" color={Brand.InkSoft}>Cleaning gap between bookings</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {[['0', 'None'], ['30', '30 min'], ['60', '1 h'], ['90', '1½ h'], ['120', '2 h'], ['180', '3 h']].map(([v, l]) => (
            <Pressable key={v} onPress={() => setHGap(v)} style={{ borderRadius: 50, borderWidth: 1.2, borderColor: hGap === v ? Brand.Blue : Brand.Line, backgroundColor: hGap === v ? Brand.Blue : '#fff', paddingHorizontal: 12, paddingVertical: 6 }}>
              <Txt k="labelMedium" color={hGap === v ? '#fff' : Brand.InkSoft}>{l}</Txt>
            </Pressable>
          ))}
        </View>
        {hEdit ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Guests book between {hm12(text(obj(hEdit, 'hourly'), 'from', '08:00'))} and {hm12(text(obj(hEdit, 'hourly'), 'to', '22:00'))}, at least {plural(int(obj(hEdit, 'hourly'), 'min', 2), 'hour')}. More than {plural(int(obj(hEdit, 'hourly'), 'day_after', 8), 'hour')} is charged as one night's price.</Txt> : null}
      </Dialog>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title="Standard price per night" text={text(edit, 'title')}
        actions={[['Cancel', () => setEdit(null)], ['Save', () => { const x = edit!; setEdit(null); save(x, { price: parseInt(price, 10) || null }); }]]}>
        <Field label="Price (₹)" value={price} onChange={(v) => setPrice(v.replace(/\D/g, '').slice(0, 7))} keyboard="number-pad" />
        {!pets ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Special prices for single nights: Calendar tab.</Txt> : null}
      </Dialog>
    </ScrollView>
  );
}

/* ---------- Money ---------- */
function MoneyTab() {
  const l = useLoader(() => Api.get('hostapp/money'));
  const d = l.data;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your money summary.'} onRetry={l.reload} /> : (
        <>
          {objs(d, 'cards').map((c, i) => {
            const [bg, fg] = ({ ok: [Brand.TealSoft, Brand.TealDark], bad: [Brand.DangerSoft, Brand.Danger], warn: [Brand.SunSoft, Brand.SunInk] } as Record<string, string[]>)[text(c, 'tone')] || [Brand.Sky, Brand.BlueDark];
            return (
              <Appear key={i} index={i} style={{ marginBottom: 10 }}>
                <View style={{ borderRadius: 20, backgroundColor: bg, padding: 16 }}>
                  <Txt k="labelLarge" color={fg}>{text(c, 'label')}</Txt>
                  <Txt k="headlineMedium" color={fg}>{money(num(c, 'amount') || 0)}</Txt>
                </View>
              </Appear>
            );
          })}
          {str(d, 'due_on') ? <Txt k="bodySmall" color={Brand.Muted}>Month-end settlement: {shortDate(str(d, 'due_on'))}</Txt> : null}
          <Gap h={14} />
          <SectionTitle text="Recent stays" />
          <Card padding={12}>
            {!objs(d, 'recent').length ? <Txt color={Brand.InkSoft}>No completed stays yet.</Txt> : null}
            {objs(d, 'recent').map((x, i) => (
              <View key={i} style={[st.row, { paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: Brand.Line }]}>
                <View style={{ flex: 1 }}><Txt k="titleSmall">{text(x, 'ref')}</Txt><Txt k="labelMedium" color={Brand.Muted}>{shortDate(str(x, 'date'))}</Txt></View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt k="titleSmall" bold color={Brand.BlueDark}>{money(num(x, 'amount') || 0)}</Txt>
                  <Pill text={bool(x, 'paid') ? 'Paid out' : 'Pending'} tone={bool(x, 'paid') ? 'ok' : 'warn'} />
                </View>
              </View>
            ))}
          </Card>
          <Gap h={10} />
          {str(d, 'note') ? <Notice text={str(d, 'note')!} /> : null}
        </>
      )}
    </ScrollView>
  );
}

/* ---------- Messages ---------- */
function ChatsTab() {
  const l = useLoader(() => Api.get('hostapp/chats'));
  useEffect(() => { const t = setInterval(l.reload, 15000); return () => clearInterval(t); }, []);
  const d = l.data;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: DOCK_SPACE }} style={{ flex: 1, backgroundColor: '#fff' }}>
      {!d && l.loading ? <Loading /> : !d ? <View style={{ padding: 16 }}><ErrorBox message={l.error || 'Could not load your chats.'} onRetry={l.reload} /></View>
        : <ChatList chats={objs(d, 'chats')} host open={(c) => Nav.navigate(`hostchat/${int(c, 'id')}`)} />}
    </ScrollView>
  );
}

/** The host's guest chats on their own (from Today's "unread messages" button). */
export function HostChatsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Guest messages" sub="Answer quickly — guests book more" onBack={Nav.back} />
      <ChatsTab />
    </View>
  );
}

/* ---------- TripArro Agent portal ---------- */
function AgentPortal() {
  const l = useLoader(() => Api.get('partner/overview'));
  const d = l.data;
  const t = obj(d, 'totals') || {};
  const links = obj(d, 'links') || {};
  const hosts = objs(d, 'hosts');
  const payouts = objs(d, 'payouts');
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: DOCK_SPACE }}>
      <ColorHeader title="TripArro Agent" sub="Book for your guests and earn on every stay" onBack={Nav.back} />
      <View>
        {d ? (
          <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
            <StatTile emoji="💰" value={money(num(t, 'earned') || 0)} label="Commission earned" tone="mint" />
            <StatTile emoji="🏦" value={money(num(t, 'pending_payout') || 0)} label="Payout due" tone="lavender" />
            <StatTile emoji="🧳" value={String(int(t, 'bookings'))} label="Bookings" tone="sky" />
          </View>
        ) : null}
      </View>
      <View style={{ padding: 16 }}>
        {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your summary.'} onRetry={l.reload} /> : (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PrimaryButton text="Book for a guest" icon="person-add-alt" onPress={() => Nav.navigate('bookguest')} style={{ flex: 1 }} />
              <OutlineButton text="Finance" icon="account-balance-wallet" onPress={() => Nav.openSite('/referral/commission', 'Finance & payouts')} style={{ flex: 1 }} />
            </View>
            <Gap />
            <SectionTitle text="My hosts" sub={hosts.length ? 'Hosts TripArro gave you — book their stays for your guests' : undefined} />
            {!hosts.length ? <Notice text="No hosts are assigned to you yet. You can still book every stay shown to TripArro Agents." /> : null}
            {hosts.map((h, i) => (
              <Card key={i} style={{ marginBottom: 10 }}>
                <View style={st.row}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.SunSoft, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleSmall">{text(h, 'name').slice(0, 1)}</Txt></View>
                  <View style={{ flex: 1, paddingLeft: 10 }}><Txt k="titleSmall">{text(h, 'name')}</Txt>{text(h, 'phone') ? <Txt k="bodySmall" color={Brand.Muted}>{text(h, 'phone')}</Txt> : null}</View>
                </View>
                {objs(h, 'stays').map((p, j) => (
                  <View key={j} style={[st.row, { marginTop: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 8 }]}>
                    <Photo url={str(p, 'image')} corner={12} style={{ width: 64, height: 64 }} />
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Txt k="titleSmall" numberOfLines={1}>{text(p, 'title')}</Txt>
                      <Txt k="bodySmall" color={Brand.Muted} numberOfLines={1}>{text(p, 'location')}</Txt>
                      <View style={[st.row, { gap: 6, flexWrap: 'wrap' }]}>
                        <Txt k="labelLarge" color={Brand.BlueDark}>{money(num(p, 'price') || 0)}/night</Txt>
                        {text(p, 'offer') ? <View style={{ borderRadius: 50, backgroundColor: Brand.Sun, paddingHorizontal: 8, paddingVertical: 2 }}><Txt k="labelSmall" bold>{text(p, 'offer')}</Txt></View> : null}
                      </View>
                    </View>
                    {bool(p, 'bookable') ? <OutlineButton text="Book" onPress={() => Nav.navigate('bookguest?property=' + int(p, 'id'))} /> : <Txt k="labelSmall" color={Brand.Warn}>Closed</Txt>}
                  </View>
                ))}
              </Card>
            ))}
            <Gap h={6} />
            <SectionTitle text="Payouts received" />
            <Card>
              {!payouts.length ? <Txt color={Brand.InkSoft}>No payouts yet. Commission is paid after your guests check out.</Txt> : null}
              {payouts.map((p, i) => (
                <View key={i} style={[st.row, { paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: Brand.Line }]}>
                  <View style={{ flex: 1 }}><Txt k="titleSmall">{shortDate(text(p, 'day'))}</Txt>{text(p, 'ref') ? <Txt k="bodySmall" color={Brand.Muted}>Ref {text(p, 'ref')}</Txt> : null}</View>
                  <Txt k="titleSmall" bold color={Brand.TealDark}>{money(num(p, 'amount') || 0)}</Txt>
                </View>
              ))}
            </Card>
            <Gap />
            <SectionTitle text="Recent bookings" sub="No reward points on agent bookings" />
            <Card>
              {!objs(d, 'bookings').length ? <Txt color={Brand.InkSoft}>No bookings yet.</Txt> : null}
              {objs(d, 'bookings').map((b, i) => (
                <View key={i} style={[st.row, { paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: Brand.Line }]}>
                  <View style={{ flex: 1 }}>
                    <Txt k="titleSmall">{text(b, 'listing')}</Txt>
                    <Txt k="bodySmall" color={Brand.InkSoft}>{text(b, 'guest')} · {shortDate(text(b, 'check_in'))} → {shortDate(text(b, 'check_out'))}</Txt>
                  </View>
                  <Txt k="titleSmall" bold color={Brand.BlueDark}>{money(num(b, 'commission') || 0)}</Txt>
                </View>
              ))}
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
