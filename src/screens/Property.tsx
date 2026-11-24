// A stay or resort: photos, details, rules, reviews and the booking panel (dates, guests, extra guests, rooms, live price).
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Api, errorText } from '../core/api';
import { AppState, useLoader } from '../core/state';
import { J, arr, bool, int, num, obj, objs, priceLines, str, strings, text } from '../core/json';
import { Brand } from '../theme';
import { Avatar, BackBar, Bordered, ErrorBox, Gap, Icon, LinkButton, Loading, Notice, Photo, Pill, PriceTable, PrimaryButton, RoundAction, Stars, Txt, initialsOf, money, plural, shareLink, shortDate, st, today } from '../ui/kit';
import { CheckRow, DateRangeField, DateRangeSheet, Field, Segmented, Stepper } from '../ui/inputs';
import { AmenityGrid, DetailSection, ExpandRow, FactTiles, HeroGallery, PRICE_BAR_SPACE, PriceBar, RatingBadge, RefundTimeline, TimeTiles, TitleCard } from '../ui/detail';
import { RefundTag, isRefundable } from '../ui/cards';
import { Dialog, ExpandText, Sheet, copyText, openMaps } from '../ui/sheets';
import { Nav, enc, intParam, useParams } from '../nav';

export default function PropertyScreen() {
  const prm = useParams();
  const kind = prm.kind || 'stay'; const id = intParam(prm.id);
  const l = useLoader(() => Api.get(`properties/${id}`, { kind }), [kind, id]);
  const [sheet, setSheet] = useState(false);
  const p = l.data;
  useEffect(() => { Api.post('visit', { kind, id }).catch(() => {}); }, [kind, id]);

  if (!p) return <View style={{ flex: 1 }}><BackBar title="" onBack={Nav.back} />{l.loading ? <Loading /> : <ErrorBox message={l.error || 'Not found.'} onRetry={l.reload} />}</View>;

  const price = obj(p, 'price') || {};
  const photos = objs(p, 'photos').map((x) => text(x, 'url')).filter(Boolean);
  if (!photos.length && str(p, 'image')) photos.push(str(p, 'image')!);
  const badges = obj(p, 'badges') || {};
  const facts = objs(p, 'facts').map((x) => text(x, 'value'));
  const g = obj(p, 'guests');
  const extraPolicy = objs(p, 'policies').find((x) => text(x, 'title').startsWith('Extra guests'));
  const amen = strings(p, 'amenities');
  const rooms = objs(p, 'rooms');
  const times = obj(p, 'times');
  const pol = objs(p, 'policies').filter((x) => !text(x, 'title').startsWith('Extra guests'));
  const rules = strings(p, 'house_rules');
  const canc = obj(p, 'cancellation_policy');
  const rs = obj(p, 'reviews_summary');
  const host = obj(p, 'host');
  const coords = arr<number>(p, 'coords');
  const offer = num(price, 'offer_nightly'); const nightly = num(price, 'nightly');
  const factIcon = (f: string) => { const x = f.toLowerCase(); return x.includes('bed') ? 'bed' : x.includes('bath') ? 'bathtub' : x.includes('guest') || x.includes('up to') ? 'people' : 'home'; };

  return (
    <View style={{ flex: 1 }}>
      {obj(price, 'offer') ? <ListingOfferDialog k={`${kind}-${id}`} title={text(p, 'title')} price={price} o={obj(price, 'offer')!} book={() => setSheet(true)} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: PRICE_BAR_SPACE }}>
        <HeroGallery urls={photos} onOpen={(u) => Nav.navigate('photo?url=' + enc(u) + '&title=' + enc(text(p, 'title')))} actions={<>
          <RoundAction icon="arrow-back" label="Back" onPress={Nav.back} />
          <View style={{ flex: 1 }} />
          <RoundAction icon="share" label="Share" onPress={() => shareLink(text(p, 'title'), Api.url((kind === 'resort' ? 'resorts/' : 'stays/') + id))} />
        </>} />
        <View style={{ marginTop: -30 }}>
          <TitleCard>
            <View style={st.row}>
              <Icon name="place" size={16} color={Brand.Teal} />
              <Txt color={Brand.InkSoft} numberOfLines={1} style={{ flex: 1 }}> {[str(p, 'area'), str(p, 'location')].filter(Boolean).join(', ')}</Txt>
            </View>
            <Txt k="headlineSmall" style={{ marginTop: 4, marginBottom: 10 }}>{text(p, 'title')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <RatingBadge rating={num(p, 'rating')} count={int(p, 'reviews')} />
              {bool(badges, 'verified') ? <Pill text="✓ Verified" tone="ok" /> : null}
              {bool(badges, 'favourite') ? <Pill text="Guest favourite" tone="info" /> : null}
              <RefundTag refundable={canc ? isRefundable(canc) : true} />
              {canc && canc.refundable === false ? <Pill text="🚫 Non-refundable" tone="bad" /> : null}
            </View>
            {text(p, 'booking_mode') === 'request' ? <><Gap h={8} /><Notice text="The host approves each request — you pay only after they accept." tone="warn" /></> : null}
            {facts.length ? <><Gap h={14} /><FactTiles items={facts.map((f) => [factIcon(f), f])} /></> : null}
          </TitleCard>
        </View>
        <View style={{ marginTop: 6 }}>
          {g || extraPolicy ? (
            <DetailSection title="Guests" icon="people">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {g && g.included !== undefined && g.included !== null ? <GuestStat value={String(g.included)} label="included in the price" /> : null}
                {g && g.max !== undefined && g.max !== null ? <GuestStat value={String(g.max)} label="guests at most" /> : null}
              </View>
              {extraPolicy ? <Txt color={Brand.InkSoft} style={{ marginTop: 10 }}>{text(extraPolicy, 'text')}</Txt> : null}
            </DetailSection>
          ) : null}
          {str(p, 'description') ? <DetailSection title="About this place" icon="info-outline"><ExpandText text={str(p, 'description')!} /></DetailSection> : null}
          {objs(obj(p, 'beds'), 'rooms').length ? (
            <DetailSection title="Where you'll sleep" icon="bed" sub={(() => { const t = text(obj(p, 'beds'), 'summary'); return t.charAt(0).toUpperCase() + t.slice(1); })()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {objs(obj(p, 'beds'), 'rooms').map((r, i) => (
                  <View key={i} style={{ width: 150, borderRadius: 18, backgroundColor: Brand.Page, padding: 14 }}>
                    <Icon name="king-bed" size={24} color={Brand.Blue} />
                    <Txt k="titleSmall" style={{ marginTop: 6 }}>{text(r, 'name')}</Txt>
                    {objs(r, 'beds').map((b, j) => <Txt key={j} k="bodySmall" color={Brand.InkSoft}>{int(b, 'count')} {text(b, 'label').toLowerCase()}</Txt>)}
                  </View>
                ))}
              </ScrollView>
            </DetailSection>
          ) : null}
          {amen.length ? <DetailSection title="What this place offers" icon="checklist"><AmenityGrid items={amen} /></DetailSection> : null}
          {rooms.length ? (
            <DetailSection title="Rooms" icon="bed" sub="Choose your room and plan when you book">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {rooms.map((r, i) => (
                  <View key={i} style={{ width: 250, borderRadius: 18, backgroundColor: Brand.Page, overflow: 'hidden' }}>
                    <Photo url={str(r, 'image')} corner={0} style={{ width: '100%', aspectRatio: 1.6 }} />
                    <View style={{ padding: 12 }}>
                      <Txt k="titleMedium">{text(r, 'name')}</Txt>
                      <Txt k="bodySmall" color={Brand.InkSoft}>{[str(r, 'bed'), str(r, 'view'), `${int(r, 'max_guests')} guests`].filter(Boolean).join(' · ')}</Txt>
                      {int(r, 'max_extra') > 0 ? <Txt k="bodySmall" color={Brand.TealDark}>+{int(r, 'max_extra')} extra · {money(num(r, 'extra_fee'))} each / night</Txt> : null}
                      {objs(r, 'plans').slice(0, 3).map((pl, j) => (
                        <View key={j} style={[st.row, { marginTop: 6 }]}>
                          <Txt k="bodySmall" style={{ flex: 1 }}>{text(pl, 'name')}</Txt>
                          <Txt k="titleSmall" color={Brand.BlueDark}>{money(num(pl, 'offer_price') ?? num(pl, 'price'))}</Txt>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </DetailSection>
          ) : null}
          {coords.length === 2 ? (
            <DetailSection title="Where you'll be" icon="map">
              <StayMap lat={coords[0]} lng={coords[1]} title={text(p, 'title')} />
              <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginTop: 8 }}>{text(p, 'location')}</Txt>
            </DetailSection>
          ) : null}
          {times ? (
            <DetailSection title="Check-in and check-out" icon="schedule">
              {(() => { const ci = str(times, 'check_in') || str(times, 'checkin'); const co = str(times, 'check_out') || str(times, 'checkout');
                return ci && co ? <TimeTiles leftLabel="Check-in from" left={ci} rightLabel="Check-out by" right={co} /> : <Txt color={Brand.InkSoft}>{text(times, 'label')}</Txt>; })()}
            </DetailSection>
          ) : null}
          {pol.length || rules.length ? (
            <DetailSection title="Things to know" icon="lightbulb-outline">
              {pol.map((x, i) => <ExpandRow key={i} title={text(x, 'title')} text={text(x, 'text')} />)}
              {rules.length ? <ExpandRow title="House rules" text={rules.map((r) => '• ' + r).join('\n')} /> : null}
            </DetailSection>
          ) : null}
          {canc ? (
            <DetailSection title="Cancellation" icon="event-available" sub={text(canc, 'label')}>
              <RefundTimeline rows={objs(canc, 'policy').map((x) => [text(x, 'when'), int(x, 'refund_percent')])} />
            </DetailSection>
          ) : null}
          {rs && int(rs, 'count') > 0 ? (
            <DetailSection title="Reviews" icon="star-outline">
              <View style={st.row}>
                <Txt k="displaySmall">{(num(p, 'rating') || 0).toFixed(1)}</Txt>
                <View style={{ paddingLeft: 12 }}><Stars rating={num(p, 'rating')} /><Txt k="bodySmall" color={Brand.Muted}>{int(rs, 'count')} reviews from guests who stayed</Txt></View>
              </View>
              <Gap />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {objs(rs, 'items').slice(0, 8).map((r, i) => (
                  <View key={i} style={{ width: 260, borderRadius: 18, backgroundColor: Brand.Page, padding: 14 }}>
                    <View style={st.row}>
                      <Avatar initials={initialsOf(text(r, 'name'))} size={34} />
                      <View style={{ paddingLeft: 8, flex: 1 }}><Txt k="titleSmall">{text(r, 'name')}</Txt><Txt k="labelSmall" color={Brand.Muted}>{text(r, 'date')}</Txt></View>
                      <Stars rating={num(r, 'rating')} />
                    </View>
                    <Txt color={Brand.InkSoft} numberOfLines={5} style={{ marginTop: 8 }}>{text(r, 'body')}</Txt>
                    {obj(r, 'reply') ? <Txt k="bodySmall" color={Brand.TealDark} numberOfLines={3} style={{ marginTop: 6 }}>Host: {text(obj(r, 'reply'), 'body')}</Txt> : null}
                  </View>
                ))}
              </ScrollView>
            </DetailSection>
          ) : null}
          <DetailSection title="Your host" icon="person-outline">
            {host ? (
              <View style={st.row}>
                <Avatar initials={initialsOf(text(host, 'name'))} size={48} />
                <View style={{ paddingLeft: 12 }}>
                  <Txt k="titleMedium">{text(host, 'name')}</Txt>
                  {int(host, 'since') > 0 ? <Txt k="bodySmall" color={Brand.Muted}>Hosting since {int(host, 'since')}</Txt> : null}
                </View>
              </View>
            ) : null}
            <Gap />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {bool(p, 'chat') ? (
                <Pressable onPress={() => Nav.navigate(`chat/${kind}/${id}`)} style={[st.row, { flex: 1, justifyContent: 'center', borderRadius: 50, backgroundColor: Brand.Ink, paddingVertical: 13 }]}>
                  <Icon name="chat-bubble-outline" size={18} color={Brand.Sun} /><Txt k="labelLarge" color="#fff">  Chat</Txt>
                </Pressable>
              ) : null}
              {coords.length === 2 ? (
                <Pressable onPress={() => openMaps(coords[0], coords[1], text(p, 'title'))} style={[st.row, { flex: 1, justifyContent: 'center', borderRadius: 50, borderWidth: 1.2, borderColor: '#DAD7D2', backgroundColor: '#fff', paddingVertical: 13 }]}>
                  <Icon name="directions" size={18} color={Brand.Ink} /><Txt k="labelLarge">  Directions</Txt>
                </Pressable>
              ) : null}
            </View>
          </DetailSection>
          <Gap h={8} />
        </View>
      </ScrollView>
      <PriceBar price={money(offer ?? nightly)} unit={kind === 'resort' ? '/ room night' : '/ night'} was={offer !== null && nightly !== null && offer < nightly ? money(nightly) : null}
        note={obj(p, 'hourly_booking') ? `Also by the hour · ${money(num(obj(p, 'hourly_booking'), 'price_guest'))}/hour` : str(p, 'cancellation') || str(canc, 'label')}
        button={(
          <Pressable onPress={() => setSheet(true)} style={[st.redShadow, { borderRadius: 50, backgroundColor: Brand.Blue, paddingHorizontal: 26, paddingVertical: 15 }]}>
            <Txt k="labelLarge" bold color="#fff">{text(p, 'booking_mode') === 'request' ? 'Request to book' : 'Reserve'}</Txt>
          </Pressable>
        )} />
      {sheet ? <BookingSheet kind={kind} id={id} p={p} onClose={() => setSheet(false)} /> : null}
    </View>
  );
}

function GuestStat({ value, label }: { value: string; label: string }) {
  return <View style={{ flex: 1, borderRadius: 16, backgroundColor: Brand.Page, padding: 14 }}><Txt k="headlineSmall" color={Brand.BlueDark}>{value}</Txt><Txt k="bodySmall" color={Brand.InkSoft}>{label}</Txt></View>;
}

/** Dates, guests (with children's ages), rooms and plans for resorts, food and coupon → the live price, then "Reserve". */
/** "14:30" → "2:30 pm" */
export const hm12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
const addHours = (t: string, n: number) => { const [h, m] = t.split(':').map(Number); const x = h * 60 + m + n * 60; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

/** Book by the hour: a day, how many hours, a free start time → the price, then "Reserve". */
function HourlyPart({ kind, id, p, h, onClose }: { kind: string; id: number; p: J; h: J; onClose: () => void }) {
  const [date, setDate] = useState(today());
  const [pick, setPick] = useState(today());
  const [dayOpen, setDayOpen] = useState(false);
  const min = int(h, 'min') || 2; const max = int(h, 'max_hours') || 14; const dayAfter = int(h, 'day_after') || 8;
  const [hours, setHours] = useState(min);
  const [adults, setAdults] = useState(2);
  const [start, setStart] = useState('');
  const [starts, setStarts] = useState<string[] | null>(null);
  const [quote, setQuote] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const g = obj(p, 'guests');
  // the free start times for the day and hours, and the price once a start is chosen
  useEffect(() => {
    let off = false;
    setBusy(true); setErr(null); setQuote(null);
    Api.get('availability', { kind, id, hourly: 1, date, hours, start: start || null, adults })
      .then((q) => {
        if (off) return;
        const list = (obj(q, 'hourly')?.starts as string[]) || [];
        setStarts(list);
        if (start && !list.includes(start)) { setStart(''); return; }
        if (bool(q, 'available')) setQuote(q); else if (start || !list.length) setErr(text(q, 'message', 'Not free.'));
      })
      .catch((e) => !off && setErr(errorText(e)))
      .finally(() => !off && setBusy(false));
    return () => { off = true; };
  }, [date, hours, start, adults]);
  return (
    <>
      <Bordered onPress={() => { setPick(date); setDayOpen(true); }}>
        <View style={st.row}><Icon name="calendar-today" color={Brand.Teal} size={20} />
          <View style={{ marginLeft: 10 }}><Txt k="bodySmall" color={Brand.Muted}>Day</Txt><Txt k="titleSmall">{shortDate(date)}{date === today() ? ' · today' : ''}</Txt></View></View>
      </Bordered>
      <DateRangeSheet open={dayOpen} single start={pick} end="" title="Which day?" onClose={() => setDayOpen(false)} onPick={(a) => setPick(a)} onDone={() => { if (pick) { setDate(pick); setStart(''); } setDayOpen(false); }} />
      <Gap h={8} />
      <Stepper label="Hours" value={hours} onChange={(n) => setHours(n)} min={min} max={max}
        note={hours > dayAfter ? `More than ${plural(dayAfter, 'hour')}: charged as one day` : `${money(num(h, 'price_guest'))} an hour · over ${dayAfter} hours costs one day`} />
      <Stepper label="Guests" value={adults} onChange={setAdults} min={1} max={int(g, 'max') || 20} />
      <Gap h={8} />
      <Txt k="titleSmall">Start time</Txt>
      <Gap h={6} />
      {starts === null ? <Loading /> : starts.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {starts.map((t) => (
            <Pressable key={t} onPress={() => setStart(t)} style={{ width: '31.5%', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: start === t ? Brand.Blue : Brand.Line, backgroundColor: start === t ? Brand.Blue : '#fff', paddingVertical: 9 }}>
              <Txt k="labelMedium" bold color={start === t ? '#fff' : Brand.Ink}>{hm12(t)}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Gap h={8} />
      {err ? <><Notice text={err} tone="bad" /><Gap h={8} /></> : null}
      {quote && start ? (
        <>
          <Bordered>
            <Txt k="titleSmall" color={Brand.BlueDark}>⏱️ {shortDate(date)} · {hm12(start)} – {hm12(addHours(start, hours))}</Txt>
            <Gap h={6} />
            <PriceTable lines={priceLines(quote)} total={num(quote, 'total')} />
            {str(obj(quote, 'cancellation'), 'label') ? <Txt k="bodySmall" color={Brand.TealDark} style={{ marginTop: 4 }}>{str(obj(quote, 'cancellation'), 'label')}</Txt> : null}
          </Bordered>
          <Gap />
          <PrimaryButton text={text(quote, 'booking_mode') === 'request' ? 'Request to book' : 'Reserve these hours'} onPress={() => {
            AppState.set({ reserve: { kind, id, title: text(p, 'title'), image: str(p, 'image'), checkIn: date, checkOut: date, adults, ages: [], food: false, coupon: '',
              roomId: null, planId: null, rooms: 1, quote, hourly: { date, start, hours, label: `${hm12(start)} – ${hm12(addHours(start, hours))}` } } });
            onClose(); Nav.navigate('reserve');
          }} />
        </>
      ) : !start && starts?.length ? <Notice text="Choose a start time to see the price." /> : busy && start ? <Loading /> : null}
    </>
  );
}

function BookingSheet({ kind, id, p, onClose }: { kind: string; id: number; p: J; onClose: () => void }) {
  const hb = obj(p, 'hourly_booking');
  const [mode, setMode] = useState('night');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [ages, setAges] = useState<number[]>([]);
  const [food, setFood] = useState(false);
  const [coupon, setCoupon] = useState(text(obj(obj(p, 'price'), 'offer'), 'code'));
  const rooms = objs(p, 'rooms');
  const [roomId, setRoomId] = useState<number | null>(rooms.length ? int(rooms[0], 'id') : null);
  const [planId, setPlanId] = useState(0);
  const [roomCount, setRoomCount] = useState(1);
  const [quote, setQuote] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const g = obj(p, 'guests');
  const resort = kind === 'resort';
  const reset = () => setQuote(null);

  const check = async () => {
    if (!checkIn || !checkOut) { setErr('Choose your dates first.'); return; }
    setBusy(true); setErr(null); setQuote(null);
    try {
      const q = await Api.get('availability', { kind, id, check_in: checkIn, check_out: checkOut, adults, ages: ages.join(','), food, coupon: coupon.trim() || null,
        room_id: resort ? roomId : null, plan_id: resort ? planId : null, rooms: resort ? roomCount : null });
      if (bool(q, 'available')) setQuote(q); else setErr(text(q, 'message', 'Not available for these dates.'));
    } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  const note = g && g.included !== undefined && g.included !== null ? `${g.included} included in the price${g.max ? ` · up to ${g.max}` : ''}` : undefined;
  const foodInfo = obj(p, 'food');

  return (
    <Sheet open onClose={onClose} title="Your trip">
      {hb ? <><Segmented options={[['night', 'By the night'], ['hour', 'By the hour']]} value={mode} onChange={setMode} /><Gap h={10} /></> : null}
      {hb && mode === 'hour' ? <><HourlyPart kind={kind} id={id} p={p} h={hb} onClose={onClose} /><Gap h={6} /><LinkButton text="Close" onPress={onClose} color={Brand.InkSoft} /></> : <>
      {/* the host's promotions (apply by themselves) and pay-at-property stays */}
      {objs(p, 'promotions').length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {objs(p, 'promotions').map((x) => (
            <View key={text(x, 'label')} style={{ borderRadius: 20, backgroundColor: Brand.Blue, paddingHorizontal: 10, paddingVertical: 5 }}><Txt k="labelSmall" bold color="#fff">🏷 {text(x, 'label')}</Txt></View>
          ))}
          <Txt k="labelSmall" color={Brand.Muted} style={{ width: '100%' }}>Applied by itself when your dates qualify — no code needed.</Txt>
        </View>
      ) : null}
      {bool(p, 'pay_at_property') ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: '#FFF3C4', borderWidth: 1, borderColor: '#F5D36B', padding: 12, marginBottom: 10 }}>
          <Txt k="titleLarge">💵</Txt>
          <View style={{ flex: 1 }}><Txt k="titleSmall" bold color="#4A3400">Pay at property available</Txt><Txt k="bodySmall" color="#6B5200">Book now and pay the host in cash or UPI when you arrive — nothing to pay online.</Txt></View>
        </View>
      ) : null}
      <DateRangeField checkIn={checkIn} checkOut={checkOut} booked={strings(p, 'booked_dates')} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); reset(); }} />
      <Gap h={8} />
      <Stepper label="Adults" value={adults} onChange={(n) => { setAdults(n); reset(); }} min={1} max={40} note={note} />
      <Stepper label="Children" value={ages.length} onChange={(n) => { setAges((a) => { const b = a.slice(0, n); while (b.length < n) b.push(5); return b; }); reset(); }} min={0} max={10} note="Ages help us price correctly" />
      {ages.map((a, i) => <Stepper key={i} label={`Child ${i + 1} age`} value={a} onChange={(v) => { setAges((x) => x.map((y, j) => (j === i ? v : y))); reset(); }} min={0} max={17} />)}
      {resort && rooms.length ? (
        <>
          <Gap h={8} /><Txt k="titleSmall">Room</Txt>
          {rooms.map((r, i) => {
            const sel = int(r, 'id') === roomId;
            const plans = objs(r, 'plans');
            return (
              <Pressable key={i} onPress={() => { setRoomId(int(r, 'id')); setPlanId(0); reset(); }} style={{ marginVertical: 4, borderRadius: 12, borderWidth: sel ? 2 : 1, borderColor: sel ? Brand.Blue : Brand.Line, padding: 12 }}>
                <Txt k="titleSmall">{text(r, 'name')}</Txt>
                <Txt k="bodySmall" color={Brand.Muted}>{int(r, 'max_guests')} guests included{int(r, 'max_extra') > 0 ? ` · up to ${int(r, 'max_extra')} extra (${money(num(r, 'extra_fee'))}/night each)` : ''}</Txt>
                {sel ? plans.map((pl, j) => (
                  <CheckRow key={j} text={text(pl, 'name') + ' · ' + money(num(pl, 'offer_price') ?? num(pl, 'price'))} checked={planId === int(pl, 'id') || (planId === 0 && j === 0)}
                    onChange={() => { setPlanId(int(pl, 'id')); reset(); }} note={strings(pl, 'inclusions').join(', ') || undefined} />
                )) : null}
              </Pressable>
            );
          })}
          <Stepper label="Rooms" value={roomCount} onChange={(n) => { setRoomCount(n); reset(); }} min={1} max={10} />
        </>
      ) : null}
      {bool(foodInfo, 'offered') ? <CheckRow text={`Add food (${money(num(foodInfo, 'rate'))} per person per day)`} checked={food} onChange={(v) => { setFood(v); reset(); }} /> : null}
      <Gap h={6} />
      <Field label="Coupon code (optional)" value={coupon} onChange={(v) => { setCoupon(v.toUpperCase()); reset(); }} autoCapitalize="none" />
      <Gap h={8} />
      {err ? <><Notice text={err} tone="bad" /><Gap h={8} /></> : null}
      {quote ? (
        <>
          <Bordered>
            <PriceTable lines={priceLines(quote)} total={num(quote, 'total')} />
            {str(obj(quote, 'coupon'), 'message') ? <Txt k="bodySmall" color={bool(obj(quote, 'coupon'), 'applied') ? Brand.TealDark : Brand.Warn}>{str(obj(quote, 'coupon'), 'message')}</Txt> : null}
            {str(obj(quote, 'cancellation'), 'label') ? <Txt k="bodySmall" color={Brand.TealDark} style={{ marginTop: 4 }}>{str(obj(quote, 'cancellation'), 'label')}</Txt> : null}
          </Bordered>
          <Gap />
          <PrimaryButton text={text(quote, 'booking_mode') === 'request' ? 'Request to book' : 'Reserve'} onPress={() => {
            AppState.set({ reserve: { kind, id, title: text(p, 'title'), image: str(p, 'image'), checkIn, checkOut, adults, ages, food, coupon: coupon.trim(),
              roomId: resort ? roomId : null, planId: resort ? planId : null, rooms: resort ? roomCount : 1, quote } });
            onClose(); Nav.navigate('reserve');
          }} />
        </>
      ) : <PrimaryButton text="Check the price" onPress={check} loading={busy} />}
      <Gap h={6} />
      <LinkButton text="Close" onPress={onClose} color={Brand.InkSoft} />
      </>}
    </Sheet>
  );
}

const offerShown = new Set<string>();   // the host's offer pops up once per listing while the app is open

/** The host's special offer on this stay or resort (code applied automatically when booking from here). */
function ListingOfferDialog({ k, title, price, o, book }: { k: string; title: string; price: J; o: J; book: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (offerShown.has(k)) return; const t = setTimeout(() => { offerShown.add(k); setOpen(true); }, 1400); return () => clearTimeout(t); }, [k]);
  const code = text(o, 'code'); const nightly = num(price, 'offer_nightly') || 0;
  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <LinearGradient colors={['#D93338', '#E8474B', '#FF5757']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ margin: -20, marginBottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 }}>
        <Txt k="labelLarge" color="#FFFFFFE6">✨ We have a special offer for you</Txt>
        <Txt k="headlineMedium" color="#fff" style={{ marginTop: 6 }}>{text(o, 'badge')}</Txt>
        <Txt color="#FFFFFFE6">at {title}</Txt>
      </LinearGradient>
      <View style={{ paddingTop: 20 }}>
        {nightly > 0 ? <Txt k="titleMedium">Offer price {money(nightly)} per night</Txt> : null}
        <View style={[st.row, { marginTop: 10, borderRadius: 14, backgroundColor: Brand.Page, padding: 12 }]}>
          <View style={{ flex: 1 }}><Txt k="labelMedium" color={Brand.Muted}>Your coupon code</Txt><Txt k="titleLarge">{code}</Txt></View>
          <LinkButton text="Copy" onPress={() => copyText(code)} />
        </View>
        <Txt k="bodySmall" color={Brand.InkSoft} style={{ marginTop: 10 }}>You don't need to remember it — the code is added automatically when you book from this page.</Txt>
        {str(o, 'terms') ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 4 }}>{str(o, 'terms')}</Txt> : null}
        <PrimaryButton text="Book with this offer" onPress={() => { setOpen(false); book(); }} style={{ marginTop: 14 }} />
        <LinkButton text="Maybe later" onPress={() => setOpen(false)} color={Brand.InkSoft} />
      </View>
    </Dialog>
  );
}

