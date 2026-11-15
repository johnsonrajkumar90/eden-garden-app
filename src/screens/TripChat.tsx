/*
 * Trip chat, laid out like WhatsApp: everyone who joined the trip, bubbles with the sender's name in their own colour,
 * time and a sent tick, day dividers, a doodle wallpaper and a round send button. New messages show up every few seconds.
 * Long-press your own message to delete it; ⋮ → Clear chat.
 */
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Api, errorText } from '../core/api';
import { J, bool, int, objs, str, text } from '../core/json';
import { Brand, Fonts } from '../theme';
import { ErrorBox, Icon, Loading, Txt, clock, parseIso, st, MONTHS , HeadButton, TopBar } from '../ui/kit';
import { Dialog } from '../ui/sheets';
import { TripCover } from './GroupsUi';
import { Nav, intParam, useParams } from '../nav';

const Wallpaper = '#EFE7DE', Mine = '#D9FDD3', WaGreen = '#00A884', TimeGrey = '#667781';
const NameColors = ['#1F7AEC', '#D62976', '#0E9F6E', '#B45309', '#7C3AED', '#DC2626', '#0891B2', '#65A30D'];
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dayLabel(at: string) {
  const d = parseIso(at); if (!d) return '';
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - x.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 6) return WEEK[d.getDay()];
  return `${d.getDate()} ${FULL_MON[d.getMonth()]} ${d.getFullYear()}`;
}
const timeOf = (at: string) => { const d = parseIso(at); return d ? clock(d) : ''; };

type Row = { day: string } | { m: J; first: boolean; pending?: boolean };

/** WhatsApp-style doodle wallpaper: faint travel icons in a loose grid. */
function Doodles() {
  const { width, height } = useWindowDimensions();
  const icons = ['flight', 'place', 'luggage', 'beach-access', 'camera-alt', 'hotel'];
  const step = 62; const out: React.ReactElement[] = [];
  for (let row = 0, y = 0; y < height + step; row++, y += step)
    for (let col = 0, x = row % 2 === 0 ? 0 : step / 2; x < width + step; col++, x += step)
      out.push(<MaterialIcons key={`${row}-${col}`} name={icons[(row * 3 + col) % icons.length] as any} size={22} color="#00000014" style={{ position: 'absolute', left: x, top: y }} />);
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: Wallpaper }}>{out}</View>;
}

