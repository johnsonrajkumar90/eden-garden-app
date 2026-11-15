/*
 * Group trips: make a trip, invite friends and family with a link or code, and plan it together —
 * bookings each person chooses to share, saved trip plans, places on a Google map, notes, a to-do list and a chat.
 */
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Callout } from 'react-native-maps';
import { Api, errorText } from '../core/api';
import { AppState, useAppState, useLoader, useSession } from '../core/state';
import { J, arr, bool, int, num, obj, objs, str, text } from '../core/json';
import { Brand } from '../theme';
import { BackBar, Card, ErrorBox, Gap, Icon, LinkButton, Loading, Notice, OutlineButton, Photo, PrimaryButton, Txt, prettyDate, shareLink, shortDate, st, DAYS, MONTHS, parseIso } from '../ui/kit';
import { DateRangeSheet, Field } from '../ui/inputs';
import { Dialog, copyText } from '../ui/sheets';
import { HubTabs, MakeTripCard, TripCard, TripCover } from './GroupsUi';
import { BoardingPass, TicketsList, kindIcon } from './Tickets';
import { SavedPlansList } from './Planner';
import { LiveSpot, PlaceSource } from './TripExtras';
import { Nav, useParams } from '../nav';

export const openGroupUrl = (u?: string | null) => { if (u) Linking.openURL(u).catch(() => {}); };
const prettyDay = (iso?: string | null) => { const d = parseIso(iso); return d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : iso || ''; };
const prettyRange = (a: string, b: string) => (!b || b === a ? prettyDay(a) : prettyDay(a) + '  →  ' + prettyDay(b));

/** The list in My trips → Group trips: your group trips, make a new one, or join with a code. */
export function GroupTripsList() {
  const tick = useAppState('refreshTick');
  const l = useLoader(() => Api.get('trip-groups'), [tick]);
  const [creating, setCreating] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [joining, setJoining] = useState(false);
  const [sharing, setSharing] = useState<J | null>(null);
  const [made, setMade] = useState<J | null>(null);
  const data = l.data;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <MakeTripCard onNew={(idea) => { setNewIdea(idea); setCreating(true); }} onJoin={() => setJoining(true)} />
      <Gap />
      {objs(data, 'invites').map((inv) => (
        <InvitationCard key={int(inv, 'id')} inv={inv} onJoin={() => Nav.navigate(`groupjoin/${text(inv, 'code')}`)}
          onDecline={() => Api.post(`trip-groups/invites/${int(inv, 'id')}/decline`).then(() => AppState.bump()).catch(() => {})} />
      ))}
      {!data && l.loading ? <Loading /> : !data ? <ErrorBox message={l.error || 'Could not load your group trips.'} onRetry={l.reload} />
        : !objs(data, 'items').length ? <Txt color={Brand.Muted} style={{ padding: 8 }}>No trips yet. Name one above — or tap an idea — and share its link with family and friends.</Txt>
        : (
          <>
            <Txt k="titleMedium" bold style={{ paddingLeft: 4, paddingBottom: 10 }}>Your trips  ·  {objs(data, 'items').length}</Txt>
            {objs(data, 'items').map((g) => <TripCard key={int(g, 'id')} g={g} onOpen={() => Nav.navigate(`group/${int(g, 'id')}`)} onShare={() => setSharing(g)} />)}
          </>
        )}
      {creating ? <NewGroupDialog idea={newIdea} onClose={() => setCreating(false)} onMade={(g) => { setCreating(false); AppState.bump(); setMade(g); }} /> : null}
      {made ? <ShareTripDialog g={made} justMade onClose={() => { const id = int(made, 'id'); setMade(null); Nav.navigate(`group/${id}`); }} /> : null}
      {sharing ? <ShareTripDialog g={sharing} justMade={false} onClose={() => setSharing(null)} /> : null}
      {joining ? <JoinCodeDialog onClose={() => setJoining(false)} onCode={(c) => { setJoining(false); Nav.navigate(`groupjoin/${c}`); }} /> : null}
    </ScrollView>
  );
}