/** Google Maps on the stay page: the stay's spot, which the guest can move and zoom; the button opens Google Maps. */
function StayMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const [ok, setOk] = useState(true);
  const url = `https://maps.google.com/maps?q=${lat},${lng}&z=14&hl=en&output=embed`;
  return (
    <View style={{ height: 220, borderRadius: 18, overflow: 'hidden', backgroundColor: '#EDE7E3' }}>
      {ok ? (
        <WebView source={{ uri: url }} style={{ flex: 1, backgroundColor: '#EDE7E3' }} originWhitelist={['https://*']} javaScriptEnabled domStorageEnabled
          setSupportMultipleWindows={false} nestedScrollEnabled onError={() => setOk(false)}
          // taps that leave the map (e.g. "View larger map") open Google Maps instead of loading inside the box
          onShouldStartLoadWithRequest={(r) => { if (r.url.startsWith(url) || /maps\.google\.com\/maps\?q=|google\.com\/maps\/embed|gstatic|googleapis/.test(r.url) || r.url === 'about:blank') return true; openMaps(lat, lng, title); return false; }} />
      ) : (
        <Pressable onPress={() => openMaps(lat, lng, title)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="map" size={30} color={Brand.Blue} /><Txt k="labelLarge" color={Brand.Blue}>Open in Google Maps</Txt>
        </Pressable>
      )}
    </View>
  );
}

