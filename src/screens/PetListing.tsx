// A pet host's page: photos, what they offer, rules, verified reviews, free places, and booking with the live price.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Api, ApiError, errorText } from '../core/api';
import { AppState, useLoader, useSession } from '../core/state';
import { J, bool, int, num, obj, objs, priceLines, str, strings, text } from '../core/json';
import { Brand } from '../theme';
import { Avatar, BackBar, Bordered, ErrorBox, Gap, Icon, Loading, Notice, OutlineButton, Pill, PriceTable, PrimaryButton, RoundAction, Stars, Txt, initialsOf, money, plural, shareLink, shortDate, st } from '../ui/kit';
import { CheckRow, DateRangeField, Field, Segmented, Stepper } from '../ui/inputs';
import { AmenityGrid, DetailSection, ExpandRow, FactTiles, HeroGallery, PRICE_BAR_SPACE, PriceBar, RatingBadge, TimeTiles, TitleCard } from '../ui/detail';
import { RefundTag, isRefundable } from '../ui/cards';
import { ExpandText } from '../ui/sheets';
import { petEmoji } from '../ui/petcards';
import { Nav, enc, intParam, useParams } from '../nav';

export default function PetListingScreen() {
  const id = intParam(useParams().id);
  const session = useSession();
  const signedIn = !!session?.user;
  const l = useLoader(() => Api.get(`pets/listings/${id}`), [id]);
  const meta = useLoader(() => Api.get('pets/meta'), [session?.user?.id]);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [kind, setKind] = useState('boarding');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [petIds, setPetIds] = useState<number[]>([]);
  const [count, setCount] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [plan, setPlan] = useState('full');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [wa, setWa] = useState(true);
  const [agree, setAgree] = useState(false);
  const [quote, setQuote] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<any>(null);
  const bookY = useRef(0); const bodyY = useRef(0);
  const myPets = objs(meta.data, 'pets');
  const nPets = signedIn && myPets.length ? petIds.length : count;

  useEffect(() => {
    setQuote(null);
    if (!checkIn || !checkOut || nPets < 1) return;
    let alive = true;
    const t = setTimeout(() => {
      Api.get('pets/quote', { id, check_in: checkIn, check_out: checkOut, kind, pay_plan: plan, extras: extras.join(',') || null, coupon: couponApplied || null,
        pet_ids: signedIn && petIds.length ? petIds.join(',') : null, pets: signedIn && petIds.length ? null : nPets })
        .then((q) => alive && setQuote(q)).catch((e) => alive && setErr(errorText(e)));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [id, kind, checkIn, checkOut, petIds.join(','), count, extras.join(','), plan, couponApplied]);

  const book = async () => {
    const q = quote; if (!q) return;
    if (!signedIn) { Nav.navigate('login'); return; }
    if (!petIds.length) { setErr('Choose which of your pets are coming (add them in My pets).'); return; }
    if (!agree) { setErr('Please accept the cancellation policy and house rules.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await Api.post('pets/bookings', { id, check_in: checkIn, check_out: checkOut, kind, pet_ids: petIds, extras, pay_plan: plan, name: session?.user?.name, email: session?.user?.email,
        phone: phone.trim(), notes: notes.trim(), wa_optin: wa, agree: true, expected_total: num(q, 'total'), coupon: str(q, 'coupon') || '' });
      const ref = text(r, 'ref');
      AppState.bump();
      if (text(r, 'next') === 'payment') {
        const pay = await Api.post(`pets/bookings/${ref}/pay`);
        AppState.set({ payment: { action: text(pay, 'action'), fields: obj(pay, 'fields') || {}, title: 'Pay securely' } });
        Nav.navigate(`petbooking/${ref}`); setTimeout(() => Nav.navigate('pay'), 50);
      } else Nav.navigate(`petbooking/${ref}`);
    } catch (e) { if (e instanceof ApiError && e.status === 401) Nav.navigate('login'); else setErr(errorText(e)); }
    setBusy(false);
  };

  const p = l.data;
  if (!p) return <View style={{ flex: 1 }}><BackBar title="" onBack={Nav.back} />{l.loading ? <Loading /> : <ErrorBox message={l.error || 'This pet host is not available.'} onRetry={l.reload} />}</View>;
  const gallery = strings(p, 'gallery'); if (!gallery.length && str(p, 'image')) gallery.push(str(p, 'image')!);
  const host = obj(p, 'host');
  const isSaved = saved ?? bool(p, 'saved');
  const facts: [string, string][] = [['pets', `Up to ${plural(int(p, 'capacity'), 'pet')}`]];
  if (bool(p, 'vaccination_required')) facts.push(['vaccines', 'Vaccination required']);
  if ((num(p, 'multi_discount') || 0) > 0) facts.push(['local-offer', `${Math.round(num(p, 'multi_discount')!)}% off 2nd pet`]);
  if (num(p, 'daycare_price') !== null) facts.push(['wb-sunny', `Daycare ${money(num(p, 'daycare_price'))}/day`]);
  const per = (x: J) => ({ night: ' / night', pet: ' / pet / night' } as Record<string, string>)[text(x, 'per')] || '';
  const cal = objs(p, 'calendar').slice(0, 30);
  const canc = obj(p, 'cancellation');
  const reviews = objs(p, 'review_list');
  const dep = num(p, 'deposit_percent') || 0;
  const q = quote;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: PRICE_BAR_SPACE }}>
        <HeroGallery urls={gallery} onOpen={(u) => Nav.navigate('photo?url=' + enc(u) + '&title=' + enc(text(p, 'title')))} actions={<>
          <RoundAction icon="arrow-back" label="Back" onPress={Nav.back} />
          <View style={{ flex: 1 }} />
          <RoundAction icon="share" label="Share" onPress={() => shareLink(text(p, 'title'), Api.url(`pet-boarding/${id}`))} />
          {signedIn ? <RoundAction icon={isSaved ? 'favorite' : 'favorite-border'} label={isSaved ? 'Saved' : 'Save'} tint={isSaved ? Brand.Coral : Brand.Ink}
            onPress={() => { const next = !isSaved; setSaved(next); Api.post('pets/saved', { id, on: next }).catch(() => setSaved(!next)); }} /> : null}
        </>} />
        <View style={{ marginTop: -30 }}>
          <TitleCard>
            <View style={st.row}><Icon name="place" size={16} color={Brand.Teal} /><Txt color={Brand.InkSoft} numberOfLines={1} style={{ flex: 1 }}> {text(p, 'location')}</Txt></View>
            <Txt k="headlineSmall" style={{ marginTop: 4, marginBottom: 10 }}>{text(p, 'title')}</Txt>
            <View style={[st.row, { gap: 6, flexWrap: 'wrap' }]}>
              <RatingBadge rating={num(p, 'rating')} count={int(p, 'reviews')} />
              {bool(p, 'instant') ? <Pill text="⚡ Instant booking" tone="info" /> : <Pill text="Host approves" tone="warn" />}
            </View>
            <View style={[st.row, { marginTop: 14, borderRadius: 16, backgroundColor: Brand.Page, padding: 12 }]}>
              <Avatar initials={initialsOf(text(host, 'person'))} size={42} />
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Txt k="titleSmall">Hosted by {text(host, 'person')}</Txt>
                {bool(host, 'verified') ? <View style={st.row}><Icon name="verified" size={14} color={Brand.Teal} /><Txt k="bodySmall" color={Brand.TealDark}> Verified pet host — ID and home checked</Txt></View> : null}
              </View>
            </View>
            <Gap h={14} />
            <FactTiles items={facts} />
          </TitleCard>
        </View>
        <View style={{ marginTop: 6 }} onLayout={(e) => { bodyY.current = e.nativeEvent.layout.y; }}>
          <DetailSection title="Pets welcome" icon="pets">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[...strings(p, 'pet_types_label'), ...strings(p, 'sizes_label')].map((t, i) => <View key={i} style={{ borderRadius: 50, backgroundColor: Brand.TealSoft, paddingHorizontal: 12, paddingVertical: 7 }}><Txt k="labelLarge" color={Brand.TealDark}>{t}</Txt></View>)}
            </View>
            {str(p, 'breeds_note') ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 8 }}>{str(p, 'breeds_note')}</Txt> : null}
          </DetailSection>
          <DetailSection title="Prices" icon="sell">
            <PriceRow label="Boarding" value={`${money(num(p, 'price'))} per pet / night`} />
            {num(p, 'weekend_price') !== null ? <PriceRow label="Fri & Sat nights" value={`${money(num(p, 'weekend_price'))} per pet`} /> : null}
            {num(p, 'daycare_price') !== null ? <PriceRow label="Daycare" value={`${money(num(p, 'daycare_price'))} per pet / day`} /> : null}
            {objs(p, 'extras').map((x, i) => <PriceRow key={i} label={text(x, 'name')} value={money(num(x, 'price')) + per(x)} />)}
            {dep > 0 ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>Pay a {Math.round(dep)}% deposit to confirm, the rest by check-in.</Txt> : null}
          </DetailSection>
          {str(p, 'description') ? <DetailSection title="About" icon="info-outline"><ExpandText text={str(p, 'description')!} /></DetailSection> : null}
          {strings(p, 'facilities').length ? <DetailSection title="Facilities" icon="checklist"><AmenityGrid items={strings(p, 'facilities')} /></DetailSection> : null}
          {cal.length ? (
            <DetailSection title="Free places" icon="calendar-month" sub="The next few weeks">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {cal.map((d, i) => {
                  const free = int(d, 'free') > 0 && !bool(d, 'blocked');
                  const [dd, mm] = shortDate(text(d, 'date')).split(' ');
                  return (
                    <View key={i} style={{ width: 62, borderRadius: 14, backgroundColor: free ? Brand.TealSoft : Brand.Page, paddingVertical: 10, alignItems: 'center' }}>
                      <Txt k="labelSmall" color={Brand.Muted}>{dd}</Txt><Txt k="titleSmall">{mm}</Txt>
                      <Txt k="labelSmall" color={free ? Brand.TealDark : Brand.Muted}>{bool(d, 'blocked') ? 'off' : free ? `${int(d, 'free')} free` : 'full'}</Txt>
                    </View>
                  );
                })}
              </ScrollView>
            </DetailSection>
          ) : null}
          <DetailSection title="Drop-off and pick-up" icon="schedule" sub={`${int(p, 'min_nights')}–${int(p, 'max_nights')} nights`}>
            <TimeTiles leftLabel="Drop-off from" left={text(p, 'checkin_time', '—')} rightLabel="Pick-up by" right={text(p, 'checkout_time', '—')} />
          </DetailSection>
          {str(p, 'checkin_rules') || str(p, 'house_rules') ? (
            <DetailSection title="Things to know" icon="lightbulb-outline">
              {str(p, 'checkin_rules') ? <ExpandRow title="What to bring" text={str(p, 'checkin_rules')!} startOpen /> : null}
              {str(p, 'house_rules') ? <ExpandRow title="House rules" text={str(p, 'house_rules')!} /> : null}
            </DetailSection>
          ) : null}
          {canc ? <DetailSection title="Cancellation" icon="event-available" sub={text(canc, 'name')}><RefundTag refundable={isRefundable(canc)} /><Gap h={6} /><Txt color={Brand.InkSoft}>{text(canc, 'text')}</Txt></DetailSection> : null}
          <View onLayout={(e) => { bookY.current = e.nativeEvent.layout.y; }}>
            <DetailSection title="Book a stay" icon="event-available" sub={bool(p, 'instant') ? 'Confirmed as soon as you pay' : 'The host answers within a day'}>
              {num(p, 'daycare_price') !== null ? <><Segmented options={[['boarding', 'Boarding'], ['daycare', 'Daycare']]} value={kind} onChange={setKind} /><Gap h={8} /></> : null}
              <DateRangeField checkIn={checkIn} checkOut={checkOut} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
              <Gap h={8} />
              {signedIn && myPets.length ? (
                <>
                  <Txt k="titleSmall">Which pets are coming?</Txt>
                  {myPets.map((pet) => {
                    const pid = int(pet, 'id'); const ok = strings(p, 'pet_types').includes(text(pet, 'type'));
                    return <CheckRow key={pid} text={(petEmoji[text(pet, 'type')] || '🐾') + ' ' + text(pet, 'name')} checked={petIds.includes(pid)}
                      onChange={(v) => setPetIds((x) => (v ? [...x, pid] : x.filter((y) => y !== pid)))} note={ok ? str(pet, 'breed') || undefined : 'This host does not take this kind of pet'} />;
                  })}
                  <OutlineButton text="Add a pet" onPress={() => Nav.navigate('petform/0')} style={{ alignSelf: 'flex-start' }} />
                </>
              ) : (
                <>
                  <Stepper label="Pets" value={count} onChange={setCount} min={1} max={Math.max(1, int(p, 'capacity'))} />
                  <Notice text={signedIn ? 'Add your pets in My pets to book — their care notes go to the host.' : 'Sign in and add your pets to book.'} />
                  <Gap h={6} />
                  <OutlineButton text={signedIn ? 'Add a pet' : 'Sign in'} onPress={() => Nav.navigate(signedIn ? 'petform/0' : 'login')} style={{ alignSelf: 'flex-start' }} />
                </>
              )}
              {objs(p, 'extras').length ? (
                <>
                  <Gap h={8} /><Txt k="titleSmall">Extra services</Txt>
                  {objs(p, 'extras').map((x) => {
                    const k = text(x, 'key');
                    return <CheckRow key={k} text={`${text(x, 'name')} · ${money(num(x, 'price'))}` + (({ night: ' per night', pet: ' per pet per night' } as Record<string, string>)[text(x, 'per')] || '')}
                      checked={extras.includes(k)} onChange={(v) => setExtras((e) => (v ? [...e, k] : e.filter((y) => y !== k)))} />;
                  })}
                </>
              ) : null}
              {dep > 0 ? (
                <>
                  <Gap h={8} />
                  <CheckRow text="Pay in full now" checked={plan === 'full'} onChange={() => setPlan('full')} />
                  <CheckRow text={`Pay a ${Math.round(dep)}% deposit now`} checked={plan === 'deposit'} onChange={() => setPlan('deposit')} note="The rest is paid by check-in" />
                </>
              ) : null}
              <Gap h={8} />
              <View style={st.row}>
                <Field label="Coupon code" value={coupon} onChange={(v) => setCoupon(v.toUpperCase())} style={{ flex: 1 }} autoCapitalize="none" />
                <OutlineButton text="Apply" onPress={() => setCouponApplied(coupon.trim())} style={{ marginLeft: 8 }} />
              </View>
              {q ? (
                <>
                  <Gap h={8} />
                  {[...strings(q, 'errors'), ...strings(q, 'suitability')].map((e, i) => <Notice key={i} text={e} tone="bad" style={{ marginBottom: 4 }} />)}
                  {str(q, 'coupon_error') ? <Notice text={str(q, 'coupon_error')!} tone="warn" style={{ marginBottom: 4 }} /> : null}
                  {priceLines(q).length ? (
                    <Bordered>
                      {num(q, 'free') !== null ? <Txt k="bodySmall" color={(num(q, 'free') || 0) > 0 ? Brand.TealDark : Brand.Warn}>{(num(q, 'free') || 0) > 0 ? `${plural(Math.round(num(q, 'free')!), 'place')} free for these dates` : 'No places free for these dates'}</Txt> : null}
                      <PriceTable lines={priceLines(q)} total={num(q, 'total')} extra={plan === 'deposit' ? [['Deposit now', money(num(q, 'pay_now'))]] : []} />
                    </Bordered>
                  ) : null}
                </>
              ) : null}
              <Gap h={8} />
              <Field label="Mobile number" value={phone} onChange={setPhone} keyboard="phone-pad" />
              <Gap h={6} />
              <Field label="Message to the host (optional)" value={notes} onChange={setNotes} lines={2} />
              <CheckRow text="Send booking updates on WhatsApp" checked={wa} onChange={setWa} note="Reply STOP any time to turn them off" />
              <CheckRow text="I accept the cancellation policy and house rules" checked={agree} onChange={setAgree} />
              {err ? <><Gap h={6} /><Notice text={err} tone="bad" /></> : null}
              <Gap h={8} />
              <PrimaryButton text={bool(p, 'instant') ? 'Book and pay' : 'Send request'} onPress={book} disabled={!bool(q, 'ok')} loading={busy} />
              {!bool(p, 'instant') ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 6 }}>The host answers within a day. You pay only after they accept.</Txt> : null}
            </DetailSection>
          </View>
          <DetailSection title="Verified reviews" icon="star-outline" sub="Only pet parents who completed a stay can review">
            {!reviews.length ? <Txt color={Brand.InkSoft}>No reviews yet.</Txt> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {reviews.map((r, i) => (
                  <View key={i} style={{ width: 260, borderRadius: 18, backgroundColor: Brand.Page, padding: 14 }}>
                    <View style={st.row}>
                      <Avatar initials={initialsOf(text(r, 'name'))} size={34} />
                      <View style={{ flex: 1, paddingLeft: 8 }}><Txt k="titleSmall">{text(r, 'name')}</Txt><Txt k="labelSmall" color={Brand.TealDark}>Verified stay · {text(r, 'date')}</Txt></View>
                      <Stars rating={num(r, 'overall')} />
                    </View>
                    {str(r, 'body') ? <Txt color={Brand.InkSoft} numberOfLines={5} style={{ marginTop: 8 }}>{str(r, 'body')}</Txt> : null}
                    {str(r, 'host_response') ? <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={3} style={{ marginTop: 6 }}>Host's reply: {str(r, 'host_response')}</Txt> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </DetailSection>
          <Gap h={8} />
        </View>
      </ScrollView>
      <PriceBar price={money(num(p, 'price'))} unit="/ pet / night" note={bool(p, 'instant') ? 'Instant booking' : 'You pay after the host accepts'}
        button={<Pressable onPress={() => scroll.current?.scrollTo({ y: bodyY.current + bookY.current, animated: true })} style={{ borderRadius: 50, backgroundColor: Brand.Blue, paddingHorizontal: 26, paddingVertical: 15 }}><Txt k="labelLarge" bold color="#fff">Book a stay</Txt></Pressable>} />
    </View>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return <View style={[st.row, { paddingVertical: 5 }]}><Txt color={Brand.InkSoft} style={{ flex: 1 }}>{label}</Txt><Txt k="titleSmall">{value}</Txt></View>;
}
