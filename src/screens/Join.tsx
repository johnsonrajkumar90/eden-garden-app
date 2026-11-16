// Host sign up (List your property) and Become a pet host (account with ID, pets and services, photos).
import React, { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { useLoader, useSession } from '../core/state';
import { J, arr, int, objs, strings, text } from '../core/json';
import { Picked, pickPhoto, uploadOf } from '../core/files';
import * as Loc from '../core/location';
import { Brand, Fonts } from '../theme';
import { Card, ColorHeader, Gap, Icon, LinkButton, Notice, Photo, PrimaryButton, Txt, st } from '../ui/kit';
import { CheckRow, Choice, Field, Stepper } from '../ui/inputs';
import { Dialog } from '../ui/sheets';
import { Nav } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

function SectionHead({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <View style={[st.row, { marginBottom: 10 }]}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.Blue, alignItems: 'center', justifyContent: 'center' }}><Txt k="labelLarge" color="#fff">{n}</Txt></View>
      <View style={{ paddingLeft: 10, flex: 1 }}><Txt k="titleLarge">{title}</Txt>{sub ? <Txt k="bodySmall" color={Brand.Muted}>{sub}</Txt> : null}</View>
    </View>
  );
}
function Done({ title, text: t, button, onPress }: { title: string; text: string; button: string; onPress: () => void }) {
  return (
    <Card>
      <View style={{ alignItems: 'center' }}>
        <Icon name="check-circle-outline" size={48} color={Brand.Teal} />
        <Gap h={8} />
        <Txt k="titleLarge">{title}</Txt>
        <Txt color={Brand.InkSoft} center style={{ marginTop: 6 }}>{t}</Txt>
        <Gap />
        <PrimaryButton text={button} onPress={onPress} style={{ alignSelf: 'stretch' }} />
      </View>
    </Card>
  );
}
const Err = ({ e }: { e?: string }) => (e ? <Txt k="bodySmall" color={Brand.Danger}>{e}</Txt> : null);

/**
 * Host sign up ("List your property"): hosts make their own host account here — separate from the guest sign-up.
 * Then: confirm the email if the website asks for it, and complete the KYC verification.
 */