function NewGroupDialog({ idea, onClose, onMade }: { idea: string; onClose: () => void; onMade: (g: J) => void }) {
  const [title, setTitle] = useState(idea);
  const [cover, setCover] = useState<J | null>(null);   // a photo that matches the name (or the place), looked up as you type
  const [dest, setDest] = useState<J | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickDates, setPickDates] = useState(false);
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const destName = text(dest, 'name');
  useEffect(() => {
    if (title.trim().length < 3 && !destName) { setCover(null); return; }
    let alive = true;
    const t = setTimeout(() => Api.get('trip-groups/cover-suggest', { title: title.trim(), destination: destName }).then((r) => alive && setCover(r)).catch(() => alive && setCover(null)), 650);
    return () => { alive = false; clearTimeout(t); };
  }, [title, destName]);
  const make = async () => {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, any> = { title, start_date: start || null, end_date: end || null };
      if (dest) { body.destination = text(dest, 'name'); body.lat = num(dest, 'lat'); body.lng = num(dest, 'lng'); }
      if (str(cover, 'photo')) body.cover_photo = str(cover, 'photo');
      onMade(obj(await Api.post('trip-groups', body), 'group') || {});
    } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  return (
    <Dialog open onClose={onClose} title="New trip" actions={[['Cancel', onClose, Brand.InkSoft], [busy ? 'Making…' : 'Make the trip', () => { if (!busy) make(); }]]}>
      <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 150, borderRadius: 20, overflow: 'hidden' }}>
          <TripCover cover={str(cover, 'photo_url')} name={`${title} ${destName}`} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} iconSize={96} />
          <LinearGradient colors={['#00000000', '#15161CCC']} locations={[0.4, 1]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          <Txt k="titleLarge" bold color="#fff" numberOfLines={2} style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>{title || 'Your trip'}</Txt>
        </View>
        <Gap />
        <Field label="Name the trip" value={title} onChange={(v) => setTitle(v.slice(0, 80))} placeholder="Ooty with family" />
        <Gap h={8} />
        <PlacePicker label="Where to (optional)" chosen={dest} onChoose={setDest} />
        <Gap h={8} />
        <OutlineButton text={start ? prettyRange(start, end) : 'Add dates (optional)'} onPress={() => { setA(start); setB(end); setPickDates(true); }} />
        {err ? <Notice text={err} tone="bad" style={{ marginTop: 8 }} /> : null}
      </ScrollView>
      <DateRangeSheet open={pickDates} start={a} end={b} title="Trip dates" onClose={() => setPickDates(false)} onPick={(x, y) => { setA(x); setB(y); }}
        onDone={() => { setStart(a); setEnd(b || a); setPickDates(false); }} />
    </Dialog>
  );
}

