// Guest details, the price once more, and payment (or a booking request with the ID photo).
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { AppState, useAppState, useSession } from '../core/state';
import { bool, num, obj, priceLines, str, text } from '../core/json';
import { Picked, pickPhoto, uploadOf } from '../core/files';
import { Brand } from '../theme';
import { BackBar, Card, EmptyBox, Gap, Notice, OutlineButton, Photo, PriceTable, PrimaryButton, Txt, money, plural, prettyDate } from '../ui/kit';
import { CheckRow, Choice, Field } from '../ui/inputs';
import { Nav } from '../nav';

const idTypes: [string, string][] = [['aadhaar', 'Aadhaar card'], ['passport', 'Passport'], ['dl', 'Driving licence'], ['voter', 'Voter ID'], ['pan', 'PAN card'], ['other', 'Other government ID']];

export default function ReserveScreen() {
  const d = useAppState('reserve');
  const session = useSession();
  const user = session?.user;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [requests, setRequests] = useState('');
  const [arrival, setArrival] = useState('');
  const [agree, setAgree] = useState(false);
  const advance = obj(d?.quote, 'advance');
  const [payAdvance, setPayAdvance] = useState(bool(advance, 'only'));
  const [useWallet, setUseWallet] = useState(true);
  const [idType, setIdType] = useState('aadhaar');
  const [idFront, setIdFront] = useState<Picked | null>(null);
  const [idBack, setIdBack] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  if (!d) return <View style={{ flex: 1 }}><BackBar title="Reserve" onBack={Nav.back} /><EmptyBox title="Nothing to book" text="Choose a stay first." /></View>;

  const isRequest = text(d.quote, 'booking_mode') === 'request';
  // the guest's rewards wallet (homestays); the server works out how much it can pay (admin's % of the booking)
  const walletBal = user?.wallet || 0;
  const walletOn = !isRequest && d.kind === 'stay' && walletBal > 0 && useWallet;

  const submit = async () => {
    if (!agree) { setErr('Please accept the house rules and cancellation policy.'); return; }
    if (isRequest && !idFront) { setErr('Add a photo of the front of your ID.'); return; }
    setBusy(true); setErr(null); setFieldErr({});
    try {
      if (!session?.user && session?.loginToBook !== false) { setBusy(false); Nav.navigate('login'); return; }
      const base: Record<string, any> = { kind: d.kind, id: d.id, check_in: d.checkIn, check_out: d.checkOut, adults: d.adults, food: d.food ? 1 : 0, coupon: d.coupon || null,
        room_id: d.roomId, plan_id: d.planId, rooms: d.rooms, name: name.trim(), email: email.trim(), phone: phone.trim(), requests: requests.trim(), arrival_time: arrival.trim(),
        agree: true, expected_total: num(d.quote, 'total') };
      let r;
      if (isRequest) {
        const files: Upload[] = [await uploadOf('id_front', idFront!, 'id-front', 2000)];
        if (idBack) files.push(await uploadOf('id_back', idBack, 'id-back', 2000));
        const fields: [string, string][] = Object.entries(base).filter(([, v]) => v !== null && v !== undefined && String(v) !== '').map(([k, v]) => [k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)]);
        fields.push(['children_ages', d.ages.join(',')], ['id_type', idType]);
        r = await Api.postMultipart('bookings', fields, files);
      } else r = await Api.post('bookings', { ...base, children_ages: d.ages });
      const ref = text(r, 'ref');
      AppState.bump();
      if (text(r, 'next') === 'payment') {
        const pay = await Api.post('payments', { ref, kind: payAdvance && !walletOn ? 'advance' : 'full', use_wallet: walletOn });
        Nav.replace(`booking/${ref}`);
        if (!bool(pay, 'paid')) {   // paid = the wallet covered all of it
          AppState.set({ payment: { action: text(pay, 'action'), fields: obj(pay, 'fields') || {}, title: 'Pay securely' } });
          setTimeout(() => Nav.navigate('pay'), 50);
        }
      } else Nav.replace(`booking/${ref}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) Nav.navigate('login');
      else { setErr(errorText(e)); if (e instanceof ApiError) setFieldErr(e.errors); }
    }
    setBusy(false);
  };

  const pickId = async (side: 'front' | 'back') => {
    const p = await pickPhoto('album'); if (!p) return;
    side === 'front' ? setIdFront(p) : setIdBack(p);
  };

  return (
    <View style={{ flex: 1 }}>
      <BackBar title={isRequest ? 'Request to book' : 'Confirm and pay'} onBack={Nav.back} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={{ flexDirection: 'row' }}>
            <Photo url={d.image} style={{ width: 96, aspectRatio: 1.2 }} />
            <View style={{ paddingLeft: 12, flex: 1 }}>
              <Txt k="titleMedium">{d.title}</Txt>
              <Txt k="bodySmall" color={Brand.InkSoft}>{prettyDate(d.checkIn)} → {prettyDate(d.checkOut)}</Txt>
              <Txt k="bodySmall" color={Brand.InkSoft}>{plural(d.adults, 'adult') + (d.ages.length ? ' · ' + plural(d.ages.length, 'child') : '') + (d.kind === 'resort' ? ' · ' + plural(d.rooms, 'room') : '')}</Txt>
            </View>
          </View>
          <Gap />
          <PriceTable lines={priceLines(d.quote)} total={num(d.quote, 'total')} />
          {!isRequest && d.kind === 'stay' && walletBal > 0 ? <><Gap h={8} /><CheckRow text={`Use my TripArro wallet (balance ${money(walletBal)})`} checked={useWallet} onChange={() => setUseWallet(!useWallet)} note="Part of this booking is paid from your rewards — you pay the rest online." /></> : null}
          {advance && !walletOn ? (
            <>
              <Gap h={8} />
              {bool(advance, 'only') ? <Notice text={`Pay ${money(num(advance, 'amount'))} now; the balance ${money(num(advance, 'balance'))} is paid later.`} /> : <>
                <CheckRow text={`Pay in full now · ${money(num(d.quote, 'total'))}`} checked={!payAdvance} onChange={() => setPayAdvance(false)} />
                <CheckRow text={`Pay an advance now · ${money(num(advance, 'amount'))}`} checked={payAdvance} onChange={() => setPayAdvance(true)} note={str(advance, 'label') || `Balance ${money(num(advance, 'balance'))} later`} />
              </>}
            </>
          ) : null}
        </Card>
        <Gap />
        <Txt k="titleLarge">Your details</Txt>
        <Gap h={6} />
        <Field label="Full name" value={name} onChange={setName} error={fieldErr.name} autoCapitalize="words" />
        <Gap h={6} />
        <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" autoCapitalize="none" error={fieldErr.email} />
        <Gap h={6} />
        <Field label="Mobile number" value={phone} onChange={setPhone} keyboard="phone-pad" error={fieldErr.phone} />
        <Gap h={6} />
        <Field label="Arrival time (optional)" value={arrival} onChange={setArrival} placeholder="e.g. 3 pm" />
        <Gap h={6} />
        <Field label="Requests for the host (optional)" value={requests} onChange={setRequests} lines={3} />
        {isRequest ? (
          <>
            <Gap />
            <Txt k="titleLarge">Your ID</Txt>
            <Txt k="bodySmall" color={Brand.InkSoft}>The host approves each booking first and needs your ID. You pay only after they accept (within 24 hours).</Txt>
            <Gap h={6} />
            <Choice label="ID type" value={idType} options={idTypes} onChange={setIdType} />
            <Gap h={6} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <OutlineButton text={idFront ? 'Change front' : 'Front photo'} onPress={() => pickId('front')} />
                {idFront ? <Image source={{ uri: idFront.uri }} style={{ width: '100%', aspectRatio: 1.6, marginTop: 6, borderRadius: 10 }} contentFit="cover" /> : null}
                {fieldErr.id_front ? <Txt k="bodySmall" color={Brand.Danger}>{fieldErr.id_front}</Txt> : null}
              </View>
              <View style={{ flex: 1 }}>
                <OutlineButton text={idBack ? 'Change back' : 'Back (optional)'} onPress={() => pickId('back')} />
                {idBack ? <Image source={{ uri: idBack.uri }} style={{ width: '100%', aspectRatio: 1.6, marginTop: 6, borderRadius: 10 }} contentFit="cover" /> : null}
              </View>
            </View>
          </>
        ) : null}
        <Gap />
        <CheckRow text="I accept the house rules and the cancellation policy" checked={agree} onChange={setAgree} />
        {err ? <><Gap h={6} /><Notice text={err} tone="bad" /></> : null}
        <Gap />
        <PrimaryButton text={isRequest ? 'Send request' : 'Book and pay'} onPress={submit} loading={busy} />
        {!isRequest ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 8 }}>You pay on the secure PayU / Razorpay page. The booking is confirmed when the payment succeeds.</Txt> : null}
      </ScrollView>
    </View>
  );
}
