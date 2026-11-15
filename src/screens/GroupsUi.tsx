// Group trips look: the hub's tabs, trip cards and trip pictures that match the trip's name.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { J, arr, bool, int, str, text } from '../core/json';
import { Brand } from '../theme';
import { Appear, Icon, Press, Txt, parseIso, st , HeadButton } from '../ui/kit';

const Red1 = '#B3122A', Red2 = '#FF5A5A';

/** The three parts of Group trips, as a sliding switch on the red band under the title. */
export function HubTabs({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs: [string, string, string][] = [['trips', 'Trips', 'groups'], ['tickets', 'Tickets', 'confirmation-number']];
  const i = Math.max(0, tabs.findIndex((t) => t[0] === tab));
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(x, { toValue: (w / tabs.length) * i, useNativeDriver: true, friction: 8, tension: 90 }).start(); }, [i, w]);
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} style={{ height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', padding: 4, flexDirection: 'row' }}>
        {w > 0 ? <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: w / tabs.length, borderRadius: 22, backgroundColor: Brand.Blue, transform: [{ translateX: x }] }} /> : null}
        {tabs.map(([v, t, ic]) => {
          const on = v === tab;
          return (
            <Pressable key={v} onPress={() => onTab(v)} style={[st.row, { flex: 1, justifyContent: 'center' }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Icon name={ic} size={18} color={on ? Brand.Sun : Brand.InkSoft} /><Txt k="labelLarge" semi numberOfLines={1} color={on ? '#fff' : Brand.InkSoft}> {t}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A picture for a trip without a photo, chosen from the words in its name: beach, hills, snow, temples, backwaters, forest, city. */
export function tripTheme(name: string): { colors: string[]; icon: string } {
  const s = name.toLowerCase(); const has = (...w: string[]) => w.some((x) => s.includes(x));
  if (has('goa', 'beach', 'kovalam', 'varkala', 'gokarna', 'andaman', 'pondicherry', 'puducherry', 'lakshadweep', 'maldives', 'bali', 'phuket', 'sea', 'coast', 'island')) return { colors: ['#0B4F8A', '#1597B8', '#6FD6C8'], icon: 'beach-access' };
  if (has('kashmir', 'ladakh', 'leh', 'manali', 'shimla', 'snow', 'gulmarg', 'sikkim', 'spiti', 'auli', 'himalaya', 'switzerland')) return { colors: ['#2E3A6B', '#5B79C2', '#C7DAF5'], icon: 'ac-unit' };
  if (has('ooty', 'munnar', 'kodai', 'coorg', 'wayanad', 'yercaud', 'hill', 'valparai', 'trek', 'mountain', 'darjeeling', 'nilgiri', 'chikmagalur')) return { colors: ['#14432A', '#2E8B57', '#A8D672'], icon: 'landscape' };
  if (has('alleppey', 'alappuzha', 'kumarakom', 'backwater', 'houseboat', 'cruise', 'boat', 'lake', 'kerala')) return { colors: ['#0F5257', '#2A9D8F', '#E9C46A'], icon: 'directions-boat' };
  if (has('temple', 'tirupati', 'madurai', 'rameswaram', 'varanasi', 'kashi', 'sabarimala', 'pilgrim', 'palani', 'shirdi', 'velankanni', 'darshan', 'kanchipuram', 'thanjavur', 'puri')) return { colors: ['#7A2E0E', '#D9741A', '#FFC94A'], icon: 'temple-hindu' };
  if (has('forest', 'jungle', 'safari', 'wildlife', 'bandipur', 'mudumalai', 'thekkady', 'jim corbett', 'kabini', 'camp')) return { colors: ['#1F3A1A', '#4F7A28', '#C9B458'], icon: 'forest' };
  if (has('chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'city', 'dubai', 'singapore', 'london', 'paris')) return { colors: ['#2A1B4A', '#6A3FA0', '#F08AB4'], icon: 'location-city' };
  return { colors: ['#D93338', '#E8474B', '#FF5757'], icon: 'luggage' };
}

/** The trip's picture: its photo, else a matching coloured picture. */
export function TripCover({ cover, name, style, iconSize = 120 }: { cover?: string | null; name: string; style?: any; iconSize?: number }) {
  const th = tripTheme(name);
  return (
    <LinearGradient colors={th.colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }, style]}>
      <Icon name={th.icon} size={iconSize} color="#FFFFFF2E" style={{ marginRight: 18, transform: [{ rotate: '-12deg' }] }} />
      {cover ? <Image source={{ uri: cover }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} contentFit="cover" transition={200} /> : null}
    </LinearGradient>
  );
}

/** "In 12 days", "On now", "Tomorrow" — from the trip's dates. */
export function tripWhen(start: string, end: string): string | null {
  const a = parseIso(start); if (!a) return null;
  const b = parseIso(end) || a;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = Math.round((a.getTime() - now.getTime()) / 86400000);
  if (now > b) return 'Done';
  if (now >= a) return 'On now';
  if (d === 1) return 'Tomorrow';
  if (d < 60) return `In ${d} days`;
  return null;
}

const AvatarColors = ['#FFC72C', '#FF8A7A', '#8C9BF2', '#5CC29A'];

/** One trip in "Your trips": a frosted-glass card — the trip photo with when it is, then the name, place and dates, and who is going. */
export function TripCard({ g, onOpen, onShare }: { g: J; onOpen: () => void; onShare: () => void }) {
  const w = tripWhen(text(g, 'start_date'), text(g, 'end_date'));
  const people = arr<string>(g, 'people').map(String);
  const going = int(g, 'members');
  return (
    <Appear style={{ marginBottom: 16 }}>
      <Press onPress={onOpen} scaleTo={0.98} style={[st.glass, { borderRadius: 30, padding: 7 }]} accessibilityLabel={`Open ${text(g, 'title')}`}>
        <View style={{ height: 176, borderRadius: 24, overflow: 'hidden' }}>
          <TripCover cover={str(g, 'cover')} name={text(g, 'title') + ' ' + text(g, 'destination')} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          <LinearGradient pointerEvents="none" colors={['#00000040', '#00000000']} locations={[0, 0.5]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 }}>
            {bool(g, 'ended') ? <View style={{ borderRadius: 50, backgroundColor: '#FFFFFFEE', paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelMedium" bold>Trip ended</Txt></View> : null}
            {w && !bool(g, 'ended') ? <View style={[st.row, { borderRadius: 50, backgroundColor: w === 'On now' ? '#7CE0A3' : Brand.Sun, paddingHorizontal: 10, paddingVertical: 5 }]}><Icon name={w === 'On now' ? 'flight-takeoff' : 'event'} size={14} color={Brand.Ink} /><Txt k="labelMedium" bold> {w}</Txt></View> : null}
            {text(g, 'role') === 'owner' ? <View style={{ borderRadius: 50, backgroundColor: Brand.Blue, paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelMedium" bold color="#fff">Your trip</Txt></View> : null}
          </View>
          <Pressable onPress={onShare} hitSlop={6} style={{ position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Share this trip's link">
            <Icon name="share" size={19} color={Brand.Blue} />
          </Pressable>
          {int(g, 'items') > 0 ? <View style={{ position: 'absolute', bottom: 10, right: 10, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 9, paddingVertical: 4 }}><Txt k="labelSmall" bold>{int(g, 'items')} in the plan</Txt></View> : null}
        </View>
        <View style={{ paddingHorizontal: 10, paddingTop: 12, paddingBottom: 8 }}>
          <Txt k="titleLarge" numberOfLines={2}>{text(g, 'title')}</Txt>
          <View style={[st.row, { marginTop: 4, flexWrap: 'wrap', gap: 10 }]}>
            {text(g, 'destination') ? <View style={st.row}><Icon name="place" size={15} color={Brand.Blue} /><Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={1}> {text(g, 'destination')}</Txt></View> : null}
            {text(g, 'dates') ? <View style={st.row}><Icon name="event" size={15} color={Brand.SunDark} /><Txt k="bodySmall" color={Brand.InkSoft}> {text(g, 'dates')}</Txt></View> : null}
          </View>
          <View style={[st.row, { marginTop: 12 }]}>
            <View style={{ width: people.length ? 32 + (Math.min(4, people.length) - 1) * 21 : 32, height: 32 }}>
              {people.slice(0, 4).map((n, i) => (
                <View key={i} style={{ position: 'absolute', left: i * 21, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', padding: 2 }}>
                  <View style={{ flex: 1, borderRadius: 14, backgroundColor: AvatarColors[i % 4], alignItems: 'center', justifyContent: 'center' }}><Txt k="labelMedium" bold>{n.slice(0, 1)}</Txt></View>
                </View>
              ))}
            </View>
            <Txt k="labelLarge" color={Brand.InkSoft} style={{ flex: 1 }}>  {going <= 1 ? 'Just you so far' : `${going} going`}</Txt>
            <LinearGradient colors={['#F0555A', '#D93338']} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-forward" size={20} color={Brand.Sun} /></LinearGradient>
          </View>
        </View>
      </Press>
    </Appear>
  );
}

/** Top of the Trips list: start a trip (or from an idea), or join one with a code. */
export function MakeTripCard({ onNew, onJoin }: { onNew: (idea: string) => void; onJoin: () => void }) {
  return (
    <Appear style={[st.glass, { borderRadius: 30, padding: 18, overflow: 'hidden' }]}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 120, borderTopLeftRadius: 70, borderTopRightRadius: 70, backgroundColor: '#FFC72C55' }} />
      <Txt k="titleLarge" bold>Where to next?</Txt>
      <Txt k="bodySmall" color={Brand.InkSoft}>Name a trip, share its link — everyone who joins plans it with you.</Txt>
      <Press onPress={() => onNew('')} style={[st.row, { marginTop: 14, height: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 6 }]}>
        <LinearGradient colors={['#F0555A', '#D93338']} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Icon name="add" color={Brand.Sun} /></LinearGradient>
        <Txt k="bodyLarge" color={Brand.Muted} style={{ flex: 1 }}>  Name your trip…</Txt>
      </Press>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
        {['Ooty with family', 'Goa with friends', 'Munnar weekend', 'Tirupati darshan'].map((idea) => {
          const th = tripTheme(idea);
          return (
            <Pressable key={idea} onPress={() => onNew(idea)} style={[st.row, { borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: th.colors[1] + '40', paddingHorizontal: 12, paddingVertical: 8 }]}>
              <Icon name={th.icon} size={16} color={th.colors[1]} /><Txt k="labelLarge"> {idea}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={onJoin} style={{ marginTop: 12, paddingVertical: 6 }}><Txt k="labelLarge" semi color={Brand.Blue}>Got a code from a friend? Join their trip</Txt></Pressable>
    </Appear>
  );
}