export default function TripChatScreen() {
  const id = intParam(useParams().id);
  const [g, setG] = useState<J | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<J | null>(null);
  const [menu, setMenu] = useState(false);
  const [clearing, setClearing] = useState(false);
  const list = useRef<FlatList<Row>>(null);
  // load, then keep it fresh while the chat is open
  useEffect(() => {
    let alive = true;
    const load = () => Api.get(`trip-groups/${id}`).then((j) => { if (alive) { setG(j); setErr(null); } }).catch((e) => { if (alive) setErr((x) => x || errorText(e)); });
    load(); const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);
  const send = async () => {
    const msg = body.trim(); if (!msg) return;
    setBody(''); setPending((p) => [...p, msg]);
    try { setG(await Api.post(`trip-groups/${id}/items`, { kind: 'message', body: msg })); } catch (e) { setErr(errorText(e)); setBody(msg); }
    setPending((p) => p.filter((x) => x !== msg));
  };
  const clear = async (forAll: boolean) => { setClearing(false); try { setG(await Api.post(`trip-groups/${id}/chat/clear`, forAll ? { for: 'all' } : {})); } catch (e) { setErr(errorText(e)); } };

  const msgs = objs(g, 'messages');
  const colorOf: Record<number, string> = {};
  objs(g, 'members').filter((m) => !bool(m, 'you')).forEach((m, i) => { colorOf[int(m, 'id')] = NameColors[i % NameColors.length]; });
  const rows: Row[] = [];
  let lastDay = ''; let lastUid = -1;
  msgs.forEach((m) => {
    const day = dayLabel(text(m, 'at'));
    if (day !== lastDay) { rows.push({ day }); lastDay = day; lastUid = -1; }
    rows.push({ m, first: int(m, 'uid') !== lastUid }); lastUid = int(m, 'uid');
  });
  pending.forEach((p) => { rows.push({ m: { body: p, mine: true, at: '' }, first: lastUid !== -2, pending: true }); lastUid = -2; });
  useEffect(() => { if (rows.length) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80); }, [rows.length]);
  const names = objs(g, 'members').sort((a, b) => Number(bool(a, 'you')) - Number(bool(b, 'you'))).map((m) => (bool(m, 'you') ? 'You' : text(m, 'name').split(' ')[0]));
  const owner = bool(g, 'owner');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Wallpaper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar style={st.row}>
        <HeadButton icon="arrow-back" label="Back" onPress={Nav.back} />
        <View style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', marginLeft: 10 }}><TripCover cover={str(g, 'cover')} name={text(g, 'title') + ' ' + text(g, 'destination')} style={{ flex: 1 }} iconSize={26} /></View>
        <View style={{ flex: 1, paddingLeft: 10 }}>
          <Txt k="titleMedium" semi color="#fff" numberOfLines={1}>{text(g, 'title') || 'Trip chat'}</Txt>
          <Txt k="bodySmall" color="#FFE3E1" numberOfLines={1}>{names.join(', ') || 'Everyone in the trip'}</Txt>
        </View>
        <HeadButton icon="more-vert" label="More" onPress={() => setMenu(true)} />
      </TopBar>
      <View style={{ flex: 1 }}>
        <Doodles />
        {!g && !err ? <Loading /> : !g ? <ErrorBox message={err || 'Could not open the chat.'} /> : (
          <FlatList ref={list} data={rows} keyExtractor={(r, i) => ('day' in r ? 'd' + r.day : 'm' + (int(r.m, 'id') || 'p' + i))} contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={<>
              <View style={{ marginHorizontal: 30, marginVertical: 6, borderRadius: 10, backgroundColor: '#FFF3C4', padding: 10 }}><Txt k="labelSmall" center color="#54656F">Messages here are seen only by the people in this trip.</Txt></View>
              {!msgs.length && !pending.length ? <Txt center color={TimeGrey} style={{ padding: 24 }}>Say hello 👋 — plan who brings what, where to meet and when to leave.</Txt> : null}
            </>}
            renderItem={({ item: r }) => {
              if ('day' in r) return <View style={{ alignItems: 'center', paddingVertical: 8 }}><View style={[st.shadow, { borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 5, elevation: 1 }]}><Txt k="labelMedium" color="#54656F">{r.day}</Txt></View></View>;
              const m = r.m; const mine = bool(m, 'mine');
              return (
                <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: r.first ? 6 : 2 }}>
                  {!mine && r.first ? <View style={{ width: 0, height: 0, borderTopWidth: 12, borderLeftWidth: 10, borderTopColor: '#fff', borderLeftColor: 'transparent', marginRight: -1 }} /> : !mine ? <View style={{ width: 9 }} /> : null}
                  <Pressable onLongPress={() => { if (mine && !r.pending && bool(m, 'can_delete')) setDeleting(m); }} delayLongPress={350}
                    style={{ minWidth: 90, maxWidth: 300, backgroundColor: mine ? Mine : '#fff', borderRadius: 11, borderTopLeftRadius: !mine && r.first ? 0 : 11, borderTopRightRadius: mine && r.first ? 0 : 11,
                      paddingHorizontal: 10, paddingTop: 6, paddingBottom: 5, elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } }}>
                    {!mine && r.first ? <Txt k="labelMedium" semi color={colorOf[int(m, 'uid')] || NameColors[0]}>{text(m, 'by')}</Txt> : null}
                    <Txt style={{ fontSize: 15.5, lineHeight: 21, color: '#111B21' }}>{text(m, 'body')}</Txt>
                    <View style={[st.row, { alignSelf: 'flex-end' }]}>
                      <Txt style={{ fontSize: 11, color: TimeGrey }}>{r.pending ? '' : timeOf(text(m, 'at'))}</Txt>
                      {mine ? <Icon name={r.pending ? 'access-time' : 'done'} size={14} color={TimeGrey} style={{ marginLeft: 3 }} /> : null}
                    </View>
                  </Pressable>
                  {mine && r.first ? <View style={{ width: 0, height: 0, borderTopWidth: 12, borderRightWidth: 10, borderTopColor: Mine, borderRightColor: 'transparent', marginLeft: -1 }} /> : mine ? <View style={{ width: 9 }} /> : null}
                </View>
              );
            }} />
        )}
      </View>
      <View style={[st.row, { padding: 6, alignItems: 'flex-end' }]}>
        <TextInput value={body} onChangeText={(v) => setBody(v.slice(0, 2000))} placeholder="Message" placeholderTextColor={TimeGrey} multiline cursorColor={WaGreen}
          style={{ flex: 1, maxHeight: 130, borderRadius: 26, backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 12, fontFamily: Fonts.regular, fontSize: 16, color: '#111B21', elevation: 1 }} accessibilityLabel="Message" />
        <Pressable onPress={send} disabled={!body.trim()} style={{ marginLeft: 6, width: 50, height: 50, borderRadius: 25, backgroundColor: body.trim() ? WaGreen : '#8FCFBF', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Send">
          <Icon name="send" size={22} color="#fff" style={{ marginLeft: 3 }} />
        </Pressable>
      </View>
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)}>
          <View style={[st.shadow, { position: 'absolute', top: 60, right: 10, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 6, minWidth: 180 }]}>
            <Pressable onPress={() => { setMenu(false); setClearing(true); }} style={[st.row, { paddingHorizontal: 16, paddingVertical: 12 }]}><Icon name="delete-sweep" /><Txt>  Clear chat</Txt></Pressable>
          </View>
        </Pressable>
      </Modal>
      <Dialog open={clearing} onClose={() => setClearing(false)} title="Clear this chat?"
        text={owner ? 'Clear it just for you — or, as the person who made the trip, delete all messages for everyone.' : 'The messages are cleared just for you. Others in the trip still see them.'}
        actions={[['Cancel', () => setClearing(false), Brand.InkSoft], ['Clear for me', () => clear(false)], ...(owner ? [['Clear for everyone', () => clear(true), '#D7192A'] as [string, () => void, string]] : [])]} />
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete message?" text="It is removed for everyone in the trip."
        actions={[['Cancel', () => setDeleting(null), Brand.InkSoft], ['Delete', async () => { const m = deleting; setDeleting(null); if (m) { try { setG(await Api.post(`trip-groups/${id}/items/${int(m, 'id')}/delete`)); } catch (e) { setErr(errorText(e)); } } }, Brand.Danger]]} />
    </KeyboardAvoidingView>
  );
}
