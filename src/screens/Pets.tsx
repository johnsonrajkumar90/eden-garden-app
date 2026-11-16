// My pets (care notes the host sees when you book), add / edit a pet, saved pet hosts, and profile & password.
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Api, ApiError, Upload, errorText } from '../core/api';
import { useLoader, useSession } from '../core/state';
import { J, bool, int, num, objs, str, text } from '../core/json';
import { Picked, pickPhoto, uploadOf } from '../core/files';
import { Brand } from '../theme';
import { BackBar, Card, EmptyBox, ErrorBox, Gap, LinkButton, Loading, Notice, OutlineButton, Photo, PrimaryButton, Press, Txt, Icon, st } from '../ui/kit';
import { CheckRow, Choice, Field } from '../ui/inputs';
import { Dialog } from '../ui/sheets';
import { PetHostCard, petEmoji, petSizes, petTypes } from '../ui/petcards';
import { Nav, intParam, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

const n2s = (v: number | null) => (v === null ? '' : String(v).replace(/\.0$/, ''));

export function MyPetsScreen() {
  const session = useSession();
  const l = useLoader(async () => (session?.user ? Api.get('pets/my') : null), [session?.user?.id]);
  const d = l.data;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="My pets" onBack={Nav.back} />
      {!session?.user ? <EmptyBox title="Sign in to add your pets" text="Your pets' care notes go to the host with each booking." action="Sign in" onAction={() => Nav.navigate('login')} />
        : !d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load your pets.'} onRetry={l.reload} />
        : !objs(d, 'items').length ? <EmptyBox title="No pets yet" text="Add your dog, cat or other pet — feeding, medicines, allergies and vet details." action="Add a pet" onAction={() => Nav.navigate('petform/0')} />
        : (
          <FlatList data={objs(d, 'items')} keyExtractor={(p) => String(int(p, 'id'))} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: DOCK_SPACE }}
            renderItem={({ item: p, index }) => (
              <Card index={index} onPress={() => Nav.navigate(`petform/${int(p, 'id')}`)}>
                <View style={st.row}>
                  {str(p, 'photo') ? <Photo url={str(p, 'photo')} corner={28} style={{ width: 56, height: 56 }} />
                    : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.TealSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{petEmoji[text(p, 'type')] || '🐾'}</Text></View>}
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Txt k="titleMedium">{text(p, 'name')}</Txt>
                    <Txt k="bodySmall" color={Brand.InkSoft}>{[petTypes.find(([k]) => k === text(p, 'type'))?.[1], str(p, 'breed'), num(p, 'age_years') !== null ? `${n2s(num(p, 'age_years'))} yrs` : null].filter(Boolean).join(' · ')}</Txt>
                    <Txt k="bodySmall" color={bool(p, 'vaccinated') ? Brand.TealDark : Brand.Warn}>{bool(p, 'vaccinated') ? 'Vaccinated' : 'Vaccination not marked'}</Txt>
                  </View>
                </View>
              </Card>
            )} />
        )}
      {session?.user ? (
        <Press onPress={() => Nav.navigate('petform/0')} style={[st.row, st.shadow, { position: 'absolute', right: 16, bottom: 20, borderRadius: 18, backgroundColor: Brand.Sun, paddingHorizontal: 18, paddingVertical: 14 }]}>
          <Icon name="add" color={Brand.SunInk} /><Txt k="labelLarge" color={Brand.SunInk}> Add a pet</Txt>
        </Press>
      ) : null}
    </View>
  );
}

