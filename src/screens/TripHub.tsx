/*
 * One group trip, as a dark glass dashboard: the trip photos sliding by, dates and name, trip readiness, chat and
 * travellers, an invite strip, four shortcuts (add to the plan, trip docs, expenses, checklist), then posts, the plan,
 * favourites and the map. Sheets: add, people, docs, checklist, readiness, expenses (with receipt scan), favourites, photo.
 */
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Linking, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { LiquidLayer } from '../ui/liquid';
import { BlurView } from 'expo-blur';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Api, Upload, errorText } from '../core/api';
import { AppState } from '../core/state';
import { J, arr, bool, int, num, obj, objs, str, text } from '../core/json';
import { Picked, pickPhoto, shrinkPhoto, uploadOf } from '../core/files';
import { readLines, rows as textRows } from '../core/reader';
import { Brand, Fonts } from '../theme';
import { Appear, ErrorBox, Gap, Icon, LinkButton, Loading, Notice, OutlineButton, Press, PrimaryButton, Txt, money, parseIso, shareLink, st, DAYS, MONTHS , HeadButton, TopBar } from '../ui/kit';
import { Field } from '../ui/inputs';
import { Dialog, Sheet } from '../ui/sheets';
import { AddToGroup, GroupItem, GroupMap, InviteCard, ShareTripDialog, openGroupUrl } from './Groups';
import { TripCover } from './GroupsUi';
import { PostsPanel } from './TripPosts';
import { AlbumsPanel } from './TripAlbums';
import { CoverSheet, LiveSpot, PlaceSource } from './TripExtras';
import { RestaurantsRow } from './Restaurants';
import { Nav, intParam, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

// light glass (white, red and sun-yellow): frosted white panels over the app's glowing backdrop
const Frost = '#FDECEC', FrostLine = 'rgba(255,255,255,0.95)', Soft = Brand.InkSoft;
const niceDay = (iso?: string | null) => { const d = parseIso(iso); return d ? `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` : ''; };
const darkGlass = { borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.98)', shadowColor: '#D93338', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 };

export default function GroupTripScreen() {
  const id = intParam(useParams().id);
  const [data, setData] = useState<J | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tab, setTab] = useState('posts');
  const [sheet, setSheet] = useState('');   // add, docs, expenses, checklist, people, readiness, fav
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [coverMenu, setCoverMenu] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<J | null>(null);   // a plan item being changed
  const load = () => { setLoading(true); Api.get(`trip-groups/${id}`).then((j) => { setData(j); setLoadErr(null); }).catch((e) => setLoadErr(errorText(e))).finally(() => setLoading(false)); };
  useEffect(load, [id]);
  const act = async (path: string, body: Record<string, any> = {}) => { try { setData(await Api.post(path, body)); setErr(null); } catch (e) { setErr(errorText(e)); } };
  const upload = async (path: string, fields: [string, string][], photo: Picked | null, after?: () => void) => {
    setBusy(true);
    try { const files: Upload[] = photo ? [await uploadOf('photo', photo, 'tg')] : []; setData(await Api.postMultipart(path, fields, files)); setErr(null); after?.(); }
    catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  const g = data;
  if (!g) return (
    <View style={{ flex: 1 }}>
      <TopRow g={null} onCamera={() => {}} />
      {loading ? <Loading /> : <View style={{ backgroundColor: '#fff', margin: 16, borderRadius: 20 }}><ErrorBox message={loadErr || 'This trip was not found.'} onRetry={load} /></View>}
    </View>
  );
  const r = obj(g, 'readiness') || {};
  const msgs = objs(g, 'messages'); const last = msgs[msgs.length - 1];
  const members = objs(g, 'members');
  const items = objs(g, 'items');
  const docs = items.filter((x) => ['booking', 'ticket'].includes(text(x, 'kind'))).length;
  const todos = items.filter((x) => text(x, 'kind') === 'todo');
  const ex = obj(g, 'expenses') || {};
  const d1 = niceDay(str(g, 'start_date')); const d2 = niceDay(str(g, 'end_date'));
  const dest = arr<number>(g, 'dest');

  return (
    <View style={{ flex: 1 }}>
      <TopRow g={g} onCamera={() => setCoverMenu(true)} />
      <ScrollView contentContainerStyle={{ paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 360, marginHorizontal: 12, marginTop: 12, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' }}>
          <TripSlider g={g} />
          <LinearGradient pointerEvents="none" colors={['#00000044', '#00000000', '#00000088', '#000000B3']} locations={[0, 0.35, 0.7, 1]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 96 }}>
            {d1 ? <Txt k="titleMedium" color="#fff">{d2 && d2 !== d1 ? `${d1}  →  ${d2}` : d1}</Txt> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text numberOfLines={3} style={{ flex: 1, color: '#fff', fontSize: 34, lineHeight: 38, fontFamily: Fonts.b }}>{text(g, 'title')}</Text>
              <Txt k="titleSmall" color={Brand.Sun} style={{ marginLeft: 8, marginBottom: 6 }} onPress={() => setSheet('expenses')}>Track spending ›</Txt>
            </View>
          </View>
          <Pressable onPress={() => setSheet('readiness')} style={{ position: 'absolute', left: 16, right: 16, bottom: 12, borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: FrostLine }}>
            <BlurView intensity={45} tint="light" experimentalBlurMethod="dimezisBlurView" style={[st.row, { padding: 12, backgroundColor: 'rgba(255,255,255,0.72)' }]}>
              <Ring percent={int(r, 'percent')} />
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Txt k="titleMedium">Trip readiness</Txt>
                <Txt k="bodySmall" color={Soft}>{int(r, 'left') === 0 ? 'All set — have a great trip!' : int(r, 'left') === 1 ? 'One thing left to sort' : 'A few things left to sort'}</Txt>
              </View>
              <Icon name="keyboard-arrow-right" color={Brand.Blue} />
            </BlurView>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {err ? <Notice text={err} tone="bad" style={{ marginBottom: 10 }} /> : null}
          {bool(g, 'ended') ? <Notice text={bool(g, 'owner') ? 'You ended this trip. The plan and expenses are closed; photos, posts and albums stay. Open it again in Who\'s going.' : 'This trip has ended. Photos, posts and albums stay here.'} tone="ok" style={{ marginBottom: 10 }} /> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DarkTile onPress={() => Nav.navigate(`groupchat/${id}`)}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Frost, alignItems: 'center', justifyContent: 'center' }}><Icon name="chat-bubble" color={Brand.Blue} /></View>
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Txt k="titleSmall">Trip chat</Txt>
                <Txt k="bodySmall" color={Soft} numberOfLines={1}>{last ? (bool(last, 'mine') ? 'You' : text(last, 'by').split(' ')[0]) + ': ' + text(last, 'body') : 'Say hello'}</Txt>
              </View>
            </DarkTile>
            <DarkTile onPress={() => setSheet('people')}>
              <Avatars initials={members.map((m) => text(m, 'initial'))} size={34} />
              <View style={{ flex: 1, paddingLeft: 8 }}>
                <Txt k="titleSmall">{members.length} traveller{members.length === 1 ? '' : 's'}</Txt>
                <Txt k="bodySmall" color={Soft}>See all</Txt>
              </View>
            </DarkTile>
          </View>
          <Gap />
          <Press onPress={() => setInviting(true)} style={[st.row, { borderRadius: 30, backgroundColor: 'rgba(255,246,214,0.92)', borderWidth: 1.5, borderColor: '#FFD54A', paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#E0A800', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }]}>
            <Icon name="person-add-alt" color={Brand.SunInk} />
            <Txt k="titleSmall" color={Brand.SunInk} style={{ flex: 1, marginLeft: 10 }}>{members.length < 2 ? 'Invite family & friends' : 'Invite more people'}</Txt>
            <Txt k="titleSmall" color={Brand.Ink}>· Code {text(g, 'code')}</Txt>
          </Press>
          <Gap />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Shortcut icon="add" ball={['#FFE4DE', '#FF8A7A']} tint="#B81D2B" label={'Add to\nthe plan'} onPress={() => setSheet('add')} />
            <Shortcut icon="folder" ball={['#FFF2D6', '#E8B45A']} tint="#7A4A00" label={'Trip\ndocs'} badge={docs > 0 ? String(docs) : null} onPress={() => setSheet('docs')} />
            <Shortcut icon="account-balance-wallet" ball={['#DDF3EA', '#5CC29A']} tint="#0F5C40" label={'Trip\nexpenses'} badge={(num(ex, 'total') || 0) > 0 ? money(num(ex, 'total')) : null} onPress={() => setSheet('expenses')} />
            <Shortcut icon="checklist" ball={['#E3E8FF', '#8C9BF2']} tint="#26338A" label={'Trip\nchecklist'} badge={todos.length ? `${todos.filter((t) => bool(t, 'done')).length}/${todos.length}` : null} onPress={() => setSheet('checklist')} />
          </View>
          <Gap h={18} />
          <View style={[darkGlass, { flexDirection: 'row', borderRadius: 30, padding: 5 }]}>
            {[['posts', 'Posts'], ['plan', 'Plan'], ['albums', 'Albums'], ['fav', 'Places'], ['map', 'Map']].map(([v, t]) => (
              <Pressable key={v} onPress={() => setTab(v)} style={{ flex: 1, borderRadius: 26, backgroundColor: tab === v ? Brand.Blue : 'transparent', paddingVertical: 12, alignItems: 'center' }} accessibilityRole="tab" accessibilityState={{ selected: tab === v }}>
                <Txt k="labelLarge" numberOfLines={1} color={tab === v ? '#fff' : Brand.InkSoft}>{t}</Txt>
              </Pressable>
            ))}
          </View>
          <Gap h={14} />
        </View>
        {tab === 'map' ? <GroupMap g={g} tall /> : (
          <View style={[darkGlass, { marginHorizontal: 12, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)', padding: 16 }]}>
            {tab === 'fav' ? (
              <>
                <FavouritesPanel g={g} onAdd={() => setSheet('fav')} toggle={(iid) => act(`trip-groups/${id}/items/${iid}/toggle`)} del={(iid) => act(`trip-groups/${id}/items/${iid}/delete`)} />
                {dest.length === 2 ? (
                  <><Gap h={16} />
                    {/* good places to eat at the destination (Google): one tap saves it for the whole group */}
                    <RestaurantsRow lat={dest[0]} lng={dest[1]} title={'Where to eat in ' + (text(g, 'destination') || 'the area')} onSave={(rr) => act(`trip-groups/${id}/items`, {
                      kind: 'fav', title: text(rr, 'name'), category: /caf|bakery/i.test(text(rr, 'type')) ? 'cafe' : 'restaurant', place_id: text(rr, 'place_id'), address: text(rr, 'address'),
                      maps_url: text(rr, 'maps_url'), photo_credit: text(rr, 'photo_credit'), google_rating: num(rr, 'rating'), lat: rr.lat, lng: rr.lng, google_photo: str(rr, 'photo'),
                    })} /></>
                ) : null}
              </>
            ) : tab === 'posts' ? <PostsPanel id={id} g={g} onData={setData} />
              : tab === 'albums' ? <AlbumsPanel id={id} g={g} onData={setData} />
              : <PlanPanel id={id} g={g} onAdd={() => setSheet('add')} act={act} onEdit={(it) => { setEditing(it); setSheet('edit'); }} />}
          </View>
        )}
      </ScrollView>

      {inviting ? <ShareTripDialog g={g} justMade={false} onClose={() => setInviting(false)} /> : null}
      <Sheet open={coverMenu} onClose={() => setCoverMenu(false)} style={{ backgroundColor: 'rgba(255,251,248,0.98)' }}>
        {err ? <Notice text={err} tone="bad" style={{ marginBottom: 8 }} /> : null}
        {coverMenu ? <CoverSheet id={id} g={g} busy={busy}
          onAlbum={async () => { const p = await pickPhoto('album'); if (p) upload(`trip-groups/${id}/cover`, [], p); }}
          onCamera={async () => { const p = await pickPhoto('camera'); if (p) upload(`trip-groups/${id}/cover`, [], p); }}
          onDesign={async (key) => { setBusy(true); try { setData(await Api.post(`trip-groups/${id}/cover`, { design: key })); setErr(null); } catch (e) { setErr(errorText(e)); } setBusy(false); }}
          onWeb={async (photo) => { setBusy(true); try { setData(await Api.post(`trip-groups/${id}/cover`, photo ? { google_photo: photo } : { auto: 1 })); setErr(null); } catch (e) { setErr(errorText(e)); } setBusy(false); }} /> : null}
      </Sheet>
      <Sheet open={!!sheet} onClose={() => { setSheet(''); setErr(null); }} style={{ backgroundColor: 'rgba(255,251,248,0.98)' }}>
        {/* what went wrong shows here, on the sheet — not hidden behind it */}
        {err ? <Notice text={err} tone="bad" style={{ marginBottom: 8 }} /> : null}
        {sheet === 'add' ? <AddToGroup id={id} done={(nd) => { setData(nd); setSheet(''); setTab('plan'); }} />
          : sheet === 'edit' && editing ? <AddToGroup id={id} item={editing} done={(nd) => { setData(nd); setSheet(''); setEditing(null); }} />
          : sheet === 'people' ? <PeopleSheet g={g} newCode={() => act(`trip-groups/${id}/code`)} remove={(uid) => act(`trip-groups/${id}/members/${uid}/remove`)}
            leave={async (how) => { setSheet(''); try { await Api.post(how === 'delete' ? `trip-groups/${id}/delete` : `trip-groups/${id}/leave`); AppState.bump(); Nav.back(); } catch (e) { setErr(errorText(e)); } }}
            cancelInvite={(inv) => act(`trip-groups/${id}/invites/${inv}/cancel`)} end={(ended) => { act(`trip-groups/${id}/end`, { ended: ended ? 1 : 0 }); AppState.bump(); }} />
          : sheet === 'docs' ? (
            <SheetList title="Trip docs" sub="Stays and travel tickets the group has shared.">
              {!docs ? <Txt color={Brand.Muted}>Nothing yet — share your booking or ticket with “Add to the plan”.</Txt> : null}
              {items.filter((x) => ['booking', 'ticket'].includes(text(x, 'kind'))).map((it) => <GroupItem key={int(it, 'id')} item={it} toggle={() => {}} del={() => act(`trip-groups/${id}/items/${int(it, 'id')}/delete`)} />)}
            </SheetList>
          ) : sheet === 'checklist' ? <ChecklistSheet g={g} add={(t) => act(`trip-groups/${id}/items`, { kind: 'todo', title: t })} toggle={(iid) => act(`trip-groups/${id}/items/${iid}/toggle`)} del={(iid) => act(`trip-groups/${id}/items/${iid}/delete`)} />
          : sheet === 'readiness' ? (
            <SheetList title="Trip readiness" sub={`${int(r, 'percent')}% ready`}>
              {objs(r, 'steps').map((s, i) => (
                <View key={i} style={[st.row, { paddingVertical: 8 }]}>
                  <Icon name={bool(s, 'done') ? 'task-alt' : 'add'} color={bool(s, 'done') ? Brand.Teal : Brand.Muted} />
                  <Txt k="bodyLarge" color={bool(s, 'done') ? Brand.Ink : Brand.InkSoft} style={{ marginLeft: 10 }}>{text(s, 'label')}</Txt>
                </View>
              ))}
            </SheetList>
          ) : sheet === 'expenses' ? <ExpensesSheet id={id} g={g} add={(b) => act(`trip-groups/${id}/expenses`, b)} del={(eid) => act(`trip-groups/${id}/expenses/${eid}/delete`)} act={act} />
          : sheet === 'fav' ? <AddFavourite g={g} busy={busy} save={(fields, photo) => upload(`trip-groups/${id}/items`, fields, photo, () => { setSheet(''); setTab('fav'); })} />
          : null}
      </Sheet>
    </View>
  );
}

function TopRow({ g, onCamera }: { g: J | null; onCamera: () => void }) {
  // the red bar every screen has: back, the trip's name, invite, change photo
  return (
    <TopBar style={[st.row, { gap: 6 }]}>
      <HeadButton icon="arrow-back" label="Back" onPress={Nav.back} />
      <Txt k="titleMedium" semi color="#fff" numberOfLines={1} style={{ flex: 1, marginLeft: 6 }}>{text(g, 'title') || 'Your trip'}</Txt>
      {g ? (
        <>
          <HeadButton icon="share" label="Invite" onPress={() => shareLink(text(g, 'share_text'), text(g, 'link'))} />
          <Press onPress={onCamera} style={[st.row, { height: 44, borderRadius: 22, backgroundColor: Brand.Sun, paddingHorizontal: 14 }]}>
            <Icon name="photo-camera" size={18} color={Brand.Ink} style={{ marginRight: 6 }} /><Txt k="labelLarge" semi color={Brand.Ink}>Change photo</Txt>
          </Press>
        </>
      ) : null}
    </TopBar>
  );
}

/** The readiness ring: a white disc with the percent, the arc filling in. */
function Ring({ percent }: { percent: number }) {
  const R = 26; const C = 2 * Math.PI * R;
  return (
    <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={58} height={58} style={{ position: 'absolute' }}>
        <SvgCircle cx={29} cy={29} r={23} fill="#fff" />
        <SvgCircle cx={29} cy={29} r={R} stroke="#F5C9C6" strokeWidth={3} fill="none" />
        <SvgCircle cx={29} cy={29} r={R} stroke={Brand.Blue} strokeWidth={3} fill="none" strokeDasharray={`${(C * percent) / 100},${C}`} strokeLinecap="round" transform="rotate(-90 29 29)" />
      </Svg>
      <Text style={{ color: Brand.Ink, fontFamily: Fonts.bold, fontSize: 15 }}>{percent}%</Text>
    </View>
  );
}

function DarkTile({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return <Appear style={{ flex: 1 }}><Press onPress={onPress} style={[st.row, darkGlass, { borderRadius: 30, padding: 14 }]}>{children}</Press></Appear>;
}

function Avatars({ initials, size }: { initials: string[]; size: number }) {
  const shown = initials.slice(0, 3); const colors = ['#FFC72C', '#FF8A7A', '#8C9BF2', '#5CC29A'];
  return (
    <View style={{ width: size + size * 0.55 * Math.max(0, shown.length - 1), height: size }}>
      {shown.map((t, i) => <View key={i} style={{ position: 'absolute', left: size * 0.55 * i, width: size, height: size, borderRadius: size / 2, backgroundColor: colors[i % 4], borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: Brand.Ink }}>{t}</Text></View>)}
    </View>
  );
}

function Shortcut({ icon, ball, tint, label, badge, onPress }: { icon: string; ball: string[]; tint: string; label: string; badge?: string | null; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Appear>
        <Press onPress={onPress} style={[darkGlass, { paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center' }]} accessibilityLabel={label.replace('\n', ' ')}>
          <LinearGradient colors={ball as any} start={{ x: 0.3, y: 0.2 }} end={{ x: 1, y: 1 }} style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={28} color={tint} /></LinearGradient>
          <Txt k="labelMedium" color={Brand.Ink} center style={{ marginTop: 10, lineHeight: 15 }}>{label}</Txt>
        </Press>
      </Appear>
      {badge ? <View style={{ position: 'absolute', top: -4, right: -2, borderRadius: 50, backgroundColor: Brand.Sun, borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 7, paddingVertical: 2 }}><Text numberOfLines={1} style={{ fontFamily: Fonts.bold, fontSize: 11, color: Brand.Ink }}>{badge}</Text></View> : null}
    </View>
  );
}

/** The top of the trip: its photo, then recent photos from posts, favourites and stays — sliding every few seconds (or swipe). */
function TripSlider({ g }: { g: J }) {
  const { width } = useWindowDimensions();
  const slides = arr<string>(g, 'slides').map(String).filter(Boolean);
  const [page, setPage] = useState(0);
  const list = useRef<FlatList<string>>(null);
  const dragging = useRef(false);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => { if (!dragging.current) setPage((p) => { const n = (p + 1) % slides.length; list.current?.scrollToOffset({ offset: n * width, animated: true }); return n; }); }, 4500);
    return () => clearInterval(t);
  }, [slides.length, width]);
  if (slides.length <= 1) return <TripCover cover={slides[0] || str(g, 'cover')} name={text(g, 'title') + ' ' + text(g, 'destination')} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} iconSize={200} />;
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      <FlatList ref={list} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(u, i) => u + i}
        onScrollBeginDrag={() => { dragging.current = true; }} onMomentumScrollEnd={(e) => { dragging.current = false; setPage(Math.round(e.nativeEvent.contentOffset.x / width)); }}
        renderItem={({ item, index }) => <Image source={{ uri: item }} style={{ width, height: 360, backgroundColor: '#F3E6E2' }} contentFit="cover" accessibilityLabel={`Trip photo ${index + 1} of ${slides.length}`} />} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {slides.map((_, i) => <View key={i} style={{ height: 6, width: i === page ? 18 : 6, borderRadius: 3, backgroundColor: i === page ? '#fff' : '#FFFFFF88' }} />)}
      </View>
    </View>
  );
}

function SheetList({ title, sub, children }: { title: string; sub?: string | null; children: ReactNode }) {
  return <View><Txt k="titleLarge">{title}</Txt>{sub ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginBottom: 10 }}>{sub}</Txt> : null}{children}</View>;
}

function PlanPanel({ id, g, onAdd, act, onEdit }: { id: number; g: J; onAdd: () => void; act: (p: string) => void; onEdit: (it: J) => void }) {
  const items = objs(g, 'items').filter((x) => text(x, 'kind') !== 'fav');
  if (!items.length) return (
    <View>
      <Txt k="titleMedium">Start planning</Txt>
      <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginVertical: 6 }}>Share your booking or ticket, add places to visit with the day and a photo, notes and a packing list — everyone in the trip sees them, and each one is posted to the trip.</Txt>
      <PrimaryButton text="Add to the plan" icon="add" onPress={onAdd} />
    </View>
  );
  return (
    <View>
      <View style={[st.row, { marginBottom: 8 }]}>
        <Txt k="bodySmall" color={Brand.Muted} style={{ flex: 1 }}>Only the person who added something, or who made the trip, can change it.</Txt>
        <PrimaryButton text="Add" icon="add" onPress={onAdd} style={{ minHeight: 44, paddingVertical: 9, marginLeft: 8 }} />
      </View>
      {[['booking', 'Stays booked'], ['ticket', 'Travel tickets'], ['plan', 'Trip plans'], ['place', 'Places to visit'], ['todo', 'To-do & packing'], ['note', 'Notes']].map(([k, head]) => {
        const list = items.filter((x) => text(x, 'kind') === k);
        if (!list.length) return null;
        return (
          <View key={k}>
            <Txt k="titleMedium" style={{ marginTop: 6, marginBottom: 6 }}>{head}</Txt>
            {list.map((it) => <GroupItem key={int(it, 'id')} item={it} toggle={() => act(`trip-groups/${id}/items/${int(it, 'id')}/toggle`)} del={() => act(`trip-groups/${id}/items/${int(it, 'id')}/delete`)} edit={() => onEdit(it)} />)}
          </View>
        );
      })}
    </View>
  );
}

/** Favourite places: photo cards (own photo or Google), stars, note, visited tick — the whole group keeps the list. */
function FavouritesPanel({ g, onAdd, toggle, del }: { g: J; onAdd: () => void; toggle: (id: number) => void; del: (id: number) => void }) {
  const favs = objs(g, 'items').filter((x) => text(x, 'kind') === 'fav');
  const pairs: J[][] = []; favs.forEach((f, i) => { if (i % 2 === 0) pairs.push([f]); else pairs[pairs.length - 1].push(f); });
  return (
    <View>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Txt k="titleMedium">Favourite places</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{favs.length} saved · {favs.filter((f) => bool(obj(f, 'fav'), 'visited')).length} visited</Txt>
        </View>
        <PrimaryButton text="Add" icon="favorite" onPress={onAdd} style={{ width: 112 }} />
      </View>
      <Gap h={10} />
      {!favs.length ? <Txt color={Brand.InkSoft}>Found a great restaurant, café or view? Take a photo or find it on Google and save it here for everyone.</Txt> : null}
      {pairs.map((pair, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {pair.map((it) => <FavCard key={int(it, 'id')} item={it} toggle={() => toggle(int(it, 'id'))} del={() => del(int(it, 'id'))} />)}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function FavCard({ item, toggle, del }: { item: J; toggle: () => void; del: () => void }) {
  const f = obj(item, 'fav') || {};
  const [confirm, setConfirm] = useState(false);
  const coords = arr<number>(item, 'coords');
  const visited = bool(f, 'visited');
  return (
    <Appear style={{ flex: 1 }}>
      <Press onPress={() => { if (str(f, 'maps_url')) openGroupUrl(str(f, 'maps_url')); else if (coords.length === 2) openGroupUrl(`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`); }}
        style={{ borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, overflow: 'hidden' }}>
        <View style={{ aspectRatio: 1.1, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}>
          {str(f, 'photo') ? <Image source={{ uri: str(f, 'photo')! }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} contentFit="cover" accessibilityLabel={text(item, 'title')} /> : <Icon name="place" size={36} color={Brand.Coral} />}
          <View style={{ position: 'absolute', top: 8, left: 8, borderRadius: 50, backgroundColor: '#FFFFFFEE', paddingHorizontal: 8, paddingVertical: 3 }}><Txt k="labelSmall">{text(f, 'category_label')}</Txt></View>
          <Pressable onPress={toggle} style={{ position: 'absolute', top: 6, right: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: visited ? Brand.Teal : '#FFFFFFCC', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={visited ? 'Visited' : 'Mark visited'}>
            <Icon name="task-alt" size={20} color={visited ? '#fff' : Brand.Muted} />
          </Pressable>
          {text(f, 'photo_credit') ? <Text numberOfLines={1} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 9, color: '#fff', backgroundColor: '#00000066', paddingHorizontal: 6, paddingVertical: 2 }}>Photo: {text(f, 'photo_credit')} · Google</Text> : null}
        </View>
        <View style={{ padding: 10 }}>
          <Txt k="titleSmall" numberOfLines={2}>{text(item, 'title')}</Txt>
          <View style={st.row}>
            {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name={i < int(f, 'stars') ? 'star' : 'star-border'} size={14} color="#F2B01E" />)}
            {num(f, 'google_rating') !== null ? <Txt k="labelSmall" color={Brand.Muted}>  Google {num(f, 'google_rating')}</Txt> : null}
          </View>
          {str(item, 'body') ? <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={3}>{str(item, 'body')}</Txt> : null}
          <View style={st.row}>
            <Txt k="labelSmall" color={Brand.Muted} style={{ flex: 1 }}>by {text(item, 'by')}</Txt>
            {bool(item, 'can_delete') ? <Pressable onPress={() => setConfirm(true)} style={{ padding: 6 }} accessibilityLabel="Delete"><Icon name="delete-outline" size={18} color={Brand.Muted} /></Pressable> : null}
          </View>
        </View>
      </Press>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Remove ${text(item, 'title')}?`} actions={[['Keep', () => setConfirm(false), Brand.InkSoft], ['Remove', () => { setConfirm(false); del(); }]]} />
    </Appear>
  );
}

/** Save a favourite: find it on Google (photo, rating, map) or type it, add your own photo, stars and a note. */
function AddFavourite({ g, busy, save }: { g: J; busy: boolean; save: (fields: [string, string][], photo: Picked | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<J[]>([]);
  const [googleOn, setGoogleOn] = useState(bool(g, 'google_places'));
  const [picked, setPicked] = useState<J | null>(null);
  const [name, setName] = useState('');
  const [cat, setCat] = useState('restaurant');
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [here, setHere] = useState(false);       // "I'm here now": the phone's location, named by Google
  const [spot, setSpot] = useState<[string, number, number] | null>(null);
  const dest = arr<number>(g, 'dest');
  useEffect(() => {
    setSearchNote(null);
    if (q.length < 3 || !googleOn) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r = await Api.get('places/search', { q, ...(dest.length === 2 ? { lat: dest[0], lng: dest[1] } : {}) });
        if (!alive) return;
        setGoogleOn(bool(r, 'google')); setResults(objs(r, 'items'));
        setSearchNote(str(r, 'error') || (!objs(r, 'items').length ? 'Nothing found on Google — check the spelling, or type the name below.' : null));
      } catch (e) { if (alive) { setResults([]); setSearchNote(`Google search didn't answer (${errorText(e)}). Type the name below.`); } }
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  const shown = photo?.uri || str(picked, 'photo_url');
  return (
    <View>
      <Txt k="titleLarge">Save a favourite place</Txt>
      <Txt k="bodySmall" color={Brand.Muted}>Restaurants, cafés, views — the whole group sees your list and can tick off what they've visited.</Txt>
      <Gap h={10} />
      {!picked ? <><PlaceSource here={here} onHere={(v) => { setHere(v); setSpot(null); if (v) setQ(''); }} /><Gap h={10} /></> : null}
      {here && !picked ? <><LiveSpot onSpot={(n, la, ln) => { setSpot([n, la, ln]); if (n) setName(n); }} /><Gap h={10} /></> : null}
      {!googleOn && !here && !picked ? <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginBottom: 8 }}>Google search isn't switched on for TripArro yet — type the place's name and add your own photo.</Txt> : null}
      {googleOn && !picked && !here ? (
        <>
          <Field label="Find on Google" value={q} onChange={setQ} placeholder="e.g. Annapoorna, RS Puram" />
          {searchNote ? <Txt k="labelSmall" color={Brand.InkSoft} style={{ marginTop: 6 }}>{searchNote}</Txt> : null}
          {results.slice(0, 6).map((p, i) => (
            <Pressable key={i} onPress={() => { setPicked(p); setName(text(p, 'name')); const t = text(p, 'type'); setCat(/caf/i.test(t) ? 'cafe' : /restaurant|food/i.test(t) ? 'restaurant' : 'place'); }}
              style={[st.row, { marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: Brand.Line, padding: 8 }]}>
              <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: Brand.Sky, overflow: 'hidden' }}>{str(p, 'photo_url') ? <Image source={{ uri: str(p, 'photo_url')! }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}</View>
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Txt k="titleSmall" numberOfLines={1}>{text(p, 'name')}</Txt>
                <Txt k="labelSmall" color={Brand.Blue}>{[text(p, 'type'), num(p, 'rating') !== null ? `★ ${num(p, 'rating')}` : ''].filter(Boolean).join(' · ')}</Txt>
                <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1}>{text(p, 'address')}</Txt>
              </View>
            </Pressable>
          ))}
          {results.length ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Results from Google</Txt> : null}
          <Gap h={10} />
          <Txt k="labelMedium" color={Brand.InkSoft}>Or type it yourself:</Txt>
        </>
      ) : null}
      {picked ? (
        <View style={[st.row, { borderRadius: 16, backgroundColor: Brand.Sky, padding: 10, marginBottom: 8 }]}>
          <Icon name="search" color={Brand.Blue} />
          <Txt numberOfLines={1} style={{ flex: 1, paddingLeft: 8 }}>From Google: {text(picked, 'name')}</Txt>
          <LinkButton text="Change" onPress={() => setPicked(null)} />
        </View>
      ) : null}
      <Field label="Name" value={name} onChange={(v) => setName(v.slice(0, 160))} />
      <Gap h={8} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {objs(g, 'fav_categories').map((c) => <Pressable key={text(c, 'value')} onPress={() => setCat(text(c, 'value'))} style={{ borderRadius: 50, backgroundColor: cat === text(c, 'value') ? Brand.Blue : Brand.Sky, paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" color={cat === text(c, 'value') ? '#fff' : Brand.InkSoft}>{text(c, 'label')}</Txt></Pressable>)}
      </ScrollView>
      <Gap h={10} />
      <Txt k="labelMedium">Your stars</Txt>
      <View style={{ flexDirection: 'row' }}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setStars(stars === n ? 0 : n)} style={{ padding: 8 }} accessibilityLabel={`${n} stars`}><Icon name={n <= stars ? 'star' : 'star-border'} color="#F2B01E" /></Pressable>)}</View>
      <Field label="Note (what to order, best time…)" value={note} onChange={(v) => setNote(v.slice(0, 600))} lines={2} />
      <Gap h={10} />
      <View style={st.row}>
        <View style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: Brand.Sky, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Photo" /> : <Icon name="photo-camera" color={Brand.Blue} />}
        </View>
        <View style={{ flex: 1, paddingLeft: 10, gap: 6 }}>
          <OutlineButton text="Take a photo" icon="photo-camera" onPress={async () => { const p = await pickPhoto('camera'); if (p) setPhoto(p); }} />
          <OutlineButton text="From gallery" icon="add-photo-alternate" onPress={async () => { const p = await pickPhoto('album'); if (p) setPhoto(p); }} />
        </View>
      </View>
      <Gap h={14} />
      <PrimaryButton text="Save to favourites" loading={busy} disabled={!name.trim() || busy} onPress={() => {
        const f: [string, string][] = [['kind', 'fav'], ['title', name], ['category', cat], ['stars', String(stars)], ['body', note]];
        if (picked) {
          f.push(['place_id', text(picked, 'place_id')], ['address', text(picked, 'address')], ['maps_url', text(picked, 'maps_url')], ['photo_credit', text(picked, 'photo_credit')]);
          if (num(picked, 'rating') !== null) f.push(['google_rating', String(num(picked, 'rating'))]);
          if (num(picked, 'lat') !== null) f.push(['lat', String(num(picked, 'lat'))], ['lng', String(num(picked, 'lng'))]);
          if (!photo && str(picked, 'photo')) f.push(['google_photo', str(picked, 'photo')!]);
        } else if (spot) f.push(['lat', String(spot[1])], ['lng', String(spot[2])]);   // pinned where you are
        save(f, photo);
      }} />
      {!name.trim() ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>Add the place's name to save it.</Txt> : null}
    </View>
  );
}

/** Travel expenses: total and per person, by category, who paid, settle-up, and the list — add what you spend. */
function ExpensesSheet({ id, g, add, del, act }: { id: number; g: J; add: (b: Record<string, any>) => void; del: (id: number) => void; act: (path: string, body?: Record<string, any>) => void }) {
  const ex = obj(g, 'expenses') || {};
  const owner = bool(g, 'owner');
  const pay = obj(ex, 'pay');
  const [upi, setUpi] = useState(str(ex, 'upi') || '');
  const [editUpi, setEditUpi] = useState(false);
  const [paidAsk, setPaidAsk] = useState<'upi' | 'cash' | null>(null);
  const [delAsk, setDelAsk] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState('food');
  // a scanned receipt: its photo (kept with the expense), the shop, the day and the items read from it
  const [scan, setScan] = useState<J | null>(null);
  const [lines, setLines] = useState<[string, number][]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [payer, setPayer] = useState(int(objs(g, 'members').find((m) => bool(m, 'you')), 'id'));
  const readReceipt = async (p: Picked) => {
    setScanning(true); setScanMsg(null);
    try {
      const small = await shrinkPhoto(p, 2000);
      const ls = await readLines(small.uri);
      const txt = ls ? textRows(ls) : '';
      const r = await Api.postMultipart(`trip-groups/${id}/expenses/receipt`, [['text', txt]], [{ field: 'photo', uri: small.uri, name: `receipt-${Date.now()}.jpg`, type: 'image/jpeg' }]);
      setScan(r);
      setLines(objs(r, 'items').map((x) => [text(x, 'name'), num(x, 'amount') || 0]));
      const a = num(r, 'amount');
      if (a !== null && a > 0) setAmount(a % 1 === 0 ? String(a) : a.toFixed(2));
      if (str(r, 'merchant')) setNote((n) => n || str(r, 'merchant')!);
      if (str(r, 'category') && str(r, 'category') !== 'other') setCat(str(r, 'category')!);
      setScanMsg(bool(r, 'not_receipt') ? "This doesn't look like a bill — type the amount yourself." : a === null ? "Couldn't find the total on this receipt — type the amount. The photo is kept with the expense."
        : text(r, 'how') === 'ai' ? 'Read by TripArro AI — check the amount before adding.' : 'Read from the receipt — check the amount before adding.');
    } catch (e) { setScanMsg(errorText(e)); }
    setScanning(false);
  };
  const cats = objs(ex, 'by_category');
  const palette = ['#D7192A', '#FFC72C', '#5CC29A', '#8C9BF2', '#FF8A7A', '#7CC8F0', '#B9A8A0'];
  const settle = objs(ex, 'settle');
  const members = objs(g, 'members');
  const list = objs(ex, 'items');
  const amt = parseFloat(amount) || 0;
  return (
    <View>
      <Txt k="titleLarge">Trip expenses</Txt>
      <LinearGradient colors={['#C8242B', '#E8474B', '#FF8A5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.row, { marginTop: 10, borderRadius: 22, padding: 18, overflow: 'hidden' }]}>
        <LiquidLayer waves={[{ color: 'rgba(255,255,255,0.11)', h: 0.45, amp: 8, ms: 10000, reverse: true, bob: 3 }, { color: 'rgba(255,199,44,0.12)', h: 0.3, amp: 8, ms: 7000 }, { color: 'rgba(255,255,255,0.08)', h: 0.18, amp: 5, ms: 5000, reverse: true }]} bubbles={4} />
        <View style={{ flex: 1 }}>
          <Txt k="labelMedium" color="#FFE3E1">Spent so far</Txt>
          <Text style={{ color: '#fff', fontSize: 30, fontFamily: Fonts.b }}>{money(num(ex, 'total') || 0)}</Text>
          <Txt k="labelSmall" color="#FFE3E1">{int(ex, 'count')} expenses</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt k="labelMedium" color="#FFE3E1">Each person</Txt>
          <Text style={{ color: '#fff', fontSize: 20, fontFamily: Fonts.b }}>{money(num(ex, 'per_person') || 0)}</Text>
        </View>
      </LinearGradient>
      {cats.length ? (
        <>
          <Gap />
          <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>{cats.map((c, i) => (int(c, 'pct') > 0 ? <View key={i} style={{ flex: int(c, 'pct'), backgroundColor: palette[i % palette.length] }} /> : null))}</View>
          {cats.map((c, i) => (
            <View key={i} style={[st.row, { marginTop: 6 }]}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette[i % palette.length] }} />
              <Txt style={{ flex: 1, marginLeft: 8 }}>{text(c, 'label')}</Txt>
              <Txt color={Brand.InkSoft}>{money(num(c, 'amount'))} · {int(c, 'pct')}%</Txt>
            </View>
          ))}
        </>
      ) : null}
      {/* Pay now: a traveller pays their share to the person who made the trip, by UPI (Google Pay, PhonePe, Paytm…) */}
      {pay ? (
        <View style={{ marginTop: 14, borderRadius: 22, backgroundColor: '#FFF6D6', borderWidth: 1, borderColor: '#FFC72C', padding: 14 }}>
          <Txt k="titleMedium">You owe {text(pay, 'to')} {money(num(pay, 'amount'))}</Txt>
          <Txt k="bodySmall" color={Brand.InkSoft}>Pay to {text(pay, 'to')}'s UPI: <Txt k="bodySmall" bold>{text(pay, 'upi')}</Txt></Txt>
          <Gap h={10} />
          <PrimaryButton text={`Pay now ${money(num(pay, 'amount'))}`} icon="payments" onPress={async () => {
            try { await Linking.openURL(text(pay, 'link')); setTimeout(() => setPaidAsk('upi'), 1200); } catch { setPaidAsk(null); }
          }} />
          <Pressable onPress={() => setPaidAsk('cash')} style={{ alignSelf: 'center', padding: 8, marginTop: 4 }}><Txt k="labelLarge" color={Brand.Blue}>I paid in cash</Txt></Pressable>
          <Txt k="labelSmall" color={Brand.Muted}>The money goes straight from your UPI app to {text(pay, 'to')} — TripArro never holds it.</Txt>
        </View>
      ) : null}
      {owner ? (
        <View style={{ marginTop: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: Brand.Line, padding: 12 }}>
          {!editUpi && str(ex, 'upi') ? (
            <View style={st.row}>
              <Icon name="account-balance" color={Brand.Blue} />
              <View style={{ flex: 1, marginLeft: 10 }}><Txt k="titleSmall">Your UPI for this trip</Txt><Txt k="bodySmall" color={Brand.InkSoft}>{str(ex, 'upi')} — travellers see a Pay now button</Txt></View>
              <Pressable onPress={() => setEditUpi(true)} style={{ padding: 8 }}><Txt k="labelLarge" color={Brand.Blue}>Change</Txt></Pressable>
            </View>
          ) : (
            <>
              <Txt k="titleSmall">Collect by UPI</Txt>
              <Txt k="bodySmall" color={Brand.InkSoft}>Add your UPI ID — everyone who owes gets a Pay now button that pays you directly.</Txt>
              <Gap h={8} />
              <Field label="Your UPI ID" value={upi} onChange={(v) => setUpi(v.trim().slice(0, 80))} placeholder="name@okicici" autoCapitalize="none" />
              <Gap h={8} />
              <PrimaryButton text="Save UPI ID" onPress={() => { act(`trip-groups/${id}`, { upi_id: upi }); setEditUpi(false); }} />
            </>
          )}
        </View>
      ) : null}
      {settle.length ? (
        <>
          <Gap h={14} />
          <Txt k="titleMedium">Settle up</Txt>
          {settle.map((s, i) => <Txt key={i} color={bool(s, 'you_pay') ? Brand.Blue : Brand.Ink} style={{ marginTop: 4 }}>{bool(s, 'you_pay') ? 'You' : text(s, 'from')} pay{bool(s, 'you_pay') ? '' : 's'} {bool(s, 'you_get') ? 'you' : text(s, 'to')} {money(num(s, 'amount'))}</Txt>)}
          <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 4 }}>{str(ex, 'upi') ? 'Everyone pays the person who made the trip, who pays back anyone owed.' : 'Everyone\'s share is the same; pay each other however you like (UPI, cash).'}</Txt>
        </>
      ) : null}
      {objs(ex, 'payments').length ? (
        <>
          <Gap h={14} />
          <Txt k="titleMedium">Payments</Txt>
          {objs(ex, 'payments').map((p) => (
            <View key={int(p, 'id')} style={[st.row, { marginTop: 6 }]}>
              <Icon name="check-circle" size={18} color={Brand.Teal} />
              <Txt style={{ flex: 1, marginLeft: 8 }}>{text(p, 'from')} paid {text(p, 'to')} {money(num(p, 'amount'))} · {text(p, 'method')}</Txt>
              {bool(p, 'can_delete') ? <Pressable onPress={() => act(`trip-groups/${id}/settlements/${int(p, 'id')}/delete`)} style={{ padding: 6 }} accessibilityLabel="Remove this payment"><Icon name="close" size={18} color={Brand.Muted} /></Pressable> : null}
            </View>
          ))}
        </>
      ) : null}
      <Dialog open={!!paidAsk} onClose={() => setPaidAsk(null)} title={paidAsk === 'cash' ? `Paid ${text(pay, 'to')} in cash?` : 'Did the payment go through?'}
        text={`Mark ${money(num(pay, 'amount'))} as paid to ${text(pay, 'to')}. They are told and can remove it if the money did not reach them.`}
        actions={[['Not yet', () => setPaidAsk(null)], ['Yes, mark paid', () => { const m = paidAsk; setPaidAsk(null); act(`trip-groups/${id}/settle`, { amount: num(pay, 'amount'), method: m }); }]]} />
      <Dialog open={delAsk !== null} onClose={() => setDelAsk(null)} title="Delete this expense?" text="It is removed for everyone and the shares are worked out again."
        actions={[['Cancel', () => setDelAsk(null)], ['Delete', () => { const e = delAsk!; setDelAsk(null); del(e); }, Brand.Danger]]} />
      <Gap h={16} />
      <Txt k="titleMedium">Add an expense</Txt>
      {/* scan a receipt: the amount, shop and items fill in by themselves */}
      <LinearGradient colors={['#FFF1EE', '#FFF8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.row, { marginTop: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D7192A22', padding: 12 }]}>
        <Pressable disabled={scanning || !str(scan, 'receipt_url')} onPress={() => setViewing(str(scan, 'receipt_url'))} style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden' }}>
          <LinearGradient colors={['#B3122A', '#FF8A3D']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {str(scan, 'receipt_url') ? <Image source={{ uri: str(scan, 'receipt_url')! }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} contentFit="cover" accessibilityLabel="Receipt" /> : <Icon name="receipt" color="#fff" />}
            {scanning ? <ActivityIndicator color="#fff" /> : null}
          </LinearGradient>
        </Pressable>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Txt k="titleSmall" bold>{scanning ? 'Reading the receipt…' : scan ? 'Receipt added' : 'Scan a receipt'}</Txt>
          <Txt k="labelSmall" color={Brand.InkSoft}>{scan ? 'Change anything below before adding.' : 'Amount, shop and items fill in by themselves.'}</Txt>
        </View>
        <Pressable disabled={scanning} onPress={async () => { const p = await pickPhoto('camera'); if (p) readReceipt(p); }} style={{ padding: 10 }} accessibilityLabel="Scan with the camera"><Icon name="photo-camera" color={Brand.Matte} /></Pressable>
        <Pressable disabled={scanning} onPress={async () => { const p = await pickPhoto('album'); if (p) readReceipt(p); }} style={{ padding: 10 }} accessibilityLabel="Choose a receipt photo"><Icon name="add-photo-alternate" color={Brand.Matte} /></Pressable>
      </LinearGradient>
      {scanMsg ? <Txt k="labelSmall" color={scan ? Brand.InkSoft : Brand.Matte} style={{ marginTop: 6 }}>{scanMsg}</Txt> : null}
      {lines.length ? (
        <View style={{ marginTop: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Txt k="labelMedium" color={Brand.InkSoft} style={{ paddingVertical: 4 }}>Items on the receipt</Txt>
          {lines.map(([n, a], i) => (
            <View key={i} style={st.row}>
              <Txt numberOfLines={1} style={{ flex: 1 }}>{n}</Txt><Txt>{money(a)}</Txt>
              <Pressable onPress={() => setLines((x) => x.filter((_, j) => j !== i))} style={{ padding: 6 }} accessibilityLabel={`Remove ${n}`}><Icon name="close" size={16} color={Brand.Muted} /></Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <Gap h={8} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field label="Amount (₹)" value={amount} onChange={(v) => setAmount(v.replace(/[^\d.]/g, '').slice(0, 10))} keyboard="decimal-pad" style={{ flex: 1 }} />
        <Field label="For what" value={note} onChange={(v) => setNote(v.slice(0, 160))} style={{ flex: 1.4 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
        {objs(ex, 'categories').map((c) => <Pressable key={text(c, 'value')} onPress={() => setCat(text(c, 'value'))} style={{ borderRadius: 50, backgroundColor: cat === text(c, 'value') ? Brand.Blue : Brand.Sky, paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" color={cat === text(c, 'value') ? '#fff' : Brand.InkSoft}>{text(c, 'label')}</Txt></Pressable>)}
      </ScrollView>
      {members.length > 1 ? (
        <>
          <Txt k="labelMedium" style={{ marginTop: 10 }}>Paid by</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4 }}>
            {members.map((m) => <Pressable key={int(m, 'id')} onPress={() => setPayer(int(m, 'id'))} style={{ borderRadius: 50, backgroundColor: payer === int(m, 'id') ? Brand.Ink : Brand.Sky, paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" color={payer === int(m, 'id') ? '#fff' : Brand.InkSoft}>{bool(m, 'you') ? 'You' : text(m, 'name')}</Txt></Pressable>)}
          </ScrollView>
        </>
      ) : null}
      <Gap h={10} />
      <PrimaryButton text="Add expense" disabled={amt <= 0} onPress={() => {
        const b: Record<string, any> = { amount: amt, category: cat, note, paid_by: payer };
        if (scan) { b.receipt = text(scan, 'receipt'); if (str(scan, 'merchant')) b.merchant = str(scan, 'merchant'); if (str(scan, 'date')) b.day = str(scan, 'date'); b.items = JSON.stringify(lines.map(([n, x]) => ({ name: n, amount: x }))); }
        add(b); setAmount(''); setNote(''); setScan(null); setLines([]); setScanMsg(null);
      }} />
      {list.length ? (
        <>
          <Gap h={16} />
          <Txt k="titleMedium">All expenses</Txt>
          {!owner ? <Txt k="labelSmall" color={Brand.Muted}>Only the person who made the trip can delete expenses.</Txt> : null}
          {list.map((e) => {
            const el = objs(e, 'lines'); const eid = int(e, 'id');
            return (
              <Pressable key={eid} disabled={!el.length} onPress={() => setOpen(open === eid ? null : eid)} style={{ marginTop: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 12 }}>
                <View style={st.row}>
                  {str(e, 'receipt') ? <Pressable onPress={() => setViewing(str(e, 'receipt'))}><Image source={{ uri: str(e, 'receipt')! }} style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10, backgroundColor: Brand.Sky }} contentFit="cover" accessibilityLabel="Receipt" /></Pressable> : null}
                  <View style={{ flex: 1 }}>
                    <Txt k="titleSmall">{text(e, 'note') || str(e, 'merchant') || text(e, 'category_label')}</Txt>
                    <Txt k="labelSmall" color={Brand.Muted}>{text(e, 'category_label')} · {niceDay(str(e, 'day'))} · paid by {text(e, 'paid_by')}{el.length ? ` · ${el.length} items` : ''}</Txt>
                  </View>
                  <Txt k="titleSmall">{money(num(e, 'amount'))}</Txt>
                  {bool(e, 'can_delete') ? <Pressable onPress={() => setDelAsk(eid)} style={{ padding: 6 }} accessibilityLabel="Delete"><Icon name="delete-outline" size={18} color={Brand.Muted} /></Pressable> : null}
                </View>
                {open === eid ? el.map((l, i) => <View key={i} style={[st.row, { marginTop: 4 }]}><Txt k="bodySmall" color={Brand.InkSoft} style={{ flex: 1 }}>{text(l, 'name')}</Txt><Txt k="bodySmall" color={Brand.InkSoft}>{money(num(l, 'amount'))}</Txt></View>) : null}
              </Pressable>
            );
          })}
        </>
      ) : null}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={{ flex: 1, backgroundColor: '#000000F0' }} onPress={() => setViewing(null)}>
          {viewing ? <Image source={{ uri: viewing }} style={{ flex: 1, margin: 12 }} contentFit="contain" accessibilityLabel="Receipt" /> : null}
          <View style={{ position: 'absolute', top: 40, right: 20 }}><Icon name="close" size={28} color="#fff" /></View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChecklistSheet({ g, add, toggle, del }: { g: J; add: (t: string) => void; toggle: (id: number) => void; del: (id: number) => void }) {
  const [t, setT] = useState('');
  const todos = objs(g, 'items').filter((x) => text(x, 'kind') === 'todo');
  return (
    <SheetList title="Trip checklist" sub={`${todos.filter((x) => bool(x, 'done')).length} of ${todos.length} done — everyone in the trip can tick things off`}>
      {todos.map((it) => (
        <Pressable key={int(it, 'id')} onPress={() => toggle(int(it, 'id'))} style={[st.row, { paddingVertical: 8 }]}>
          <Icon name={bool(it, 'done') ? 'task-alt' : 'add'} color={bool(it, 'done') ? Brand.Teal : Brand.Muted} />
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Txt k="bodyLarge" style={bool(it, 'done') ? { textDecorationLine: 'line-through' } : undefined}>{text(it, 'title')}</Txt>
            <Txt k="labelSmall" color={Brand.Muted}>by {text(it, 'by')}</Txt>
          </View>
          {bool(it, 'can_delete') ? <Pressable onPress={() => del(int(it, 'id'))} style={{ padding: 8 }} accessibilityLabel="Delete"><Icon name="delete-outline" color={Brand.Muted} /></Pressable> : null}
        </Pressable>
      ))}
      <View style={st.row}>
        <Field label="Add to the checklist" value={t} onChange={(v) => setT(v.slice(0, 160))} placeholder="Pack sweaters, book a cab…" style={{ flex: 1 }} onSubmit={() => { if (t.trim()) { add(t.trim()); setT(''); } }} />
        <Pressable onPress={() => { if (t.trim()) { add(t.trim()); setT(''); } }} style={{ padding: 12 }} accessibilityLabel="Add"><Icon name="add" color={Brand.Blue} /></Pressable>
      </View>
    </SheetList>
  );
}

function PeopleSheet({ g, newCode, remove, leave, cancelInvite, end }: { g: J; newCode: () => void; remove: (uid: number) => void; leave: (how: string) => void; cancelInvite: (inv: number) => void; end: (ended: boolean) => void }) {
  const [removing, setRemoving] = useState<J | null>(null);
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<'leave' | 'delete' | 'end' | null>(null);
  const members = objs(g, 'members');
  const del = bool(g, 'owner') && members.length === 1;   // alone in the trip: deleting is the way out
  const inv = objs(g, 'invited');
  return (
    <SheetList title="Who's going" sub={`${members.length} joined`}>
      {members.map((m) => (
        <View key={int(m, 'id')} style={[st.row, { paddingVertical: 8 }]}>
          <Avatars initials={[text(m, 'initial')]} size={42} />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Txt k="titleSmall">{text(m, 'name')}{bool(m, 'you') ? ' (you)' : ''}</Txt>
            <Txt k="labelSmall" color={Brand.Muted}>{[text(m, 'role') === 'owner' ? 'Made the trip' : 'Joined ' + text(m, 'joined'), text(m, 'relation').replace(/^./, (c) => c.toUpperCase())].filter(Boolean).join(' · ')}</Txt>
          </View>
          {bool(g, 'owner') && !bool(m, 'you') ? <Pressable onPress={() => setRemoving(m)} style={[st.row, { borderRadius: 50, borderWidth: 1, borderColor: '#F2C2C2', paddingHorizontal: 10, paddingVertical: 6 }]} accessibilityLabel={`Remove ${text(m, 'name')}`}><Icon name="person-remove" size={16} color={Brand.Danger} /><Txt k="labelMedium" color={Brand.Danger}> Remove</Txt></Pressable> : null}
        </View>
      ))}
      {inv.length ? (
        <>
          <Txt k="titleSmall" style={{ marginTop: 8 }}>Invited</Txt>
          {inv.map((i, k) => (
            <View key={k} style={[st.row, { paddingVertical: 6 }]}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}><Icon name="person-add-alt" color={Brand.Blue} /></View>
              <View style={{ paddingLeft: 12, flex: 1 }}><Txt k="titleSmall">{text(i, 'who')}</Txt><Txt k="labelSmall" color={Brand.Muted}>{bool(i, 'on_triparro') ? 'Invited in the app — not joined yet' : 'Link sent by email — not joined yet'}</Txt></View>
              {bool(g, 'owner') ? <Pressable onPress={() => cancelInvite(int(i, 'id'))} style={{ padding: 8 }} accessibilityLabel="Delete this invitation"><Icon name="delete-outline" color={Brand.Danger} /></Pressable> : null}
            </View>
          ))}
        </>
      ) : null}
      <Gap />
      <InviteCard g={g} newCode={newCode} />
      <Gap />
      {/* anyone can leave (unfollow) the trip; only the person who made it can delete it */}
      {/* join another trip with a code from a friend */}
      <View style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: Brand.Line, padding: 12 }}>
        <Txt k="titleSmall">Got a code for another trip?</Txt>
        <View style={[st.row, { marginTop: 8, gap: 8 }]}>
          <Field label="Trip code" value={code} onChange={(v) => setCode(v.replace(/[^A-Za-z0-9]/g, '').slice(0, 8))} placeholder="8 letters and numbers" autoCapitalize="none" style={{ flex: 1 }} />
          <PrimaryButton text="Join" disabled={code.length !== 8} onPress={() => Nav.navigate(`groupjoin/${code}`)} style={{ minHeight: 50 }} />
        </View>
      </View>
      <Gap />
      {bool(g, 'owner') ? (
        <>
          <OutlineButton text={bool(g, 'ended') ? 'Open the trip again' : 'End the trip'} icon={bool(g, 'ended') ? 'replay' : 'flag'} color={Brand.Blue} onPress={() => (bool(g, 'ended') ? end(false) : setConfirm('end'))} />
          <Gap h={8} />
        </>
      ) : null}
      {!del ? <OutlineButton text={bool(g, 'owner') ? 'Leave this trip' : 'Leave (unfollow) this trip'} icon="logout" color={Brand.Danger} onPress={() => setConfirm('leave')} /> : null}
      {bool(g, 'owner') ? <><Gap h={8} /><OutlineButton text="Delete this trip" icon="delete-outline" color={Brand.Danger} onPress={() => setConfirm('delete')} /></> : null}
      <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 8 }}>{bool(g, 'owner')
        ? (members.length > 1 ? 'If you leave, the trip passes to the person who joined first. Only you can delete the trip.' : 'Only you can delete this trip.')
        : 'Leaving stops the trip\'s notifications. Only the person who made the trip can delete it.'}</Txt>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'delete' ? 'Delete this trip?' : confirm === 'end' ? 'End this trip?' : 'Leave this trip?'}
        text={confirm === 'delete' ? 'The plan, posts, albums, favourites, expenses and chat are deleted for everyone. Everyone in the trip is told.'
          : confirm === 'end' ? 'Everyone is told the trip is over. The plan and expenses close; photos, posts and albums stay. You can open it again.'
          : 'You stop getting its updates. You can join again with the invite code.'}
        actions={[['Cancel', () => setConfirm(null), Brand.InkSoft], [confirm === 'delete' ? 'Delete' : confirm === 'end' ? 'End trip' : 'Leave', () => { const c = confirm!; setConfirm(null); if (c === 'end') end(true); else leave(c); }, confirm === 'end' ? Brand.Blue : Brand.Danger]]} />
      <Dialog open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${text(removing, 'name')} from the trip?`} text="They stop seeing the trip. Bookings and tickets they shared leave with them."
        actions={[['Cancel', () => setRemoving(null)], ['Remove', () => { const m = removing!; setRemoving(null); remove(int(m, 'id')); }, Brand.Danger]]} />
    </SheetList>
  );
}