export function BecomeHostScreen() {
  const meta = useLoader(() => Api.getSite('become-a-host'));
  const session = useSession();
  const [f, setF] = useState({ name: '', phone: '', email: '', city: '', type: '', password: '' });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [offerSeen, setOfferSeen] = useState(false);
  const m = meta.data;
  const zeroDays = int(m, 'zero_days');
  const role = session?.user?.role || '';
  const send = async () => {
    setBusy(true); setErr(null); setErrs({});
    try {
      const r = await Api.postSite('host-signup', { name: f.name, phone: f.phone, email: f.email, city: f.city, property_type: f.type, password: f.password, terms: terms ? 1 : 0 });
      if (text(r, 'verify') === 'link') setSent(text(r, 'message', 'Your host account is created. Open the link we emailed you, then sign in and complete your KYC.'));
      else { await Api.refreshSession(); Nav.replace('hostkyc'); }
    } catch (e) { setErr(errorText(e)); if (e instanceof ApiError) setErrs(e.errors); }
    setBusy(false);
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: DOCK_SPACE }}>
        <ColorHeader title="Host sign up" sub="List your homestay, villa or resort on TripArro — free to join." onBack={Nav.back} />
        <View style={{ padding: 16 }}>
          {sent ? <Done title="Check your email" text={sent} button="Sign in" onPress={() => Nav.replace('login')} />
            : ['host', 'resort'].includes(role) ? <Done title="You're a host already" text="Open My hosting to manage your stays, or finish your KYC." button="Open KYC verification" onPress={() => Nav.replace('hostkyc')} /> : (
            <>
              {session?.user ? <><Notice text={`You're signed in as ${session.user.email} (a guest account). A host account needs its own email — sign out first, or use a different email.`} tone="warn" /><Gap /></> : null}
              {m ? (
                <><Card>
                  <Txt k="titleLarge">Why host with TripArro</Txt>
                  <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 2, marginBottom: 6 }}>{text(m, 'commission')}% commission only when you get a booking · online payments · one calendar for Airbnb, Booking.com and more.</Txt>
                  {arr<any>(m, 'advantages').slice(0, 4).map((row, i) => Array.isArray(row) ? (
                    <View key={i} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                      <Icon name="check-circle-outline" size={20} color={Brand.Teal} />
                      <View style={{ paddingLeft: 10, flex: 1 }}><Txt k="titleSmall">{String(row[1] ?? '')}</Txt><Txt k="bodySmall" color={Brand.InkSoft}>{String(row[2] ?? '')}</Txt></View>
                    </View>
                  ) : null)}
                </Card><Gap /></>
              ) : null}
              <Card>
                <SectionHead n={1} title="Your host account" sub="You'll sign in with this email and password." />
                <Field label="Full name" value={f.name} onChange={set('name')} error={errs.name} autoCapitalize="words" /><Gap h={8} />
                <Field label="Mobile number" value={f.phone} onChange={set('phone')} keyboard="phone-pad" error={errs.phone} /><Gap h={8} />
                <Field label="Email" value={f.email} onChange={set('email')} keyboard="email-address" autoCapitalize="none" error={errs.email} /><Gap h={8} />
                <Field label="Password" value={f.password} onChange={set('password')} password placeholder="8+ characters, letters and numbers" error={errs.password} />
              </Card>
              <Gap />
              <Card>
                <SectionHead n={2} title="Your property" />
                <Field label="Where is it? (town or city)" value={f.city} onChange={set('city')} error={errs.city} /><Gap h={8} />
                <Choice label="Type of property (optional)" value={f.type} options={[['', 'Choose…'], ...strings(m, 'types').map((t) => [t, t] as [string, string])]} onChange={set('type')} />
              </Card>
              <Gap />
              <Card>
                <CheckRow text="I accept the host terms, including the payment terms" checked={terms} onChange={setTerms} />
                <Err e={errs.terms} />
                <LinkButton text="Read the host terms" onPress={() => Nav.navigate('page/host-terms')} />
                {err ? <><Gap h={6} /><Notice text={err} tone="bad" /></> : null}
                <Gap h={8} />
                <PrimaryButton text="Create host account" onPress={send} loading={busy} disabled={!f.name.trim() || !f.email.includes('@') || f.password.length < 8} />
                <Txt k="bodySmall" color={Brand.Muted} center style={{ marginTop: 8 }}>Next: a short KYC verification, then add your property.</Txt>
              </Card>
              <Gap />
              <View style={[st.row, { justifyContent: 'center' }]}>
                <Txt color={Brand.InkSoft}>Booking a stay instead? </Txt>
                <Txt k="titleSmall" color={Brand.Blue} onPress={() => Nav.replace('signup')}>Guest sign up</Txt>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      {m && zeroDays > 0 && !offerSeen && !sent ? <ZeroCommissionOffer days={zeroDays} commission={text(m, 'commission')} onClose={() => setOfferSeen(true)} /> : null}
    </View>
  );
}

function PhotoPick({ label, photo, error, onPick }: { label: string; photo: Picked | null; error?: string; onPick: (p: Picked) => void }) {
  return (
    <View style={{ paddingVertical: 4 }}>
      <Pressable onPress={async () => { const p = await pickPhoto('album'); if (p) onPick(p); }} style={[st.row, { borderRadius: 14, borderWidth: 1, borderColor: error ? Brand.Danger : Brand.Line, backgroundColor: Brand.Page, padding: 10 }]}>
        <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon name="add-a-photo" color={Brand.Blue} />}
        </View>
        <View style={{ flex: 1, paddingLeft: 12 }}><Txt k="titleSmall">{label}</Txt><Txt k="bodySmall" color={Brand.Muted}>{photo ? 'Tap to change' : 'Tap to choose a photo'}</Txt></View>
      </Pressable>
      <Err e={error} />
    </View>
  );
}

