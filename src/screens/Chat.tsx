/*
 * Chat between guests and hosts, WhatsApp-style: bubbles with the time, ✓ sent, ✓✓ delivered and blue ✓✓ once the other
 * person has read it. New messages arrive every few seconds while open.
 */
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { Api, errorText } from '../core/api';
import { useLoader } from '../core/state';
import { J, int, obj, objs, str, text } from '../core/json';
import * as Notifier from '../core/notifier';
import { Brand, Fonts } from '../theme';
import { Appear, EmptyBox, ErrorBox, Icon, Loading, Notice, Photo, Press, Txt, ColorHeader, clock, initialsOf, parseIso, st , HeadButton, TopBar } from '../ui/kit';
import { Pulse, RED_GRAD, SUN_GRAD } from '../ui/cards';
import { Nav, intParam, useParams } from '../nav';

export const Wallpaper = 'rgba(255,255,255,0.35)';   // glass: the app's backdrop shows through the chat
const MineBubble = '#FFE9B0';
const ReadBlue = '#34B7F1';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; };
export const timeOf = (at?: string | null) => { const d = parseIso(at); return d ? clock(d) : ''; };
export function dayLabel(at?: string | null) {
  const d = parseIso(at); if (!d) return '';
  if (sameDay(d, new Date())) return 'Today';
  if (sameDay(d, yesterday())) return 'Yesterday';
  return `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}
/** Short time for a list: "4:05 pm", "Yesterday", "12 Oct". */
export function listTime(at?: string | null) {
  const d = parseIso(at); if (!d) return '';
  if (sameDay(d, new Date())) return clock(d);
  if (sameDay(d, yesterday())) return 'Yesterday';
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** A faint pattern of dots behind the messages (the chat "wallpaper"). */
export function WallpaperBg() {
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <Pattern id="dots" width={46} height={92} patternUnits="userSpaceOnUse">
          <Circle cx={0} cy={0} r={2.4} fill="#B81D2B" fillOpacity={0.08} /><Circle cx={46} cy={0} r={2.4} fill="#B81D2B" fillOpacity={0.08} />
          <Circle cx={23} cy={46} r={2.4} fill="#B81D2B" fillOpacity={0.08} />
          <Circle cx={0} cy={92} r={2.4} fill="#B81D2B" fillOpacity={0.08} /><Circle cx={46} cy={92} r={2.4} fill="#B81D2B" fillOpacity={0.08} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={Wallpaper} />
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

/** One message bubble with its time and, on my own messages, the ticks. */
function Bubble({ m, mine, seenUpTo, sending, otherName }: { m: J; mine: boolean; seenUpTo: number; sending: boolean; otherName: string }) {
  const from = text(m, 'from');
  if (from === 'system') return <View style={{ alignItems: 'center', paddingHorizontal: 30, paddingVertical: 2 }}><View style={{ borderRadius: 12, backgroundColor: '#FFF6D6', paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelMedium" center color={Brand.InkSoft}>{text(m, 'body')}</Txt></View></View>;
  const o = obj(m, 'offer');
  return (
    <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <View style={{ maxWidth: 300, backgroundColor: mine ? MineBubble : '#fff', borderRadius: 18, borderTopRightRadius: mine ? 4 : 18, borderTopLeftRadius: mine ? 18 : 4, paddingLeft: 12, paddingRight: 10, paddingTop: 7, paddingBottom: 5, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } }}>
        {!mine && from === 'ai' ? <Txt k="labelSmall" color={Brand.Blue}>TripArro AI</Txt> : null}
        <Txt>{text(m, 'body')}</Txt>
        {o ? <Txt k="labelMedium" bold color={Brand.TealDark} style={{ marginTop: 4 }}>🏷 {text(o, 'percent').replace(/\.0$/, '')}% off · code {text(o, 'code')}</Txt> : null}
        <View style={[st.row, { alignSelf: 'flex-end', marginTop: 2 }]}>
          <Txt k="labelSmall" color={Brand.Muted}>{timeOf(str(m, 'at'))}</Txt>
          {mine ? (sending ? <Icon name="schedule" size={14} color={Brand.Muted} style={{ marginLeft: 4 }} />
            : <Icon name="done-all" size={16} color={int(m, 'id') <= seenUpTo ? ReadBlue : Brand.Muted} style={{ marginLeft: 4 }} />) : null}
        </View>
      </View>
    </View>
  );
}

/** The chat window used by guests and hosts. [load] fetches messages after an id (and marks them read); [send] posts one. */
function ChatWindow({ title, sub, avatar, me, otherName, start, load, send, footer }: {
  title: string; sub: string; avatar: string; me: string; otherName: string;
  start: () => Promise<J>; load: (after: number) => Promise<J>; send: (body: string, after: number) => Promise<J>;
  footer?: (info: J | null, take: (j: J) => void) => ReactNode;
}) {
  const [msgs, setMsgs] = useState<J[]>([]);
  const [info, setInfo] = useState<J | null>(null);
  const [seen, setSeen] = useState(0);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const list = useRef<FlatList<J>>(null);
  const state = useRef({ loaded: false, ids: new Set<number>(), max: 0 }).current;
  const take = (j: J) => {
    setInfo(j);
    setSeen((s) => Math.max(s, int(j, 'seen_by_other')));
    const fresh = objs(j, 'messages').filter((m) => !state.ids.has(int(m, 'id')));
    fresh.forEach((m) => { state.ids.add(int(m, 'id')); state.max = Math.max(state.max, int(m, 'id')); });
    if (fresh.length) setMsgs((x) => [...x, ...fresh]);
    // a reply from the other side while the chat is open: the phone's notification sound (the person can turn it off)
    if (state.loaded && fresh.some((m) => text(m, 'from') !== me && text(m, 'from') !== 'system')) Notifier.chime();
    state.loaded = true; setLoaded(true);
  };
  useEffect(() => {
    let alive = true;
    start().then((j) => alive && take(j)).catch((e) => { if (alive) { setErr(errorText(e)); setLoaded(true); state.loaded = true; } });
    const t = setInterval(() => { load(state.max).then((j) => alive && take(j)).catch(() => {}); }, 4000);   // new messages and read ticks while open
    return () => { alive = false; clearInterval(t); };
  }, []);
  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80); }, [msgs.length, pending]);
  const doSend = async () => {
    const b = body.trim(); if (!b || pending) return;
    setPending(b); setBody(''); setErr(null);
    try { take(await send(b, state.max)); } catch (e) { setErr(errorText(e)); setBody(b); }
    setPending(null);
  };
  const rows = pending ? [...msgs, { id: Number.MAX_SAFE_INTEGER, from: me, body: pending, at: new Date().toISOString(), _pending: true }] : msgs;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar style={[st.row, { paddingTop: 8, paddingBottom: 10 }]}>
        <HeadButton icon="arrow-back" label="Back" onPress={Nav.back} />
        <View style={{ width: 42, height: 42, borderRadius: 21, marginLeft: 10, backgroundColor: Brand.Sun, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleSmall" color={Brand.Ink}>{avatar}</Txt></View>
        <View style={{ flex: 1, paddingLeft: 10 }}>
          <Txt k="titleMedium" color="#fff" numberOfLines={1}>{title}</Txt>
          <Txt k="labelMedium" color="#FFE3E1" numberOfLines={1}>{sub}</Txt>
        </View>
      </TopBar>
      <View style={{ flex: 1 }}>
        <WallpaperBg />
        {!loaded ? <Loading /> : null}
        <FlatList ref={list} data={rows} keyExtractor={(m) => String(int(m, 'id'))} contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 12, gap: 6 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: m, index: i }) => {
            const day = dayLabel(str(m, 'at'));
            const showDay = !m._pending && day && (i === 0 || dayLabel(str(rows[i - 1], 'at')) !== day);
            return (
              <View>
                {showDay ? <View style={{ alignItems: 'center', paddingVertical: 6 }}><View style={{ borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4 }}><Txt k="labelSmall" color={Brand.InkSoft}>{day}</Txt></View></View> : null}
                <Appear><Bubble m={m} mine={text(m, 'from') === me} seenUpTo={seen} sending={!!m._pending} otherName={otherName} /></Appear>
              </View>
            );
          }} />
      </View>
      {err ? <Notice text={err} tone="bad" style={{ margin: 8 }} /> : null}
      {footer?.(info, take)}
      <View style={[st.row, { backgroundColor: 'rgba(255,255,255,0.92)', margin: 10, marginTop: 4, borderRadius: 32, padding: 6, alignItems: 'flex-end', borderWidth: 1.5, borderColor: '#fff', elevation: 12, shadowColor: '#C8242B', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 5 } }]}>
        <TextInput value={body} onChangeText={setBody} placeholder="Message" placeholderTextColor="#A59C97" multiline cursorColor={Brand.Blue}
          style={{ flex: 1, maxHeight: 120, backgroundColor: '#FBF6F3', borderRadius: 26, paddingHorizontal: 18, paddingVertical: 12, fontFamily: Fonts.regular, fontSize: 16, color: Brand.Ink, elevation: 1 }} accessibilityLabel="Message" />
        <Press onPress={doSend} disabled={!body.trim() || !!pending} style={{ marginLeft: 8, width: 52, height: 52, borderRadius: 26, overflow: 'hidden', elevation: 4 }} accessibilityLabel="Send">
          <LinearGradient colors={body.trim() ? (SUN_GRAD as any) : ['#E6DCD3', '#E6DCD3']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="send" color={Brand.SunInk} /></LinearGradient>
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Guest: chat about a stay or resort (TripArro AI first when it is on, the host any time). */
export function ChatScreen() {
  const p = useParams();
  return <GuestChat start={() => Api.post('chat/start', { kind: p.kind || 'stay', id: intParam(p.id) })} />;
}
/** Guest: an existing chat from Messages. */
export function ChatTokenScreen() {
  const token = useParams().token || '';
  return <GuestChat start={() => Api.get(`chat/${token}`)} />;
}

function GuestChat({ start }: { start: () => Promise<J> }) {
  const tok = useRef<string>('');
  const [head, setHead] = useState<J | null>(null);
  const host = head ? text(head, 'host_name', 'the host') : 'the host';
  return (
    <ChatWindow title={head ? text(obj(head, 'listing'), 'title', 'Chat') : 'Chat'} sub={text(head, 'mode') === 'ai' ? `TripArro AI answers now · ${host} can join` : `Chat with ${host}`}
      avatar={initialsOf(host)} me="guest" otherName={host}
      start={async () => { const j = await start(); tok.current = text(j, 'token'); setHead(j); return j; }}
      load={async (after) => { const j = await Api.get(`chat/${tok.current}`, { after }); setHead(j); return j; }}
      send={async (body, after) => { const j = await Api.post(`chat/${tok.current}/message`, { body, after }); setHead(j); return j; }}
      footer={(info, take) => info && text(info, 'mode') === 'ai' ? (
        <View style={{ backgroundColor: Wallpaper, paddingHorizontal: 12, alignItems: 'center' }}>
          <Press onPress={() => { if (tok.current) Api.post(`chat/${tok.current}/human`, {}).then(take).catch(() => {}); }} style={{ borderRadius: 50, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Txt k="labelLarge" color={Brand.BlueDark}>🙋 Talk to the host</Txt>
          </Press>
        </View>
      ) : null} />
  );
}

/** Host: a guest's chat about one of my listings. */
export function HostChatScreen() {
  const id = intParam(useParams().id);
  const [head, setHead] = useState<J | null>(null);
  const guest = head ? text(head, 'guest', 'Guest') : 'Guest';
  return (
    <ChatWindow title={guest} sub={text(obj(head, 'listing'), 'title')} avatar={initialsOf(guest)} me="host" otherName={guest}
      start={async () => { const j = await Api.get(`hostapp/chats/${id}`); setHead(j); return j; }}
      load={(after) => Api.get(`hostapp/chats/${id}`, { after })}
      send={(body, after) => Api.post(`hostapp/chats/${id}`, { body, after })} />
  );
}

/** A list of chats (guest's Messages, or the host's guest chats). */
export function ChatList({ chats, host, open }: { chats: J[]; host: boolean; open: (c: J) => void }) {
  if (!chats.length) return <EmptyBox title={host ? 'No guest chats yet' : 'No messages yet'} text={host ? 'When a guest asks about your listing, the chat shows up here.' : 'Ask a host a question from any stay or resort page — the chat shows up here.'} icon="chat-bubble-outline" />;
  return (
    <View>
      {chats.map((c, i) => {
        const name = host ? text(c, 'guest', 'Guest') : text(c, 'listing');
        const unread = int(c, 'unread');
        const mineLast = text(c, 'last_from') === (host ? 'host' : 'guest');
        return (
          <Appear key={i} index={i}>
            <Press onPress={() => open(c)} scaleTo={0.98} style={[st.row, { paddingHorizontal: 16, paddingVertical: 10 }]}>
              <View style={{ width: 52, height: 52 }}>
                {str(c, 'image') && !host ? <Photo url={str(c, 'image')} corner={26} style={{ width: 52, height: 52 }} />
                  : <LinearGradient colors={SUN_GRAD as any} style={{ flex: 1, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}><Txt k="titleMedium" color={Brand.SunInk}>{initialsOf(name)}</Txt></LinearGradient>}
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={st.row}>
                  <Txt k="titleSmall" numberOfLines={1} style={{ flex: 1 }}>{name}</Txt>
                  <Txt k="labelSmall" color={unread > 0 ? Brand.Blue : Brand.Muted}>{listTime(str(c, 'at'))}</Txt>
                </View>
                <View style={[st.row, { marginTop: 2 }]}>
                  {mineLast ? <Icon name="done-all" size={15} color={Brand.Muted} style={{ marginRight: 3 }} /> : null}
                  <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={1} style={{ flex: 1 }}>{(host ? text(c, 'listing') + ' · ' : `${text(c, 'host')}: `) + text(c, 'last')}</Txt>
                  {unread > 0 ? <Pulse><View style={{ marginLeft: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: Brand.Blue, alignItems: 'center', justifyContent: 'center' }}><Txt k="labelSmall" color="#fff">{unread > 9 ? '9+' : unread}</Txt></View></Pulse> : null}
                </View>
              </View>
            </Press>
          </Appear>
        );
      })}
    </View>
  );
}

/** Guest: Messages — every chat with hosts. */
export function MessagesScreen() {
  const l = useLoader(() => Api.get('chat/mine'));
  useEffect(() => { const t = setInterval(l.reload, 15000); return () => clearInterval(t); }, []);
  const d = l.data;
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Messages" sub="Your chats with hosts" onBack={Nav.back} />
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your messages.'} onRetry={l.reload} /> : (
        <FlatList data={[0]} keyExtractor={() => 'x'} renderItem={() => <ChatList chats={objs(d, 'chats')} host={false} open={(c) => Nav.navigate(`chatt/${text(c, 'token')}`)} />} />
      )}
    </View>
  );
}
