// A pet services booking: progress, the private Pet Stay Diary, price, pay, cancel, review, receipt.
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Api, Upload, errorText } from '../core/api';
import { AppState, useAppState, useLoader } from '../core/state';
import { J, arr, bool, int, num, obj, objs, priceLines, str, text } from '../core/json';
import { Picked, pickPhotos, uploadOf } from '../core/files';
import { Brand } from '../theme';
import { BackBar, Card, ErrorBox, Gap, KeyValue, LinkButton, Loading, Notice, OutlineButton, Photo, Pill, PriceTable, PrimaryButton, SectionTitle, StarPicker, Stars, Txt, dateTime, money, plural, prettyDate } from '../ui/kit';
import { Field } from '../ui/inputs';
import { Dialog, dial } from '../ui/sheets';
import { petEmoji } from '../ui/petcards';
import { Nav, enc, useParams } from '../nav';

const steps: [string, string][] = [['awaiting_approval', 'Request sent'], ['awaiting_payment', 'Payment'], ['confirmed', 'Confirmed'], ['checked_in', 'Checked in'], ['checked_out', 'Checked out']];

export default function PetBookingScreen() {
  const prm = useParams();
  const ref = prm.ref || '';
  const notice = prm.paid ? 'paid' : prm.failed ? 'failed' : prm.refund ? 'refund' : null;
  const tick = useAppState('refreshTick');
  const l = useLoader(() => Api.get(`pets/bookings/${ref}`), [ref, tick]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cancelQuote, setCancelQuote] = useState<J | null>(null);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [reviewBody, setReviewBody] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<Picked[]>([]);
  const b = l.data;
  if (!b) return <View style={{ flex: 1 }}><BackBar title={`Pet booking ${ref}`} onBack={Nav.back} />{l.loading ? <Loading /> : <ErrorBox message={l.error || 'Booking not found.'} onRetry={l.reload} />}</View>;

  const li = obj(b, 'listing') || {};
  const status = text(b, 'status');
  const closed = ['cancelled', 'refunded'].includes(status);
  const unit = text(b, 'booking_kind') === 'daycare' ? 'day' : 'night';
  const order = steps.map((s) => s[0]);
  const cur = status === 'in_progress' ? 'checked_in' : status === 'completed' ? 'checked_out' : status;
  const idx = Math.max(0, order.indexOf(cur));
  const rev = obj(b, 'review');
  const partsObj = obj(b, 'review_parts');
  const parts: [string, string][] = partsObj ? Object.keys(partsObj).map((k) => [k, String(partsObj[k])]) : [['overall', 'Overall'], ['cleanliness', 'Cleanliness'], ['safety', 'Pet safety'], ['communication', 'Host communication'], ['value', 'Value for money']];
  const diary = objs(b, 'diary');
  const h = obj(b, 'host') || {};
  const canc = arr<string>(b, 'cancellation');
  const q = cancelQuote;

  const pay = async () => {
    setBusy(true); setMsg(null);
    try { const p = await Api.post(`pets/bookings/${ref}/pay`); AppState.set({ payment: { action: text(p, 'action'), fields: obj(p, 'fields') || {}, title: 'Pay securely' } }); Nav.navigate('pay'); }
    catch (e) { setMsg(errorText(e)); }
    setBusy(false);
  };
  const review = async () => {
    setBusy(true); setMsg(null);
    try {
      const files: Upload[] = [];
      for (let i = 0; i < reviewPhotos.length; i++) files.push(await uploadOf('photos[]', reviewPhotos[i], `review${i}`));
      await Api.postMultipart(`pets/bookings/${ref}/review`, [...parts.map(([k]) => [k, String(stars[k] || 0)] as [string, string]), ['body', reviewBody]], files);
      l.reload();
    } catch (e) { setMsg(errorText(e)); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <BackBar title={`Pet booking ${ref}`} onBack={Nav.back} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {notice === 'paid' ? <Notice tone="ok" text="Payment received — your pet's stay is confirmed. We've emailed the details." />
          : notice === 'failed' ? <Notice tone="bad" text="The payment did not go through. Nothing was charged — you can try again below." />
          : notice === 'refund' ? <Notice tone="warn" text="The place was taken before your payment arrived. Your money will be refunded in full." /> : null}
        {notice ? <Gap /> : null}
        <Card>
          <Photo url={str(li, 'image')} style={{ width: '100%', aspectRatio: 2 }} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}><Pill text={text(b, 'status_label')} tone={text(b, 'status_tone')} /><Pill text={text(b, 'payment_label')} tone={text(b, 'payment_tone')} /></View>
          <Txt k="titleLarge" style={{ marginTop: 6 }} onPress={() => Nav.navigate(`petlisting/${int(li, 'id')}`)}>{text(li, 'title')}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{str(li, 'address') || text(li, 'location')}</Txt>
          <Gap h={8} />
          <KeyValue k="Drop-off" v={prettyDate(str(b, 'check_in')) + (str(b, 'checkin_time') ? ` from ${str(b, 'checkin_time')}` : '')} />
          <KeyValue k="Pick-up" v={prettyDate(str(b, 'check_out')) + (str(b, 'checkout_time') ? ` by ${str(b, 'checkout_time')}` : '')} />
          <KeyValue k="Stay" v={plural(int(b, 'nights'), unit) + ' · ' + objs(b, 'pets').map((x) => (petEmoji[text(x, 'type')] || '🐾') + ' ' + text(x, 'name')).join(', ')} />
        </Card>
        {!closed ? (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
            {steps.map(([k, label], i) => {
              if (k === 'awaiting_approval' && !objs(b, 'events').some((e) => text(e, 'status') === 'awaiting_approval')) return null;
              const done = i < idx || (i === idx && ['confirmed', 'completed', 'checked_out'].includes(status));
              const now = i === idx && !done;
              return <View key={k} style={{ flex: 1, borderRadius: 50, backgroundColor: now ? Brand.Blue : done ? Brand.TealSoft : Brand.Sky, paddingVertical: 6, paddingHorizontal: 4 }}><Txt k="bodySmall" center numberOfLines={1} color={now ? '#fff' : done ? Brand.TealDark : Brand.Muted}>{label}</Txt></View>;
            })}
          </View>
        ) : <><Gap /><Notice tone="warn" text={`This booking is ${status === 'refunded' ? 'cancelled and refunded' : 'cancelled'}${str(b, 'cancel_reason') ? ': ' + str(b, 'cancel_reason') : '.'}${(num(b, 'refund') || 0) > 0 && status !== 'refunded' ? ` A refund of ${money(num(b, 'refund'))} is on its way.` : ''}`} /></>}
        {msg ? <><Gap /><Notice text={msg} tone="bad" /></> : null}
        {(num(b, 'pay_now') || 0) > 0 && str(b, 'pay_kind') ? (
          <><Gap /><Card>
            <Txt color={Brand.InkSoft}>{({ deposit: 'Deposit to confirm', balance: 'Balance due' } as Record<string, string>)[text(b, 'pay_kind')] || 'To pay now'}</Txt>
            <Txt k="headlineSmall" color={Brand.BlueDark}>{money(num(b, 'pay_now'))}</Txt>
            {str(b, 'hold_until') && status === 'awaiting_payment' ? <Txt k="bodySmall" color={Brand.Warn}>Pay by {dateTime(str(b, 'hold_until'))} to keep the place.</Txt> : null}
            <Gap h={8} />
            <PrimaryButton text={`Pay ${money(num(b, 'pay_now'))}`} onPress={pay} loading={busy} />
          </Card></>
        ) : null}
        {rev ? (
          <><Gap /><Card>
            <SectionTitle text="Your review" /><Stars rating={num(rev, 'overall')} />
            {str(rev, 'body') ? <Txt color={Brand.InkSoft}>{str(rev, 'body')}</Txt> : null}
            {str(rev, 'host_response') ? <Txt k="bodySmall" color={Brand.TealDark} style={{ marginTop: 4 }}>Host's reply: {str(rev, 'host_response')}</Txt> : null}
          </Card></>
        ) : bool(b, 'can_review') ? (
          <><Gap /><Card>
            <SectionTitle text="How was your pet's stay?" />
            {parts.map(([k, label]) => <StarPicker key={k} label={label} value={stars[k] || 0} onChange={(n) => setStars((s) => ({ ...s, [k]: n }))} />)}
            <Field label="Tell other pet parents about it" value={reviewBody} onChange={setReviewBody} lines={3} />
            <Gap h={6} />
            <OutlineButton text={reviewPhotos.length ? `${reviewPhotos.length} photos chosen` : 'Add photos (up to 4)'} onPress={async () => setReviewPhotos(await pickPhotos(4))} style={{ alignSelf: 'flex-start' }} />
            <Gap h={6} />
            <PrimaryButton text="Publish review" onPress={review} disabled={!parts.every(([k]) => (stars[k] || 0) > 0)} loading={busy} />
          </Card></>
        ) : null}
        {!closed ? (
          <><Gap /><Card>
            <SectionTitle text="Pet Stay Diary" />
            <Txt k="bodySmall" color={Brand.InkSoft}>Photos, videos, meals, walks and notes from your host. Only you, your host and TripArro can see them.</Txt>
            {!diary.length ? <><Gap h={8} /><Notice text={['checked_in', 'in_progress'].includes(status) ? 'No updates yet — your host adds them during the stay.' : ['checked_out', 'completed'].includes(status) ? 'No diary updates for this stay.' : 'The diary starts when your pet checks in.'} /></> : null}
            {[...diary].reverse().map((d, i) => {
              const m = str(d, 'media');
              return (
                <View key={i} style={{ flexDirection: 'row', marginTop: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.TealSoft, alignItems: 'center', justifyContent: 'center' }}><Text>{text(d, 'icon', '🐾')}</Text></View>
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <Txt k="titleSmall">{text(d, 'label')}</Txt>
                    <Txt k="bodySmall" color={Brand.Muted}>{dateTime(str(d, 'at'))}</Txt>
                    {str(d, 'note') ? <Txt color={Brand.InkSoft}>{str(d, 'note')}</Txt> : null}
                    {m ? (text(d, 'media_type') === 'video'
                      ? <OutlineButton text="Play video" icon="play-circle-outline" onPress={() => Nav.navigate('video?url=' + enc(m))} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                      : <Pressable style={{ marginTop: 6 }} onPress={() => Nav.navigate('photo?url=' + enc(m) + '&title=' + enc(text(d, 'label')))}><Photo url={Api.url(m)} style={{ width: '100%', aspectRatio: 1.3 }} /></Pressable>) : null}
                  </View>
                </View>
              );
            })}
          </Card></>
        ) : null}
        <Gap />
        <Card>
          <SectionTitle text="Price" />
          <PriceTable lines={priceLines(b)} total={num(b, 'total')} extra={[['Paid', money(num(b, 'paid'))], ...((num(b, 'balance') || 0) > 0 && !closed ? [['Balance', money(num(b, 'balance'))] as [string, string]] : [])]} />
        </Card>
        <Gap />
        <Card>
          <SectionTitle text="Your host" />
          <Txt color={Brand.InkSoft}>{text(h, 'name')}</Txt>
          {str(h, 'phone') ? <OutlineButton text={str(h, 'phone')!} icon="call" onPress={() => dial(str(h, 'phone')!)} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
            : <Txt k="bodySmall" color={Brand.Muted}>Contact details appear once the booking is confirmed.</Txt>}
        </Card>
        {canc.length >= 2 ? <><Gap /><Txt k="bodySmall" color={Brand.InkSoft}>{canc[0]} cancellation. {canc[1]}</Txt></> : null}
        {(num(b, 'paid') || 0) > 0 && str(b, 'receipt_url') ? <><Gap /><OutlineButton text="Receipt / invoice" icon="receipt-long" onPress={() => Nav.navigate(`petreceipt/${ref}`)} style={{ alignSelf: 'flex-start' }} /></> : null}
        {bool(b, 'can_cancel') ? <><Gap /><LinkButton text="Cancel booking" color={Brand.Danger} onPress={async () => { try { setCancelQuote(obj(await Api.post(`pets/bookings/${ref}/cancel`, { confirm: false }), 'quote') || {}); } catch (e) { setMsg(errorText(e)); } }} /></> : null}
      </ScrollView>
      <Dialog open={!!q} onClose={() => setCancelQuote(null)} title="Cancel this booking?"
        text={q ? ((num(q, 'paid') || 0) > 0 ? `You paid ${money(num(q, 'paid'))}. Under this host's policy you get back ${money(num(q, 'refund'))} (${int(q, 'percent')}%).` : 'Nothing has been paid, so nothing is charged.') : ''}
        actions={[['Keep it', () => setCancelQuote(null), Brand.InkSoft], ['Cancel booking', async () => { setCancelQuote(null); try { await Api.post(`pets/bookings/${ref}/cancel`, { confirm: true }); AppState.bump(); } catch (e) { setMsg(errorText(e)); } }, Brand.Danger]]} />
    </View>
  );
}
