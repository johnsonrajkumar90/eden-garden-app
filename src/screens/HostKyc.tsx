/*
 * Host KYC verification (after a host signs up): name, ID and PAN (kept encrypted on the website; Aadhaar only the
 * last 4 digits), address, and photos of the ID and the property's ownership or lease proof. Save and finish later,
 * or send it — the TripArro team checks it and the host is told.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { useLoader } from '../core/state';
import { J, bool, obj, objs, str, text } from '../core/json';
import { Picked, pickPhoto, uploadOf } from '../core/files';
import { Brand } from '../theme';
import { Card, ColorHeader, ErrorBox, Gap, Icon, Loading, Notice, OutlineButton, PrimaryButton, Txt, st } from '../ui/kit';
import { Choice, Field } from '../ui/inputs';
import { Nav } from '../nav';

const FILES: [string, string, boolean][] = [['id_front', 'ID proof (front)', true], ['id_back', 'ID proof (back)', false], ['ownership_doc', 'Property ownership / lease proof', true], ['selfie', 'Your photo', false]];
const TONE: Record<string, [string, string, string]> = {
  none: ['#FFF4E5', '#B26A00', 'badge'], draft: ['#FFF4E5', '#B26A00', 'edit-note'], submitted: ['#FFF4E5', '#B26A00', 'hourglass-top'],
  approved: ['#E6F6EC', '#0B6B3A', 'verified'], rejected: ['#FDECEC', '#C62828', 'error-outline'],
};

/** The banner on the host dashboard until the KYC is approved. */
export function KycBanner() {
  const l = useLoader(() => Api.get('host/kyc'));
  const k = obj(l.data, 'kyc');
  const s = text(k, 'status', 'approved');
  if (!k || s === 'approved' || !bool(k, 'on')) return null;
  const [bg, fg, icon] = TONE[s] || TONE.none;
  const msg = s === 'submitted' ? 'Your KYC is being checked — usually within 1–2 working days.' : s === 'rejected' ? 'Your KYC needs changes — tap to see what to fix.' : 'Complete your KYC verification — ID, PAN, address and property proof. About 5 minutes.';
  return (
    <Pressable onPress={() => Nav.navigate('hostkyc')} style={[st.row, { marginHorizontal: 16, marginTop: 4, marginBottom: 8, borderRadius: 18, backgroundColor: bg, padding: 12 }]} accessibilityRole="button">
      <Icon name={icon} color={fg} />
      <Txt k="bodyMedium" color={fg} style={{ flex: 1, paddingHorizontal: 10 }}>{msg}</Txt>
      <Icon name="chevron-right" color={fg} />
    </Pressable>
  );
}

