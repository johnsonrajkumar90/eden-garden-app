// Group trips look: the hub's tabs, trip cards and trip pictures that match the trip's name.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { J, arr, int, str, text } from '../core/json';
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
      <View onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} style={{ height: 52, borderRadius: 26, backgroundColor: Brand.Field, padding: 4, flexDirection: 'row' }}>
        {w > 0 ? <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: w / tabs.length, borderRadius: 22, backgroundColor: Brand.Ink, transform: [{ translateX: x }] }} /> : null}
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

/** One trip in the list: big photo, when it is, name and place, who joined (overlapping faces), share its link. */
export function TripCard({ g, onOpen, onShare }: { g: J; onOpen: () => void; onShare: () => void }) {
  const w = tripWhen(text(g, 'start_date'), text(g, 'end_date'));
  const people = arr<string>(g, 'people').map(String);
  const sub = [text(g, 'destination'), text(g, 'dates')].filter(Boolean).join('  ·  ');
  return (
    <Appear style={{ marginBottom: 14 }}>
      <Press onPress={onOpen} scaleTo={0.98} style={{ height: 214, borderRadius: 28, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, backgroundColor: '#000' }}>
        <TripCover cover={str(g, 'cover')} name={text(g, 'title') + ' ' + text(g, 'destination')} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <LinearGradient colors={['#00000033', '#00000000', '#15161CE0']} locations={[0, 0.35, 1]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
          {w ? <View style={{ borderRadius: 50, backgroundColor: w === 'On now' ? '#7CE0A3' : Brand.Sun, paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelMedium" bold>{w}</Txt></View> : null}
          {text(g, 'role') === 'owner' ? <View style={{ borderRadius: 50, backgroundColor: '#00000055', borderWidth: 1, borderColor: '#FFFFFF44', paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelMedium" color="#fff">Your trip</Txt></View> : null}
        </View>
        <Pressable onPress={onShare} style={{ position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000055', borderWidth: 1, borderColor: '#FFFFFF44', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Share this trip's link">
          <Icon name="share" size={19} color="#fff" />
        </Pressable>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
          <Txt k="headlineSmall" bold color="#fff" numberOfLines={2}>{text(g, 'title')}</Txt>
          {sub ? <Txt k="bodySmall" color="#FFFFFFDD" numberOfLines={1}>{sub}</Txt> : null}
          <View style={[st.row, { marginTop: 10 }]}>
            <View style={{ width: people.length ? 30 + (Math.min(4, people.length) - 1) * 20 : 30, height: 30 }}>
              {people.slice(0, 4).map((n, i) => (
                <View key={i} style={{ position: 'absolute', left: i * 20, width: 30, height: 30, borderRadius: 15, backgroundColor: '#15161C', padding: 2 }}>
                  <View style={{ flex: 1, borderRadius: 13, backgroundColor: AvatarColors[i % 4], alignItems: 'center', justifyContent: 'center' }}><Txt k="labelMedium" bold>{n.slice(0, 1)}</Txt></View>
                </View>
              ))}
            </View>
            <Txt k="labelLarge" color="#fff" style={{ flex: 1 }}>  {int(g, 'members') <= 1 ? 'Just you so far' : `${int(g, 'members')} going`}</Txt>
            {int(g, 'items') > 0 ? <View style={{ borderRadius: 50, backgroundColor: '#FFFFFF33', paddingHorizontal: 9, paddingVertical: 4 }}><Txt k="labelMedium" color="#FFFFFFCC">{int(g, 'items')} saved</Txt></View> : null}
          </View>
        </View>
      </Press>
    </Appear>
  );
}

/** Top of the Trips list: start a trip (or from an idea), or join one with a code. */
export function MakeTripCard({ onNew, onJoin }: { onNew: (idea: string) => void; onJoin: () => void }) {
  return (
    <Appear style={{ borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: '#fff', padding: 18 }}>
      <Txt k="titleLarge" bold>Where to next?</Txt>
      <Txt k="bodySmall" color={Brand.InkSoft}>Name a trip, share its link — everyone who joins plans it with you.</Txt>
      <Press onPress={() => onNew('')} style={[st.row, { marginTop: 14, height: 54, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, paddingHorizontal: 6 }]}>
        <LinearGradient colors={[Red1, Red2]} style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Icon name="add" color="#fff" /></LinearGradient>
        <Txt k="bodyLarge" color={Brand.Muted} style={{ flex: 1 }}>  Name your trip…</Txt>
      </Press>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
        {['Ooty with family', 'Goa with friends', 'Munnar weekend', 'Tirupati darshan'].map((idea) => {
          const th = tripTheme(idea);
          return (
            <Pressable key={idea} onPress={() => onNew(idea)} style={[st.row, { borderRadius: 50, backgroundColor: th.colors[1] + '1F', paddingHorizontal: 12, paddingVertical: 8 }]}>
              <Icon name={th.icon} size={16} color={th.colors[1]} /><Txt k="labelLarge"> {idea}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={onJoin} style={{ marginTop: 12, paddingVertical: 6 }}><Txt k="labelLarge" semi color={Brand.Blue}>Got a code from a friend? Join their trip</Txt></Pressable>
    </Appear>
  );
}
