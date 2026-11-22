/*
 * Book a stay for a guest — for hosts (their own stays) and TripArro Agents (the stays they may book).
 * The stays come from the website's stay picker; the price from the website's quote; the booking is made by the same
 * website form as on the dashboard (host/new-booking or referral/new-booking), so prices, offers, availability,
 * commission and the guest's emails are exactly the same as on the website.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { Api, errorText } from '../core/api';
import { useSession } from '../core/state';
import { J, num, obj, objs, str, text } from '../core/json';
import { Brand } from '../theme';
import { BackBar, Card, Gap, Icon, Loading, Notice, OutlineButton, Photo, PrimaryButton, Txt, money, st } from '../ui/kit';
import { DateRangeField, Field, Segmented, Stepper } from '../ui/inputs';
import { Nav, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

type Stay = { id: number; title: string; sub: string; image: string | null; price: string; attrs: J };

export default function BookGuestScreen() {
  const p = useParams();
  const s = useSession();
  const role = s?.user?.role || '';
  const agent = role === 'referral';
  const form = agent ? 'referral/new-booking' : 'host/new-booking';

  const [q, setQ] = useState('');
  const [stays, setStays] = useState<Stay[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [picking, setPicking] = useState(!p.property);
  const [booked, setBooked] = useState<string[]>([]);
  const [ci, setCi] = useState(''); const [co, setCo] = useState('');
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [pay, setPay] = useState(agent ? 'link' : 'paid');
  const [method, setMethod] = useState('cash');
  const [rate, setRate] = useState('');
  const [quote, setQuote] = useState<J | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<J | null>(null);

  // the stays this person may book
  useEffect(() => {
    let off = false;
    const t = setTimeout(async () => {
      try {
        const j = await Api.getSite('panel/picker', { type: 'stay', q });
        if (off) return;
        const list = objs(j, 'items').map((x) => ({ id: num(x, 'id') || 0, title: text(x, 'title'), sub: text(x, 'sub'), image: str(x, 'image'), price: text(x, 'price'), attrs: obj(x, 'attrs') || {} }));
        setStays(list); setLoadErr(null);
        if (!stay && p.property) { const f = list.find((x) => String(x.id) === p.property); if (f) choose(f); }
      } catch (e) { if (!off) setLoadErr(errorText(e)); }
    }, q ? 300 : 0);
    return () => { off = true; clearTimeout(t); };
  }, [q]);

  const choose = (x: Stay) => {
    setStay(x); setPicking(false); setQuote(null);
    setRate(String(num(x.attrs, 'rate') || ''));
    setGuests((g) => Math.min(g, num(x.attrs, 'cap') || g));
    Api.getSite('panel/picker/booked', { id: x.id }).then((j: any) => setBooked(Array.isArray(j) ? j : (j?.dates || j?.items || []))).catch(() => setBooked([]));
  };

  // the price from the website (with the host's offer, GST and fees)
  useEffect(() => {
    if (!stay || !ci || !co) { setQuote(null); return; }
    let off = false;
    const t = setTimeout(() => {
      Api.get('availability', { kind: 'stay', id: stay.id, check_in: ci, check_out: co, adults: guests, partner: agent ? 1 : 0, ...(rate && num(stay.attrs, 'redit') ? { rate } : {}) })
        .then((j) => { if (!off) setQuote(j); }).catch(() => { if (!off) setQuote(null); });
    }, 300);
    return () => { off = true; clearTimeout(t); };
  }, [stay?.id, ci, co, guests]);

  const payOptions: [string, string][] = agent ? [['link', 'Payment link'], ['due', 'Pays at property']] : [['paid', 'Paid'], ['due', 'At property'], ['link', 'Payment link']];
  const ready = !!stay && !!ci && !!co && name.trim().length > 1 && phone.trim().length >= 7;

  const submit = async () => {
    if (!stay) return;
    setBusy(true); setErr(null);
    try {
      const f: Record<string, string | number> = {
        property: stay.id, check_in: ci, check_out: co, guests, name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(), payment: pay,
        arrival_time: str(stay.attrs, 'cin') || '12:00', checkout_time: str(stay.attrs, 'cout') || '11:00', food: 0,
      };
      if (!agent) { f.rate = rate || String(num(stay.attrs, 'rate') || ''); f.paid_method = method; }
      else if (rate && num(stay.attrs, 'redit')) f.rate = rate;
      setDone(await Api.postSiteForm(form, f));
    } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };

  if (!['host', 'admin', 'referral'].includes(role)) return (
    <View style={{ flex: 1 }}><BackBar title="Book a guest" onBack={() => Nav.back()} /><View style={{ padding: 16 }}><Notice text="Booking for guests is for hosts and TripArro Agents. Sign in with that account." /></View></View>
  );
  if (done) {
    const link = str(done, 'pay_link');
    return (
      <View style={{ flex: 1 }}>
        <BackBar title="Booking made" onBack={() => Nav.back()} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}>
          <Card>
            <View style={[st.row, { gap: 12 }]}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#DDF3E5', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" color="#0B6B3A" size={28} /></View>
              <View style={{ flex: 1 }}><Txt k="titleLarge">{text(done, 'ref')}</Txt><Txt color={Brand.InkSoft}>{text(done, 'guest')} · {text(done, 'stay')}</Txt></View>
            </View>
            <Gap />
            <Notice tone="ok" text={text(done, 'message')} />
            <Gap />
            <Txt k="titleMedium">Guest pays {money(num(done, 'total') || 0)}</Txt>
            {link ? <>
              <Gap />
              <PrimaryButton text="Send the payment link" icon="share" onPress={() => Share.share({ message: str(done, 'share_text') || link }).catch(() => {})} />
            </> : null}
          </Card>
          <Gap />
          <OutlineButton text="Book another guest" icon="person-add-alt" onPress={() => { setDone(null); setName(''); setPhone(''); setEmail(''); setNotes(''); setCi(''); setCo(''); setQuote(null); }} />
          <Gap h={10} />
          <OutlineButton text="Back to my dashboard" onPress={() => Nav.navigate('hosting')} />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BackBar title={agent ? 'Book for a guest' : 'Book a guest'} onBack={() => Nav.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
        {/* 1 · the stay */}
        <Txt k="titleMedium">Stay</Txt>
        <Gap h={8} />
        {stay && !picking ? (
          <Card padding={10}>
            <View style={[st.row, { gap: 12 }]}>
              <Photo url={stay.image} style={{ width: 64, height: 64 }} corner={14} />
              <View style={{ flex: 1 }}><Txt k="titleSmall" numberOfLines={2}>{stay.title}</Txt><Txt k="bodySmall" color={Brand.Muted} numberOfLines={1}>{stay.sub}</Txt><Txt k="labelLarge" color={Brand.Blue}>{stay.price}/night</Txt></View>
              <Pressable onPress={() => setPicking(true)} hitSlop={8}><Txt k="labelLarge" color={Brand.Blue}>Change</Txt></Pressable>
            </View>
          </Card>
        ) : (
          <>
            <Field label="Search your stays" value={q} onChange={setQ} placeholder="Name or town" />
            <Gap h={8} />
            {loadErr ? <Notice tone="bad" text={loadErr} /> : !stays ? <Loading /> : !stays.length ? <Notice text="No stays found." /> : stays.slice(0, 30).map((x) => (
              <Pressable key={x.id} onPress={() => choose(x)} style={[st.row, { gap: 12, padding: 10, marginBottom: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: Brand.Line }]}>
                <Photo url={x.image} style={{ width: 54, height: 54 }} corner={12} />
                <View style={{ flex: 1 }}><Txt k="titleSmall" numberOfLines={1}>{x.title}</Txt><Txt k="bodySmall" color={Brand.Muted} numberOfLines={1}>{x.sub}</Txt></View>
                <Txt k="labelLarge" color={Brand.Blue}>{x.price}</Txt>
              </Pressable>
            ))}
          </>
        )}

        {stay && !picking ? <>
          {/* 2 · dates and guests */}
          <Gap />
          <DateRangeField checkIn={ci} checkOut={co} onChange={(a, b) => { setCi(a); setCo(b); }} booked={booked} label="Check-in → check-out" />
          <Gap h={10} />
          <Stepper label="Guests" value={guests} onChange={setGuests} min={1} max={num(stay.attrs, 'cap') || 20} note={`${num(stay.attrs, 'inc') || 1} included in the price`} />
          {(!agent || num(stay.attrs, 'redit')) ? <><Gap h={10} /><Field label="Price per night (₹)" value={rate} onChange={setRate} keyboard="numeric" /></> : null}

          {/* the price */}
          {quote ? (
            <Card style={{ marginTop: 12 }}>
              {quote.available === false ? <Notice tone="bad" text={text(quote, 'message') || 'These dates are not available.'} /> : <>
                {objs(quote, 'lines').map((l, i) => (
                  <View key={i} style={[st.row, { justifyContent: 'space-between', paddingVertical: 3 }]}><Txt k="bodySmall" color={Brand.InkSoft} style={{ flex: 1 }}>{text(l, 'label')}</Txt><Txt k="bodySmall">{(num(l, 'amount') || 0) < 0 ? '− ' : ''}{money(Math.abs(num(l, 'amount') || 0))}</Txt></View>
                ))}
                <View style={[st.row, { justifyContent: 'space-between', marginTop: 6 }]}><Txt k="titleSmall">Guest pays</Txt><Txt k="titleMedium">{money(num(quote, 'total') || 0)}</Txt></View>
                {agent && obj(quote, 'partner') ? <Txt k="labelMedium" color="#0B6B3A" style={{ marginTop: 4 }}>Your commission {money(num(obj(quote, 'partner'), 'commission') || 0)}</Txt> : null}
                {!agent ? <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 4 }}>The final price uses the price per night above.</Txt> : null}
              </>}
            </Card>
          ) : null}

          {/* 3 · the guest */}
          <Gap />
          <Txt k="titleMedium">Guest</Txt>
          <Gap h={8} />
          <Field label="Full name" value={name} onChange={setName} autoCapitalize="words" />
          <Gap h={8} />
          <Field label="Mobile number" value={phone} onChange={setPhone} keyboard="phone-pad" />
          <Gap h={8} />
          <Field label={pay === 'link' && !agent ? 'Email (needed for the payment link)' : 'Email (optional)'} value={email} onChange={setEmail} keyboard="email-address" autoCapitalize="none" />
          <Gap h={8} />
          <Field label="Note (optional)" value={notes} onChange={setNotes} lines={2} maxLength={500} />

          {/* 4 · payment */}
          <Gap />
          <Txt k="titleMedium">Payment</Txt>
          <Gap h={8} />
          <Segmented options={payOptions} value={pay} onChange={setPay} />
          <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6 }}>
            {pay === 'paid' ? 'The guest has paid you — the booking is confirmed now and the invoice is sent.' : pay === 'due' ? 'Confirmed now; the guest pays at the property.' : 'The guest gets a secure payment link; the dates are held until they pay.'}
          </Txt>
          {pay === 'paid' ? <><Gap h={8} /><Segmented options={[['cash', 'Cash'], ['upi', 'UPI'], ['bank', 'Bank']]} value={method} onChange={setMethod} /></> : null}

          <Gap />
          {err ? <><Notice tone="bad" text={err} /><Gap h={8} /></> : null}
          <PrimaryButton text={pay === 'link' ? 'Book and get the payment link' : 'Confirm the booking'} icon="event-available" loading={busy} disabled={!ready || quote?.available === false} onPress={submit} />
        </> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