export default function HostKycScreen() {
  const l = useLoader(() => Api.get('host/kyc'));
  const [k, setK] = useState<J | null>(null);
  const [f, setF] = useState({ full_name: '', id_type: 'aadhaar', id_number: '', pan: '', address: '', city: '', state: 'Tamil Nadu', pin: '' });
  const [files, setFiles] = useState<Record<string, Picked | null>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<[string, string] | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    const kk = obj(l.data, 'kyc');
    if (!kk) return;
    setK(kk);
    setF((x) => ({ ...x, full_name: text(kk, 'full_name'), id_type: text(kk, 'id_type', 'aadhaar'), address: text(kk, 'address'), city: text(kk, 'city'), state: text(kk, 'state') || 'Tamil Nadu', pin: text(kk, 'pin') }));
  }, [l.data]);
  const set = (key: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [key]: v }));

  if (!k && l.loading) return <View style={{ flex: 1 }}><ColorHeader title="KYC verification" onBack={Nav.back} /><Loading /></View>;
  if (!k) return <View style={{ flex: 1 }}><ColorHeader title="KYC verification" onBack={Nav.back} /><View style={{ padding: 16 }}><ErrorBox message={l.error || 'Could not load your KYC.'} onRetry={l.reload} /></View></View>;

  const status = text(k, 'status', 'none');
  const edit = bool(k, 'can_edit');
  const have = obj(k, 'files') || {};
  const [bg, fg, icon] = TONE[status] || TONE.none;
  const send = async (submit: boolean) => {
    setBusy(true); setMsg(null); setErrs({});
    try {
      const up: Upload[] = [];
      for (const [key] of FILES) { const p = files[key]; if (p) up.push(await uploadOf(key, p, 'kyc', 2000)); }
      const fields: [string, string][] = Object.entries(f).map(([a, b]) => [a, b]);
      if (submit) fields.push(['submit', '1']);
      const r = await Api.postMultipart('host/kyc', fields, up);
      setK(obj(r, 'kyc')); setFiles({}); setF((x) => ({ ...x, id_number: '', pan: '' }));
      setMsg([text(r, 'message', 'Saved.'), 'ok']);
    } catch (e) {
      setMsg([errorText(e), 'bad']);
      if (e instanceof ApiError) setErrs(e.errors);
      l.reload();   // the draft was saved even if something is still missing
    }
    setBusy(false);
  };
  const Err = ({ e }: { e?: string }) => (e ? <Txt k="bodySmall" color={Brand.Danger}>{e}</Txt> : null);

  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="KYC verification" sub="Your identity, kept private" onBack={Nav.back} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={[st.row, { borderRadius: 22, backgroundColor: bg, padding: 14 }]}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#ffffffaa', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={fg} /></View>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Txt k="titleMedium" color={fg}>{text(k, 'label')}</Txt>
            <Txt k="bodySmall" color={Brand.InkSoft}>
              {status === 'approved' ? 'Your identity is verified. Thank you!' : status === 'submitted' ? 'Our team usually checks it within 1–2 working days.'
                : status === 'rejected' ? 'Please change: ' + (text(k, 'admin_note') || 'check your details and send them again.') : 'Every host completes KYC so guests know the property is run by a verified person.'}
            </Txt>
          </View>
        </View>
        {msg ? <><Gap h={10} /><Notice text={msg[0]} tone={msg[1]} /></> : null}
        <Gap />
        <Card style={{ opacity: edit ? 1 : 0.7 }}>
          <Txt k="titleMedium">1 · Your identity</Txt><Gap h={8} />
          <Field label="Name as on the ID" value={f.full_name} onChange={set('full_name')} autoCapitalize="words" error={errs.full_name} /><Gap h={8} />
          <Choice label="ID type" value={f.id_type} options={objs(k, 'id_types').map((t) => [text(t, 'value'), text(t, 'label')] as [string, string])} onChange={set('id_type')} /><Err e={errs.id_type} /><Gap h={8} />
          <Field label="ID number" value={f.id_number} onChange={set('id_number')} placeholder={str(k, 'id_last4') ? `Saved — ends with ${str(k, 'id_last4')}` : 'e.g. 1234 5678 9012'} error={errs.id_number} />
          <Txt k="bodySmall" color={Brand.Muted}>Aadhaar: only the last 4 digits are kept. Other IDs are stored encrypted.</Txt><Gap h={8} />
          <Field label="PAN" value={f.pan} onChange={(v) => set('pan')(v.toUpperCase())} autoCapitalize="none" placeholder={str(k, 'pan_last4') ? `Saved — ends with ${str(k, 'pan_last4')}` : 'ABCDE1234F'} error={errs.pan} />
        </Card>
        <Gap />
        <Card>
          <Txt k="titleMedium">2 · Your address</Txt><Gap h={8} />
          <Field label="Address" value={f.address} onChange={set('address')} lines={2} error={errs.address} /><Gap h={8} />
          <Field label="City" value={f.city} onChange={set('city')} error={errs.city} /><Gap h={8} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="State" value={f.state} onChange={set('state')} error={errs.state} /></View>
            <View style={{ flex: 1 }}><Field label="PIN code" value={f.pin} onChange={set('pin')} keyboard="number-pad" error={errs.pin} /></View>
          </View>
        </Card>
        <Gap />
        <Card>
          <Txt k="titleMedium">3 · Documents</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>Clear photos. Private — only you and the TripArro team can see them.</Txt><Gap h={8} />
          {FILES.map(([key, label, need]) => {
            const p = files[key]; const saved = !!have[key];
            return (
              <View key={key} style={{ marginBottom: 8 }}>
                <Pressable disabled={!edit} onPress={async () => { const x = await pickPhoto('album'); if (x) setFiles((o) => ({ ...o, [key]: x })); }}
                  style={[st.row, { borderRadius: 16, borderWidth: 1.5, borderStyle: p || saved ? 'solid' : 'dashed', borderColor: errs[key] ? Brand.Danger : p || saved ? '#9BD5B1' : '#D9D2CB', backgroundColor: p || saved ? '#F3FBF6' : '#fff', padding: 10 }]}>
                  <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: p || saved ? '#DDF3E5' : '#FDECEC', alignItems: 'center', justifyContent: 'center' }}>
                    {p ? <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon name={saved ? 'check' : 'add-a-photo'} color={saved ? '#0B6B3A' : Brand.Blue} />}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Txt k="titleSmall">{label}{need ? '' : ' (optional)'}</Txt>
                    <Txt k="bodySmall" color={Brand.Muted}>{p ? 'Ready to send · tap to change' : saved ? 'Uploaded · tap to replace' : 'Tap to choose a photo'}</Txt>
                  </View>
                </Pressable>
                <Err e={errs[key]} />
              </View>
            );
          })}
        </Card>
        {edit ? (
          <>
            <Gap />
            <PrimaryButton text="Send for verification" icon="verified-user" loading={busy} onPress={() => send(true)} />
            <Gap h={10} />
            <OutlineButton text="Save and finish later" disabled={busy} onPress={() => send(false)} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