/** Add or edit a pet (id 0 = new). */
export function PetFormScreen() {
  const id = intParam(useParams().id);
  const l = useLoader(async () => (id === 0 ? null : objs(await Api.get('pets/my'), 'items').find((x) => int(x, 'id') === id) || null), [id]);
  const p = l.data;
  const [f, setF] = useState<Record<string, any>>({ name: '', type: 'dog', breed: '', size: 'medium', age: '', weight: '', gender: '', vaccinated: false, vaccDate: '', neutered: false,
    feeding: '', allergies: '', medication: '', behaviour: '', vetName: '', vetPhone: '', emName: '', emPhone: '' });
  const set = (k: string) => (v: any) => setF((x) => ({ ...x, [k]: v }));
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!p) return;
    setF({ name: text(p, 'name'), type: text(p, 'type', 'dog'), breed: text(p, 'breed'), size: text(p, 'size', 'medium'), age: n2s(num(p, 'age_years')), weight: n2s(num(p, 'weight_kg')),
      gender: text(p, 'gender'), vaccinated: bool(p, 'vaccinated'), vaccDate: text(p, 'vaccination_date'), neutered: bool(p, 'neutered'), feeding: text(p, 'feeding'), allergies: text(p, 'allergies'),
      medication: text(p, 'medication'), behaviour: text(p, 'behaviour'), vetName: text(p, 'vet_name'), vetPhone: text(p, 'vet_phone'), emName: text(p, 'emergency_name'), emPhone: text(p, 'emergency_phone') });
  }, [p]);
  const ready = id === 0 || !!p;
  const shown = photo?.uri || str(p, 'photo');

  const save = async () => {
    setBusy(true); setErr(null); setErrs({});
    try {
      const fields: [string, string][] = [['name', f.name.trim()], ['type', f.type], ['breed', f.breed.trim()], ['size', f.size], ['age_years', f.age.trim()], ['weight_kg', f.weight.trim()],
        ['gender', f.gender], ['vaccinated', f.vaccinated ? '1' : '0'], ['vaccination_date', f.vaccinated ? f.vaccDate.trim() : ''], ['neutered', f.neutered ? '1' : '0'],
        ['feeding', f.feeding.trim()], ['allergies', f.allergies.trim()], ['medication', f.medication.trim()], ['behaviour', f.behaviour.trim()],
        ['vet_name', f.vetName.trim()], ['vet_phone', f.vetPhone.trim()], ['emergency_name', f.emName.trim()], ['emergency_phone', f.emPhone.trim()]];
      if (id !== 0) fields.push(['id', String(id)]);
      const files: Upload[] = photo ? [await uploadOf('photo', photo, 'pet')] : [];
      await Api.postMultipart('pets/my', fields, files);
      Nav.back();
    } catch (e) { setErr(errorText(e)); if (e instanceof ApiError) setErrs(e.errors); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <BackBar title={id === 0 ? 'Add a pet' : f.name || 'Edit pet'} onBack={Nav.back} />
      {!ready ? (l.loading ? <Loading /> : <ErrorBox message={l.error || 'Pet not found.'} />) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
          <View style={st.row}>
            {shown ? <Image source={{ uri: shown }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Brand.TealSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28 }}>{petEmoji[f.type] || '🐾'}</Text></View>}
            <OutlineButton text={shown ? 'Change photo' : 'Add a photo'} onPress={async () => { const x = await pickPhoto(); if (x) setPhoto(x); }} style={{ marginLeft: 12 }} />
          </View>
          <Gap />
          <Field label="Name" value={f.name} onChange={set('name')} error={errs.name} autoCapitalize="words" />
          <Gap h={6} />
          <Choice label="Type" value={f.type} options={petTypes.slice(1)} onChange={set('type')} />
          <Gap h={6} />
          <Field label="Breed (optional)" value={f.breed} onChange={set('breed')} />
          <Gap h={6} />
          <Choice label="Size" value={f.size} options={petSizes} onChange={set('size')} />
          <Gap h={6} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="Age (years)" value={f.age} onChange={set('age')} keyboard="decimal-pad" style={{ flex: 1 }} />
            <Field label="Weight (kg)" value={f.weight} onChange={set('weight')} keyboard="decimal-pad" style={{ flex: 1 }} />
          </View>
          <Gap h={6} />
          <Choice label="Gender" value={f.gender} options={[['', 'Not given'], ['male', 'Male'], ['female', 'Female']]} onChange={set('gender')} />
          <CheckRow text="Vaccinated" checked={f.vaccinated} onChange={set('vaccinated')} />
          {f.vaccinated ? <Field label="Last vaccination (YYYY-MM-DD)" value={f.vaccDate} onChange={set('vaccDate')} error={errs.vaccination_date} /> : null}
          <CheckRow text="Neutered / spayed" checked={f.neutered} onChange={set('neutered')} />
          <Gap h={6} />
          <Txt k="titleMedium">Care notes for the host</Txt>
          <Field label="Feeding (what, how much, when)" value={f.feeding} onChange={set('feeding')} lines={2} />
          <Gap h={6} />
          <Field label="Allergies" value={f.allergies} onChange={set('allergies')} />
          <Gap h={6} />
          <Field label="Medication (name, dose, time)" value={f.medication} onChange={set('medication')} lines={2} />
          <Gap h={6} />
          <Field label="Behaviour (with dogs, cats, people…)" value={f.behaviour} onChange={set('behaviour')} lines={2} />
          <Gap h={6} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="Vet's name" value={f.vetName} onChange={set('vetName')} style={{ flex: 1 }} />
            <Field label="Vet's phone" value={f.vetPhone} onChange={set('vetPhone')} keyboard="phone-pad" style={{ flex: 1 }} />
          </View>
          <Gap h={6} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="Emergency contact" value={f.emName} onChange={set('emName')} style={{ flex: 1 }} />
            <Field label="Their phone" value={f.emPhone} onChange={set('emPhone')} keyboard="phone-pad" style={{ flex: 1 }} />
          </View>
          {err ? <><Gap h={8} /><Notice text={err} tone="bad" /></> : null}
          <Gap />
          <PrimaryButton text="Save pet" onPress={save} disabled={!f.name.trim()} loading={busy} />
          {id !== 0 ? <LinkButton text="Delete this pet" color={Brand.Danger} onPress={() => setConfirmDelete(true)} /> : null}
        </ScrollView>
      )}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${f.name}?`} text="Bookings keep the details they were made with."
        actions={[['Keep', () => setConfirmDelete(false), Brand.InkSoft], ['Delete', async () => { setConfirmDelete(false); try { await Api.post(`pets/my/${id}/delete`); Nav.back(); } catch (e) { setErr(errorText(e)); } }, Brand.Danger]]} />
    </View>
  );
}

/** Saved pet hosts (the heart on a pet host's page). */
export function SavedPetsScreen() {
  const l = useLoader(() => Api.get('pets/saved'));
  const d = l.data;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Saved pet hosts" onBack={Nav.back} />
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load.'} onRetry={l.reload} />
        : !objs(d, 'items').length ? <EmptyBox title="Nothing saved yet" text="Tap the heart on a pet host's page to keep it here." action="Find pet services" onAction={() => Nav.navigate('pets')} />
        : <FlatList data={objs(d, 'items')} keyExtractor={(c) => String(int(c, 'id'))} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: DOCK_SPACE }} renderItem={({ item: c }) => <PetHostCard c={c} onPress={() => Nav.navigate(`petlisting/${int(c, 'id')}`)} />} />}
    </View>
  );
}

/** Profile (name, phone, emails) and password. */
export function ProfileScreen() {
  const l = useLoader(() => Api.get('profile'));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emails, setEmails] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState<[string, string] | null>(null);
  const [busy, setBusy] = useState(false);
  const p = l.data;
  useEffect(() => { if (p) { setName(text(p, 'name')); setPhone(text(p, 'phone')); setEmails(bool(p, 'search_emails')); } }, [p]);
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e) { setMsg([errorText(e), 'bad']); } setBusy(false); };
  return (
    <View style={{ flex: 1 }}>
      <BackBar title="Profile" onBack={Nav.back} />
      {!p && l.loading ? <Loading /> : !p ? <ErrorBox message={l.error || 'Could not load your profile.'} onRetry={l.reload} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
          {msg ? <><Notice text={msg[0]} tone={msg[1]} /><Gap /></> : null}
          <Card>
            <Txt color={Brand.InkSoft}>{text(p, 'email')}</Txt>
            <Gap h={8} />
            <Field label="Name" value={name} onChange={setName} autoCapitalize="words" />
            <Gap h={6} />
            <Field label="Mobile number" value={phone} onChange={setPhone} keyboard="phone-pad" />
            <CheckRow text="Email me about stays I searched for" checked={emails} onChange={setEmails} />
            <Gap h={6} />
            <PrimaryButton text="Save" loading={busy} onPress={() => run(async () => { await Api.post('profile', { name, phone, search_emails: emails }); await Api.refreshSession(); setMsg(['Saved.', 'ok']); })} />
          </Card>
          <Gap />
          <Card>
            <Txt k="titleMedium">Change password</Txt>
            <Gap h={6} />
            <Field label="Current password" value={current} onChange={setCurrent} password />
            <Gap h={6} />
            <Field label="New password (8+ letters and numbers)" value={newPw} onChange={setNewPw} password />
            <Gap h={6} />
            <PrimaryButton text="Change password" disabled={!current || newPw.length < 8} loading={busy} onPress={() => run(async () => { await Api.post('profile/password', { current, new: newPw }); setCurrent(''); setNewPw(''); setMsg(['Password changed.', 'ok']); })} />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