/** Become a pet host: register a pet host account. Payouts are added later on the website. The team checks it before listings go live. */
export function BecomePetHostScreen() {
  const meta = useLoader(() => Api.getSite('become-a-pet-host'));
  const [f, setF] = useState<Record<string, string>>({ state: 'Tamil Nadu', id_type: 'aadhaar' });
  const [idFront, setIdFront] = useState<Picked | null>(null);
  const [idBack, setIdBack] = useState<Picked | null>(null);
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [wa, setWa] = useState(true);
  const [terms, setTerms] = useState(false);
  const [petTypes, setPetTypes] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const m = meta.data;
  const fld = (key: string, label: string, opts: { kb?: any; pw?: boolean; lines?: number } = {}) => (
    <View key={key}><Field label={label} value={f[key] || ''} onChange={(v) => setF((x) => ({ ...x, [key]: v }))} keyboard={opts.kb} password={opts.pw} lines={opts.lines} error={errs[key]} autoCapitalize={opts.kb === 'email-address' || opts.pw ? 'none' : undefined} /><Gap h={8} /></View>
  );
  const toggle = (list: string[], set: (x: string[]) => void, k: string, on: boolean) => set(on ? [...list, k] : list.filter((y) => y !== k));
  const submit = async () => {
    setBusy(true); setErr(null); setErrs({});
    try {
      const files: Upload[] = [];
      if (idFront) files.push(await uploadOf('id_front', idFront, 'idf', 2000));
      if (idBack) files.push(await uploadOf('id_back', idBack, 'idb', 2000));
      if (photo) files.push(await uploadOf('photo', photo, 'me'));
      const fields: [string, string][] = [...Object.entries(f), ['terms', terms ? '1' : ''], ...(wa ? [['whatsapp_optin', '1'] as [string, string]] : []), ['offer', '1'],
        ...petTypes.map((t) => ['pet_types[]', t] as [string, string]), ...services.map((t) => ['services[]', t] as [string, string])];
      const r = await Api.postSiteMultipart('become-a-pet-host', fields, files);
      const si = !text(r, 'verify'); setSignedIn(si);
      if (si) Api.refreshSession().catch(() => {});
      setSent(text(r, 'message', 'Your pet host account is created.'));
    } catch (e) { if (e instanceof ApiError) { setErr(Object.keys(e.errors).length ? null : e.message); setErrs(e.errors); } else setErr(errorText(e)); }
    setBusy(false);
  };
  const pt = objs(m, 'pet_types').length ? objs(m, 'pet_types').map((x) => [text(x, 'value'), text(x, 'label')]) : [['dog', 'Dogs'], ['cat', 'Cats']];
  const sv = objs(m, 'services').length ? objs(m, 'services').map((x) => [text(x, 'value'), text(x, 'label')]) : [['boarding', 'Overnight boarding'], ['daycare', 'Daycare']];
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: DOCK_SPACE }}>
      <ColorHeader title="Become a pet host" sub="Board dogs, cats and other pets from home — verified pet parents, paid securely." onBack={Nav.back} />
      <View style={{ padding: 16 }}>
        {sent ? <Done title="Registration sent" text={sent} button={signedIn ? 'Open My hosting' : 'Sign in'} onPress={() => Nav.replace(signedIn ? 'hosting' : 'login')} /> : (
          <>
            {objs(m, 'pictures').length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 14 }}>
                {objs(m, 'pictures').map((p, i) => <View key={i} style={{ width: 200 }}><Photo url={text(p, 'image')} corner={18} style={{ width: 200, height: 150 }} label={text(p, 'caption')} /><Txt k="labelLarge" style={{ marginTop: 6 }}>{text(p, 'caption')}</Txt></View>)}
              </ScrollView>
            ) : null}
            <Card>
              <SectionHead n={1} title="About you" />
              {fld('name', 'Full name')}{fld('business_name', 'Business name (optional)')}{fld('email', 'Email', { kb: 'email-address' })}{fld('phone', 'Mobile number', { kb: 'phone-pad' })}
              {fld('password', 'Password (8+ letters and numbers)', { pw: true })}{fld('password_confirmation', 'Password again', { pw: true })}
            </Card>
            <Gap />
            <Card>
              <SectionHead n={2} title="Where pets will stay" sub="Pet parents see only the area until they book." />
              {fld('address', 'Address', { lines: 2 })}{fld('city', 'City')}{fld('state', 'State')}{fld('pin', 'PIN code', { kb: 'number-pad' })}
              <Pressable onPress={async () => {
                setLocating(true);
                const r = await Loc.current();
                if (r.kind === 'found') setF((x) => ({ ...x, latitude: String(r.lat), longitude: String(r.lng) })); else setErr("Allow location in the phone's settings to add the map pin (optional).");
                setLocating(false);
              }} style={[st.row, { paddingVertical: 8 }]}>
                <Icon name="my-location" size={18} color={Brand.Blue} /><Txt k="labelLarge" color={Brand.Blue}>  {locating ? 'Finding…' : !f.latitude ? 'Add my location on the map (optional)' : 'Location added ✓'}</Txt>
              </Pressable>
            </Card>
            <Gap />
            <Card>
              <SectionHead n={3} title="Your ID" sub="Checked by our team; Aadhaar is kept as the last 4 digits only." />
              <Choice label="ID type" value={f.id_type || 'aadhaar'} options={objs(m, 'id_types').length ? objs(m, 'id_types').map((x) => [text(x, 'value'), text(x, 'label')]) : [['aadhaar', 'Aadhaar card']]} onChange={(v) => setF((x) => ({ ...x, id_type: v }))} />
              <Gap h={8} />
              {fld('id_number', 'ID number')}
              <PhotoPick label="ID — front" photo={idFront} error={errs.id_front} onPick={setIdFront} />
              <PhotoPick label="ID — back (optional)" photo={idBack} error={errs.id_back} onPick={setIdBack} />
              <PhotoPick label="Your profile photo" photo={photo} error={errs.photo} onPick={setPhoto} />
              <Gap h={8} />
              {fld('business_reg', 'Business registration number (optional)')}
            </Card>
            <Gap />
            <Card>
              <SectionHead n={4} title="Pets and services" sub="Tick everything you can take care of — you can fine-tune each listing later." />
              <Txt bold>Type of pets</Txt>
              {pt.map(([k, l]) => <CheckRow key={k} text={l} checked={petTypes.includes(k)} onChange={(on) => toggle(petTypes, setPetTypes, k, on)} />)}
              <Err e={errs.pet_types} />
              <Gap h={8} />
              <Txt bold>Services you offer</Txt>
              {sv.map(([k, l]) => <CheckRow key={k} text={l} checked={services.includes(k)} onChange={(on) => toggle(services, setServices, k, on)} />)}
              <Err e={errs.services} />
              <Gap h={4} />
              <Txt k="bodySmall" color={Brand.Muted}>Your account opens straight away. Add where to send your earnings any time in your pet host dashboard → Payouts.</Txt>
            </Card>
            <Gap />
            <Card>
              <SectionHead n={5} title="Emergency contact (optional)" />
              {fld('emergency_name', 'Name')}{fld('emergency_phone', 'Phone', { kb: 'phone-pad' })}
              <CheckRow text="Send me booking updates on WhatsApp" checked={wa} onChange={setWa} />
              <CheckRow text="I accept the host terms and will care for every pet as described in its profile" checked={terms} onChange={setTerms} />
              <Err e={errs.terms} />
              <LinkButton text="Read the host terms" onPress={() => Nav.navigate('page/host-terms')} />
              {err ? <><Gap h={6} /><Notice text={err} tone="bad" /></> : null}
              {Object.keys(errs).length && !err ? <><Gap h={6} /><Notice text="Please check the highlighted fields." tone="bad" /></> : null}
              <Gap h={8} />
              <PrimaryButton text="Create my pet host account" onPress={submit} loading={busy} />
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** The welcome offer for new hosts: 0% commission for the first days (shown once when the page opens). */
function ZeroCommissionOffer({ days, commission, onClose }: { days: number; commission: string; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose}>
      <LinearGradient colors={['#A3101C', '#E5353F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ margin: -20, marginBottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 }}>
        <Txt k="labelLarge" color="#FFFFFFD9">WELCOME OFFER</Txt>
        <Text style={{ color: '#fff', fontSize: 64, lineHeight: 70, fontFamily: Fonts.b }}>0%</Text>
        <Txt k="titleMedium" color="#fff">commission for your first {days} days</Txt>
        <Text style={{ position: 'absolute', right: 18, bottom: 14, fontSize: 54 }}>🏡</Text>
      </LinearGradient>
      <View style={{ paddingTop: 20 }}>
        <Txt k="titleLarge">Keep the full stay amount</Txt>
        <Txt color={Brand.InkSoft} style={{ marginTop: 6, marginBottom: 16 }}>Join as a new host and pay no commission on bookings in your first {days} days. After that it's {commission}%, only on completed stays. No joining fee, no monthly fee.</Txt>
        <PrimaryButton text="Apply to host" onPress={onClose} />
        <LinkButton text="Maybe later" color={Brand.InkSoft} onPress={onClose} />
      </View>
    </Dialog>
  );
}
