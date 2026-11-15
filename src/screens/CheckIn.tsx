/*
 * Online check-in in the app: the guest register details and ID photos, sent to the host before arrival.
 * Aadhaar photos are masked on the phone (first 8 digits and QR code blacked out) when the number can be found.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { AppState, useLoader } from '../core/state';
import { bool, int, obj, objs, str, text } from '../core/json';
import { Picked, pickPhoto, uploadOf } from '../core/files';
import { readId } from '../core/reader';
import { Brand } from '../theme';
import { Card, ColorHeader, ErrorBox, Gap, Icon, Loading, Notice, OutlineButton, PrimaryButton, Txt, prettyDate, st } from '../ui/kit';
import { CheckRow, Choice, Field } from '../ui/inputs';
import { Nav, useParams } from '../nav';

type CiGuest = { name: string; age: string; idType: string; idNumber: string; keep: number | null; hadFront: boolean; last4: string | null; front: Picked | null; back: Picked | null };
const ciGuest = (name = '', age = '', idType = 'aadhaar', keep: number | null = null, hadFront = false, last4: string | null = null): CiGuest =>
  ({ name, age, idType, idNumber: '', keep, hadFront, last4, front: null, back: null });

function IdPhoto({ label, pic, saved, error, onPick }: { label: string; pic: Picked | null; saved: boolean; error?: string; onPick: (p: Picked) => void }) {
  return (
    <View style={{ paddingVertical: 4 }}>
      <Pressable onPress={async () => { const p = await pickPhoto('album', { quality: 1 }); if (p) onPick(p); }}
        style={[st.row, { borderRadius: 12, borderWidth: 1, borderColor: error ? Brand.Danger : Brand.Line, padding: 8 }]} accessibilityRole="button" accessibilityLabel={label}>
        <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: Brand.Sky, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {pic ? <Image source={{ uri: pic.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon name={saved ? 'check-circle-outline' : 'add-a-photo'} color={saved ? Brand.Teal : Brand.Blue} />}
        </View>
        <View style={{ paddingLeft: 10, flex: 1 }}>
          <Txt k="titleSmall">{label}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{pic ? 'New photo chosen' : saved ? 'Sent earlier — tap to replace' : 'Tap to add a photo'}</Txt>
        </View>
      </Pressable>
      {error ? <Txt k="bodySmall" color={Brand.Danger}>{error}</Txt> : null}
    </View>
  );
}

export default function OnlineCheckinScreen() {
  const link = String(useParams().url || '');
  let ref = '', k = '';
  try { const u = new URL(link); ref = u.pathname.split('/').filter(Boolean).pop() || ''; k = u.searchParams.get('k') || ''; } catch { /* bad link */ }
  const l = useLoader(() => Api.getSite(`checkin/${ref}`, { k }), [ref]);
  const d = l.data;
  const [f, setF] = useState<Record<string, string>>({});
  const [guests, setGuests] = useState<CiGuest[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!d || guests.length) return;
    const sent = obj(d, 'sent'); const g = obj(d, 'guest');
    const v = (key: string, fb = '') => str(sent, key) || fb;
    const nf = {
      lead_name: v('lead_name', text(g, 'name')), phone: v('phone', text(g, 'phone')), email: v('email', text(g, 'email')), address: v('address'), city: v('city'),
      nationality: v('nationality', 'Indian'), arrival_time: v('arrival_time'), coming_from: v('coming_from'), vehicle: v('vehicle'), notes: v('notes'),
    };
    setF(nf);
    const old = objs(sent, 'guests');
    setGuests(old.length ? old.map((o, i) => ciGuest(text(o, 'name'), o.age != null ? String(int(o, 'age')) : '', str(o, 'id_type') || 'aadhaar', i, bool(o, 'has_front'), str(o, 'id_last4'))) : [ciGuest(nf.lead_name)]);
    setConsent(!!sent);
  }, [d]);
  const set = (key: string) => (val: string) => setF((x) => ({ ...x, [key]: val }));
  const upd = (i: number, p: Partial<CiGuest>) => setGuests((gs) => gs.map((g, j) => (j === i ? { ...g, ...p } : g)));
  /** Aadhaar: black out the first 8 digits and the QR code on the phone before the photo leaves it. */
  const masked = async (g: CiGuest, p: Picked): Promise<Picked> => {
    if (g.idType !== 'aadhaar') return p;
    const r = await readId(p);
    return r?.masked ? { ...p, uri: r.photo } : p;
  };
  const submit = async () => {
    setBusy(true); setErr(null); setErrs({});
    try {
      const fields: [string, string][] = Object.entries(f);
      if (consent) fields.push(['consent', '1']);
      const files: Upload[] = [];
      for (let i = 0; i < guests.length; i++) {
        const g = guests[i];
        fields.push([`guests[${i}][name]`, g.name], [`guests[${i}][age]`, g.age], [`guests[${i}][id_type]`, g.idType], [`guests[${i}][id_number]`, g.idNumber]);
        if (g.keep !== null) fields.push([`guests[${i}][keep]`, String(g.keep)]);
        if (g.front) files.push(await uploadOf(`front_${i}`, await masked(g, g.front), `idf${i}`, 2400));
        if (g.back) files.push(await uploadOf(`back_${i}`, await masked(g, g.back), `idb${i}`, 2400));
      }
      const r = await Api.postSiteMultipart(`checkin/${ref}?k=${encodeURIComponent(k)}`, fields, files);
      setDone(text(r, 'message', 'Thank you — your details are with the host.'));
    } catch (e) {
      if (e instanceof ApiError) { const n = Object.keys(e.errors || {}).length; setErr(n ? null : e.message); setErrs(e.errors || {}); } else setErr(errorText(e));
    }
    setBusy(false);
  };
  const opts = objs(d, 'id_types').map((x) => [text(x, 'value'), text(x, 'label')] as [string, string]);
  const sent = !!obj(d, 'sent');
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Online check-in" sub={d ? `${text(d, 'title')} · ${prettyDate(text(d, 'check_in'))}` : 'Save time at arrival'} onBack={Nav.back} />
      {!d && l.loading ? <Loading /> : !d ? <View style={{ padding: 16 }}><ErrorBox message={l.error || 'Could not open the check-in.'} onRetry={l.reload} /></View>
        : done ? <View style={{ padding: 16 }}><Notice text={done} tone="ok" /><Gap /><PrimaryButton text="Back to my booking" onPress={() => { AppState.bump(); Nav.back(); }} /></View>
        : text(d, 'state') !== 'open' ? <View style={{ padding: 16 }}><Notice text={({ done: 'You are checked in — enjoy your stay!', early: 'Online check-in opens once your booking is confirmed.' } as Record<string, string>)[text(d, 'state')] || 'Online check-in is closed for this booking.'} /></View>
        : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {sent ? <><Notice text="Your details were sent. You can update them until you arrive." tone="ok" /><Gap /></> : null}
            <Card>
              <Txt k="titleLarge">Main guest</Txt><Gap h={8} />
              {([['lead_name', 'Full name'], ['phone', 'Mobile number'], ['email', 'Email'], ['address', 'Home address'], ['city', 'City'], ['nationality', 'Nationality']] as const).map(([key, label]) => (
                <View key={key} style={{ marginBottom: 8 }}>
                  <Field label={label} value={f[key] || ''} onChange={set(key)} error={errs[key]} lines={key === 'address' ? 2 : 1}
                    keyboard={key === 'phone' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'} autoCapitalize={key === 'email' ? 'none' : undefined} />
                </View>
              ))}
            </Card>
            <Gap />
            <Card>
              <Txt k="titleLarge">Arrival</Txt><Gap h={8} />
              <Field label="Arrival time (e.g. 15:30)" value={f.arrival_time || ''} onChange={set('arrival_time')} error={errs.arrival_time} /><Gap h={8} />
              <Field label="Coming from (optional)" value={f.coming_from || ''} onChange={set('coming_from')} /><Gap h={8} />
              <Field label="Vehicle number (optional)" value={f.vehicle || ''} onChange={set('vehicle')} /><Gap h={8} />
              <Field label="Note for the host (optional)" value={f.notes || ''} onChange={set('notes')} lines={2} />
            </Card>
            <Gap />
            <Card>
              <Txt k="titleLarge">Guests and IDs</Txt>
              <Txt k="bodySmall" color={Brand.Muted}>Indian law asks hosts to record every adult's ID. Children under 18 need only a name and age. ID numbers are stored sealed, and Aadhaar photos are masked before they are sent.</Txt>
              {guests.map((g, i) => {
                const age = parseInt(g.age, 10);
                const child = !isNaN(age) && age < 18;
                return (
                  <View key={i} style={{ marginTop: 12 }}>
                    <View style={st.row}>
                      <Txt k="titleMedium" style={{ flex: 1 }}>{i === 0 ? 'Guest 1 (you)' : `Guest ${i + 1}`}</Txt>
                      {i > 0 ? <Pressable onPress={() => setGuests((gs) => gs.filter((_, j) => j !== i))} style={{ padding: 8 }} accessibilityLabel="Remove guest"><Icon name="delete-outline" color={Brand.Danger} /></Pressable> : null}
                    </View>
                    <Field label="Name as on the ID" value={g.name} onChange={(v) => upd(i, { name: v })} error={errs[`g${i}_name`]} /><Gap h={6} />
                    <Field label="Age" value={g.age} onChange={(v) => upd(i, { age: v.replace(/\D/g, '').slice(0, 3) })} keyboard="number-pad" error={errs[`g${i}_age`]} /><Gap h={6} />
                    {!child ? (
                      <>
                        <Choice label="ID type" value={g.idType} options={opts} onChange={(v) => upd(i, { idType: v })} /><Gap h={6} />
                        <Field label={g.last4 ? `ID number (sent earlier, ends ${g.last4})` : 'ID number'} value={g.idNumber} onChange={(v) => upd(i, { idNumber: v })} error={errs[`g${i}_id_number`]} />
                        <IdPhoto label="ID — front" pic={g.front} saved={g.hadFront} error={errs[`g${i}_front`]} onPick={(p) => upd(i, { front: p })} />
                        <IdPhoto label="ID — back (optional)" pic={g.back} saved={false} onPick={(p) => upd(i, { back: p })} />
                      </>
                    ) : null}
                  </View>
                );
              })}
              {guests.length < Math.max(1, int(d, 'max_people')) ? <><Gap h={8} /><OutlineButton text="Add a guest" icon="person-add-alt" onPress={() => setGuests((gs) => [...gs, ciGuest()])} style={{ alignSelf: 'flex-start' }} /></> : null}
            </Card>
            <Gap />
            <CheckRow text="I agree to share these details with my host for the guest register" checked={consent} onChange={setConsent} />
            {errs.consent ? <Txt k="bodySmall" color={Brand.Danger}>{errs.consent}</Txt> : null}
            {err ? <><Gap h={6} /><Notice text={err} tone="bad" /></> : null}
            {Object.keys(errs).length && !err ? <><Gap h={6} /><Notice text={errs.upload || 'Please check the highlighted fields.'} tone="bad" /></> : null}
            <Gap h={10} />
            <PrimaryButton text={sent ? 'Update my check-in' : 'Send my check-in'} onPress={submit} loading={busy} coral />
          </ScrollView>
        )}
    </View>
  );
}