/** A trip's own link: share it, send it on WhatsApp, copy it — everyone who opens it can join this trip. */
export function ShareTripDialog({ g, justMade, onClose }: { g: J; justMade: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = text(g, 'link'); const t = text(g, 'share_text') || `Join my trip "${text(g, 'title')}" on TripArro:`;
  return (
    <Dialog open onClose={onClose} title={justMade ? `“${text(g, 'title')}” is ready` : `Share “${text(g, 'title')}”`} actions={[[justMade ? 'Open the trip' : 'Done', onClose]]}>
      <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
        <Txt>Send this link to family and friends. Whoever joins sees this trip's plan, expenses, favourites and chat — your other trips stay private.</Txt>
        <View style={[st.row, { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: Brand.Line, paddingHorizontal: 12, paddingVertical: 10 }]}>
          <View style={{ flex: 1 }}><Txt k="bodySmall" numberOfLines={1}>{link.replace('https://', '')}</Txt><Txt k="titleSmall" bold>Code {text(g, 'code')}</Txt></View>
          <LinkButton text={copied ? 'Copied' : 'Copy'} onPress={() => { copyText(link); setCopied(true); }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PrimaryButton text="Share" icon="share" onPress={() => shareLink(t, link)} style={{ flex: 1 }} />
          <OutlineButton text="WhatsApp" onPress={() => openGroupUrl('https://wa.me/?text=' + encodeURIComponent(`${t} ${link}`))} style={{ flex: 1 }} />
        </View>
        <View style={{ height: 1, backgroundColor: Brand.Line, marginVertical: 12 }} />
        <InviteByEmail g={g} />
      </ScrollView>
    </Dialog>
  );
}

function JoinCodeDialog({ onClose, onCode }: { onClose: () => void; onCode: (c: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <Dialog open onClose={onClose} title="Join a group trip" actions={[['Cancel', onClose, Brand.InkSoft], ['Next', () => { if (code.length === 8) onCode(code); }]]}>
      <Txt k="bodySmall" color={Brand.InkSoft}>Enter the 8-letter code from the invite, or open the invite link on this phone.</Txt>
      <Gap h={8} />
      <Field label="Trip code" value={code} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} autoCapitalize="none" />
    </Dialog>
  );
}

/** Search a town or place (the travel planner's search) and pick it — gives the map position. */
export function PlacePicker({ label, chosen, onChoose }: { label: string; chosen: J | null; onChoose: (p: J | null) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<J[]>([]);
  useEffect(() => {
    if (q.length < 2) { setItems([]); return; }
    let alive = true;
    const t = setTimeout(() => Api.get('trip/destinations', { q }).then((r) => alive && setItems(objs(r, 'items').filter((x) => num(x, 'lat') !== null))).catch(() => alive && setItems([])), 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  if (chosen) return (
    <View style={[st.row, { borderRadius: 14, backgroundColor: Brand.Sky, padding: 10 }]}>
      <Icon name="place" color={Brand.Blue} />
      <Txt bold numberOfLines={1} style={{ flex: 1, paddingHorizontal: 8 }}>{text(chosen, 'name')}</Txt>
      <LinkButton text="Change" onPress={() => { onChoose(null); setQ(''); }} />
    </View>
  );
  return (
    <View>
      <Field label={label} value={q} onChange={setQ} placeholder="Town or place" />
      {items.slice(0, 5).map((it, i) => (
        <Pressable key={i} onPress={() => onChoose(it)} style={[st.row, { paddingVertical: 8 }]}>
          <Icon name="place" size={18} color={Brand.Muted} />
          <View style={{ paddingLeft: 8, flex: 1 }}>
            <Txt numberOfLines={1}>{text(it, 'name')}</Txt>
            {text(it, 'sub') ? <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1}>{text(it, 'sub')}</Txt> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** An invite link or code opened on the phone: what trip it is, then join (sign in first when needed). */
export function GroupJoinScreen() {
  const code = useParams().code || '';
  const session = useSession();
  const l = useLoader(() => Api.get(`trip-groups/code/${code}`), [code, session?.user?.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [relation, setRelation] = useState('');
  const p = l.data;
  useEffect(() => { if (p && bool(p, 'member')) Nav.replace(`group/${int(p, 'id')}`); }, [p]);
  const sub = [text(p, 'destination'), text(p, 'dates')].filter(Boolean).join(' · ');
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Join a group trip" onBack={Nav.back} />
      {!p && l.loading ? <Loading /> : !p ? <ErrorBox message={l.error || 'This trip was not found.'} onRetry={l.reload} /> : bool(p, 'member') ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Card>
            <Txt k="labelLarge" color={Brand.Coral}>{text(p, 'by')} invited you</Txt>
            <Txt k="headlineSmall" style={{ marginTop: 4 }}>{text(p, 'title')}</Txt>
            {sub ? <Txt color={Brand.InkSoft}>{sub}</Txt> : null}
            <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>{int(p, 'members')} already planning · share bookings, places on the map, a to-do list and a chat.</Txt>
            <Txt k="labelMedium" style={{ marginTop: 12 }}>They are your…</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 6 }}>
              {[['family', 'Family'], ['friend', 'Friends'], ['partner', 'Partner'], ['colleague', 'Colleagues']].map(([v, t]) => (
                <Pressable key={v} onPress={() => setRelation(relation === v ? '' : v)} style={{ borderRadius: 50, backgroundColor: relation === v ? Brand.Blue : Brand.Sky, paddingHorizontal: 14, paddingVertical: 8 }}><Txt k="labelLarge" color={relation === v ? '#fff' : Brand.InkSoft}>{t}</Txt></Pressable>
              ))}
            </ScrollView>
          </Card>
          <Gap />
          {err ? <><Notice text={err} tone="bad" /><Gap h={8} /></> : null}
          {!session?.user ? <PrimaryButton text="Sign in to join" onPress={() => Nav.navigate('login')} /> : (
            <PrimaryButton text="Join this trip" loading={busy} onPress={async () => {
              setBusy(true); setErr(null);
              try { const id = int(await Api.post('trip-groups/join', { code, relation }), 'id'); AppState.bump(); Nav.replace(`group/${id}`); } catch (e) { setErr(errorText(e)); }
              setBusy(false);
            }} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

export function InviteCard({ g, newCode }: { g: J; newCode: () => void }) {
  return (
    <Card>
      <Txt k="titleMedium">Invite friends and family</Txt>
      <Txt k="bodySmall" color={Brand.InkSoft}>Send the link, or tell them the code — they join in the TripArro app or on the website.</Txt>
      <View style={[st.row, { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: Brand.Line, padding: 12 }]}>
        <View style={{ flex: 1 }}><Txt k="labelSmall" color={Brand.Muted}>Trip code</Txt><Txt k="headlineSmall" bold>{text(g, 'code')}</Txt></View>
        <Pressable onPress={() => copyText(text(g, 'link'))} style={{ padding: 10 }} accessibilityLabel="Copy the invite link"><Icon name="content-copy" /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <PrimaryButton text="Share invite" icon="share" onPress={() => shareLink(text(g, 'share_text'), text(g, 'link'))} style={{ flex: 1 }} />
        <OutlineButton text="WhatsApp" onPress={() => openGroupUrl('https://wa.me/?text=' + encodeURIComponent(text(g, 'share_text') + ' ' + text(g, 'link')))} style={{ flex: 1 }} />
      </View>
      {bool(g, 'owner') ? <LinkButton text="Make a new code (the old link stops working)" onPress={newCode} /> : null}
      <View style={{ height: 1, backgroundColor: Brand.Line, marginVertical: 10 }} />
      <InviteByEmail g={g} />
    </Card>
  );
}

/**
 * Invite by email: someone already on TripArro sees the invitation in My trips; anyone else is emailed the trip link
 * (and can be sent it on WhatsApp too). Also: send the link from your own email app.
 */
export function InviteByEmail({ g }: { g: J }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<[string, string] | null>(null);
  const t = text(g, 'share_text') || `Join my trip "${text(g, 'title')}" on TripArro:`;
  return (
    <View>
      <Txt k="titleSmall">Invite by email</Txt>
      <Txt k="labelSmall" color={Brand.Muted}>Friends already on TripArro get the invitation in their app; others get the link by email.</Txt>
      <View style={[st.row, { marginTop: 6 }]}>
        <Field label="Email address" value={email} onChange={(v) => setEmail(v.trim().slice(0, 190))} keyboard="email-address" autoCapitalize="none" style={{ flex: 1 }} />
        <LinkButton text={busy ? 'Sending…' : 'Invite'} disabled={busy || !email.includes('@')} onPress={async () => {
          setBusy(true); setMsg(null);
          try { const r = await Api.post(`trip-groups/${int(g, 'id')}/invite`, { email }); setMsg([text(r, 'status'), text(r, 'message')]); if (['invited', 'emailed'].includes(text(r, 'status'))) setEmail(''); }
          catch (e) { setMsg(['error', errorText(e)]); }
          setBusy(false);
        }} />
      </View>
      {msg ? (
        <>
          <Notice text={msg[1]} tone={['invited', 'emailed', 'member'].includes(msg[0]) ? 'ok' : 'bad'} style={{ marginTop: 6 }} />
          {msg[0] === 'emailed' || msg[0] === 'not_sent' ? <OutlineButton text="Also send on WhatsApp" onPress={() => openGroupUrl('https://wa.me/?text=' + encodeURIComponent(t + ' ' + text(g, 'link')))} style={{ marginTop: 6 }} /> : null}
        </>
      ) : null}
      <LinkButton text="Or send the link from your email app" onPress={() => openGroupUrl(`mailto:?subject=${encodeURIComponent('Join my trip: ' + text(g, 'title'))}&body=${encodeURIComponent(t + '\n' + text(g, 'link'))}`)} />
    </View>
  );
}

/** An invitation waiting for me: join or say no. */
function InvitationCard({ inv, onJoin, onDecline }: { inv: J; onJoin: () => void; onDecline: () => void }) {
  const sub = [text(inv, 'destination'), text(inv, 'dates')].filter(Boolean).join(' · ');
  return (
    <LinearGradient colors={['#FFF4D6', '#FFE3DE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginBottom: 10, borderRadius: 22, borderWidth: 1, borderColor: '#B81D2B33', padding: 16 }}>
      <Txt k="labelLarge" color={Brand.Blue}>{text(inv, 'by')} invited you</Txt>
      <Txt k="titleLarge">{text(inv, 'trip')}</Txt>
      {sub ? <Txt k="bodySmall" color={Brand.InkSoft}>{sub}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <PrimaryButton text="Join the trip" onPress={onJoin} style={{ flex: 1 }} />
        <OutlineButton text="No thanks" onPress={onDecline} />
      </View>
    </LinearGradient>
  );
}

/** The trip's places for the map: every pin, or the destination when there are none. */
function mapPins(g: J): J[] {
  const pins = objs(g, 'pins').filter((p) => num(p, 'lat') !== null);
  if (pins.length) return pins;
  const d = arr<number>(g, 'dest');
  return d.length === 2 ? [{ lat: d[0], lng: d[1], label: text(g, 'destination') || text(g, 'title'), kind: 'destination' }] : [];
}
const pinColour = (k: string) => (k === 'destination' ? '#D7192A' : k === 'booking' ? '#1F6FEB' : k === 'fav' ? '#E8452F' : '#0E9F6E');
const hasMapsKey = Platform.OS === 'ios' || !!(Constants.expoConfig?.extra as any)?.hasMapsKey;

/** Google Map of the trip (the destination, places to visit, booked stays) with buttons to open it in Google Maps. */
export function GroupMap({ g, tall }: { g: J; tall: boolean }) {
  const map = obj(g, 'map'); if (!map) return null;
  const pins = mapPins(g);
  const all = objs(g, 'pins');
  const lats = pins.map((p) => num(p, 'lat')!); const lngs = pins.map((p) => num(p, 'lng')!);
  const region = pins.length ? {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max(0.05, (Math.max(...lats) - Math.min(...lats)) * 1.6), longitudeDelta: Math.max(0.05, (Math.max(...lngs) - Math.min(...lngs)) * 1.6),
  } : null;
  return (
    <View style={{ backgroundColor: '#fff' }}>
      <View style={{ height: tall ? 420 : 220 }}>
        {!region ? (
          <View style={{ flex: 1, backgroundColor: '#F4F1EF', alignItems: 'center', justifyContent: 'center' }}><Txt color={Brand.Muted} center style={{ padding: 24 }}>Add places to the plan (or a destination) to see them on the map.</Txt></View>
        ) : hasMapsKey ? (
          <MapView style={{ flex: 1 }} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT} initialRegion={region} toolbarEnabled zoomControlEnabled>
            {pins.map((p, i) => (
              <Marker key={i} coordinate={{ latitude: num(p, 'lat')!, longitude: num(p, 'lng')! }} pinColor={pinColour(text(p, 'kind'))} title={text(p, 'label')} description="Tap here for directions"
                onCalloutPress={() => openGroupUrl(`https://www.google.com/maps/dir/?api=1&destination=${num(p, 'lat')},${num(p, 'lng')}`)} />
            ))}
          </MapView>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#F4F1EF', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Icon name="map" size={40} color={Brand.Muted} />
            <Txt color={Brand.Muted} center>{pins.length} place{pins.length === 1 ? '' : 's'} in this trip — open them in Google Maps below.</Txt>
          </View>
        )}
      </View>
      <View style={{ padding: 12 }}>
        {tall ? all.map((p, i) => (
          <Pressable key={i} onPress={() => openGroupUrl(`https://www.google.com/maps/search/?api=1&query=${num(p, 'lat')},${num(p, 'lng')}`)} style={[st.row, { paddingVertical: 6 }]}>
            <Icon name={text(p, 'kind') === 'booking' ? 'hotel' : text(p, 'kind') === 'destination' ? 'map' : 'place'} size={20} color={Brand.Coral} />
            <Txt numberOfLines={1} style={{ paddingLeft: 8, flex: 1 }}>{text(p, 'label')}</Txt>
          </Pressable>
        )) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <OutlineButton text="Google Maps" icon="map" onPress={() => openGroupUrl(text(map, 'open'))} style={{ flex: 1 }} />
          {str(map, 'route') ? <OutlineButton text="Directions" icon="directions" onPress={() => openGroupUrl(str(map, 'route'))} style={{ flex: 1 }} /> : null}
        </View>
      </View>
    </View>
  );
}

export function GroupItem({ item, toggle, del }: { item: J; toggle: () => void; del: () => void }) {
  const kind = text(item, 'kind');
  if (kind === 'ticket') {   // a member's travel ticket, as a boarding pass
    const t = obj(item, 'ticket'); if (!t) return null;
    return (
      <BoardingPass t={t}>
        <View style={st.row}>
          <Txt k="labelMedium" color={Brand.Muted} style={{ flex: 1 }}>Shared by {text(item, 'by')}</Txt>
          {bool(item, 'can_delete') ? <LinkButton text={bool(item, 'mine') ? 'Stop sharing' : 'Remove'} color={Brand.Muted} onPress={del} /> : null}
        </View>
      </BoardingPass>
    );
  }
  const b = obj(item, 'booking'); const p = obj(item, 'plan');
  const onPress = () => {
    if (kind === 'booking' && b) Nav.navigate(`property/${text(b, 'kind')}/${int(b, 'listing_id')}`);
    else if (kind === 'plan' && p && bool(p, 'owner')) Nav.navigate(`tripplan/${int(p, 'id')}`);
    else if (kind === 'place') { const c = arr<number>(item, 'coords'); if (c.length === 2) openGroupUrl(`https://www.google.com/maps/search/?api=1&query=${c[0]},${c[1]}`); }
    else if (kind === 'todo') toggle();
  };
  return (
    <Pressable onPress={onPress} style={[st.row, { marginBottom: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 12 }]}>
      {kind === 'booking' ? <Photo url={str(b, 'image')} corner={12} style={{ width: 64, height: 64 }} />
        : <Icon name={kind === 'todo' ? (bool(item, 'done') ? 'check-box' : 'check-box-outline-blank') : kind === 'place' ? 'place' : kind === 'plan' ? 'route' : 'description'} color={kind === 'place' ? Brand.Coral : kind === 'note' ? Brand.Muted : Brand.Blue} />}
      <View style={{ flex: 1, paddingLeft: 12 }}>
        {kind === 'booking' && b ? (
          <>
            <Txt k="titleSmall" numberOfLines={2}>{text(b, 'title')}</Txt>
            <Txt k="bodySmall" color={Brand.InkSoft}>{text(b, 'dates')} · {int(b, 'guests')} guests{bool(b, 'cancelled') ? ' · cancelled' : ''}</Txt>
            <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1}>{text(b, 'location')}</Txt>
          </>
        ) : kind === 'plan' && p ? (
          <>
            <Txt k="titleSmall">{text(p, 'title')}</Txt>
            <Txt k="bodySmall" color={Brand.InkSoft}>{text(p, 'from')} → {text(p, 'to')} · {Math.round(num(p, 'km') || 0)} km</Txt>
          </>
        ) : (
          <>
            <Txt k="titleSmall" style={kind === 'todo' && bool(item, 'done') ? { textDecorationLine: 'line-through' } : undefined}>{text(item, 'title')}</Txt>
            {str(item, 'body') ? <Txt k="bodySmall" color={Brand.InkSoft}>{str(item, 'body')}</Txt> : null}
            {str(item, 'day') ? <Txt k="labelSmall" color={Brand.Blue}>{prettyDay(str(item, 'day'))}</Txt> : null}
          </>
        )}
        <Txt k="labelSmall" color={Brand.Muted}>by {text(item, 'by')}</Txt>
      </View>
      {bool(item, 'can_delete') ? <Pressable onPress={del} style={{ padding: 8 }} accessibilityLabel="Delete"><Icon name="delete-outline" color={Brand.Muted} /></Pressable> : null}
    </Pressable>
  );
}

/** Add to the plan: share a booking or a saved trip plan, or add a place, a note or a to-do. */
export function AddToGroup({ id, done }: { id: number; done: (g: J) => void }) {
  const [kind, setKind] = useState('place');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [day, setDay] = useState('');
  const [place, setPlace] = useState<J | null>(null);
  const [here, setHere] = useState(true);        // a place: where you are now (live location), or a search
  const [autoName, setAutoName] = useState('');  // the name Google gave, replaced when another place is picked
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const share = useLoader(() => Api.get(`trip-groups/${id}/shareable`), [id]);
  const post = async (b: Record<string, any>) => { setBusy(true); setErr(null); try { done(await Api.post(`trip-groups/${id}/items`, b)); } catch (e) { setErr(errorText(e)); } setBusy(false); };
  const s = share.data;
  const list = objs(s, kind === 'booking' ? 'bookings' : kind === 'ticket' ? 'tickets' : 'plans');
  return (
    <View>
      <Txt k="titleLarge">Add to the plan</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        {[['place', 'Place'], ['booking', 'My booking'], ['ticket', 'My ticket'], ['plan', 'My trip plan'], ['todo', 'To-do'], ['note', 'Note']].map(([v, t]) => (
          <Pressable key={v} onPress={() => { setKind(v); setErr(null); }} style={{ borderRadius: 50, backgroundColor: kind === v ? Brand.Blue : Brand.Sky, paddingHorizontal: 14, paddingVertical: 8 }}><Txt k="labelLarge" color={kind === v ? '#fff' : Brand.InkSoft}>{t}</Txt></Pressable>
        ))}
      </ScrollView>
      {err ? <><Notice text={err} tone="bad" /><Gap h={8} /></> : null}
      {['booking', 'plan', 'ticket'].includes(kind) ? (
        <>
          {!s && share.loading ? <Loading /> : !list.length ? <Txt color={Brand.Muted}>{kind === 'booking' ? 'You have no upcoming stay or resort bookings to share.' : kind === 'ticket' ? 'No tickets yet — add them in My trips → Tickets (from Gmail or by hand).' : 'You have no saved trip plans yet — make one in the Travel planner.'}</Txt>
            : list.map((x, i) => (
              <Pressable key={i} disabled={busy} onPress={() => post({ kind, ref: text(x, 'ref') })} style={[st.row, { marginVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: Brand.Line, padding: 12 }]}>
                <Icon name={kind === 'booking' ? 'hotel' : kind === 'ticket' ? kindIcon(text(x, 'kind')) : 'route'} color={Brand.Blue} />
                <View style={{ flex: 1, paddingLeft: 10 }}><Txt k="titleSmall">{text(x, 'title')}</Txt>{str(x, 'dates') ? <Txt k="bodySmall" color={Brand.InkSoft}>{str(x, 'dates')}</Txt> : null}</View>
                <Txt bold color={Brand.Coral}>Share</Txt>
              </Pressable>
            ))}
          {kind === 'booking' ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 8 }}>The group sees the stay, dates and number of guests — not the price or your contact details.</Txt> : null}
        </>
      ) : (
        <>
          {kind === 'place' ? (
            <>
              <PlaceSource here={here} onHere={(v) => { setHere(v); setPlace(null); if (title === autoName) setTitle(''); setAutoName(''); }} />
              <Gap h={10} />
              {here ? <LiveSpot onSpot={(n, la, ln) => { setPlace({ name: n, lat: la, lng: ln }); setTitle((t) => { if (!t || t === autoName) { setAutoName(n); return n; } return t; }); }} />
                : <PlacePicker label="Find the place on the map" chosen={place} onChoose={(p) => { setPlace(p); if (p && (!title || title === autoName)) { setTitle(text(p, 'name')); setAutoName(text(p, 'name')); } }} />}
              <Gap h={10} />
            </>
          ) : null}
          <Field label={kind === 'todo' ? 'What needs doing' : kind === 'place' ? 'Place name' : 'Title'} value={title} onChange={(v) => setTitle(v.slice(0, 160))} placeholder={kind === 'place' ? 'e.g. Doddabetta Peak' : ''} />
          <Gap h={8} />
          {kind !== 'todo' ? <><Field label="Details (optional)" value={body} onChange={(v) => setBody(v.slice(0, 2000))} lines={3} /><Gap h={8} /></> : null}
          {kind !== 'note' ? <><Field label="Day (YYYY-MM-DD, optional)" value={day} onChange={(v) => setDay(v.slice(0, 10))} /><Gap h={8} /></> : null}
          <PrimaryButton text="Add" loading={busy} onPress={() => {
            const b: Record<string, any> = { kind, title, body, day: day || null };
            if (place && num(place, 'lat') !== null) { b.lat = num(place, 'lat'); b.lng = num(place, 'lng'); }
            post(b);
          }} />
        </>
      )}
    </View>
  );
}

/** Group trips (from the floating button): your trips, your route plans and your tickets, in one place. */
export function GroupsHub() {
  const [tab, setTab] = useState('trips');
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Group trips" onBack={Nav.back} />
      <HubTabs tab={tab} onTab={setTab} />
      <View style={{ flex: 1 }}>{tab === 'plans' ? <SavedPlansList /> : tab === 'tickets' ? <TicketsList /> : <GroupTripsList />}</View>
    </View>
  );
}
