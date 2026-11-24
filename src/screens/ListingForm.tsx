/*
 * Add / edit a stay, a service or a pet boarding listing — step by step (basics, photos, rooms, prices, rules…).
 * The form comes from the website (GET hostapp/forms/{kind}), so the app asks exactly what the website asks and the
 * website's rules check the answers. Photos are picked from the phone (album or camera) and uploaded one by one.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Location from 'expo-location';
import { Api, ApiError, errorText } from '../core/api';
import { AppState } from '../core/state';
import { J, bool, int, obj, objs, str, text } from '../core/json';
import { pickPhoto, pickPhotos, uploadOf } from '../core/files';
import { Brand } from '../theme';
import { BackBar, ErrorBox, Gap, Icon, Loading, Notice, OutlineButton, Photo, PrimaryButton, Txt, plural, st } from '../ui/kit';
import { CheckRow, Choice, Field, Stepper } from '../ui/inputs';
import { Nav, useParams } from '../nav';

type V = Record<string, string>;
type Pic = { path: string; url: string; busy?: boolean; failed?: string };

const TIMES: [string, string][] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2), m = i % 2 ? 30 : 0;
  return [`${String(h).padStart(2, '0')}:${m ? '30' : '00'}`, `${((h + 11) % 12) + 1}:${m ? '30' : '00'} ${h < 12 ? 'am' : 'pm'}`];
});
const abs = (p: string) => (/^https?:/i.test(p) ? p : Api.url(p.replace(/^\//, '')));

/** Does a field show (the website's "only when…" rules)? */
function shows(f: J, v: V): boolean {
  const c = obj(f, 'show_if');
  if (!c) return true;
  return Object.entries(c).every(([k, ok]) => (ok as string[]).includes(v[k] ?? ''));
}

export default function ListingFormScreen() {
  const prm = useParams();
  const kind = prm.kind === 'pet' ? 'pet' : prm.kind === 'service' ? 'service' : 'stay';
  const [id, setId] = useState(int(prm, 'id'));
  const [form, setForm] = useState<J | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [v, setV] = useState<V>({});
  const [pics, setPics] = useState<Pic[]>([]);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<[string, string] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async (theId = id) => {
    setLoadErr(null);
    try {
      const f = await Api.get(`hostapp/forms/${kind}`, { id: theId || null });
      setForm(f); setV({ ...(f.values || {}) }); setPics(objs(f, 'photos').map((p) => ({ path: text(p, 'path'), url: text(p, 'url') })));
    } catch (e) { setLoadErr(errorText(e)); }
  };
  useEffect(() => { load(); }, []);

  // the steps: the form's sections, with the photos second
  const steps = useMemo(() => {
    if (!form) return [] as { title: string; note: string; fields: J[]; photos?: boolean }[];
    const s = objs(form, 'sections').map((x) => ({ title: text(x, 'title'), note: text(x, 'note'), fields: objs(x, 'fields') }));
    s.splice(1, 0, { title: 'Photos', note: '', fields: [], photos: true } as any);
    return s as { title: string; note: string; fields: J[]; photos?: boolean }[];
  }, [form]);

  if (!form) return <View style={{ flex: 1 }}><BackBar title={kind === 'pet' ? 'Pet boarding' : kind === 'service' ? 'Service' : 'Stay'} onBack={Nav.back} />{loadErr ? <ErrorBox message={loadErr} onRetry={() => load()} /> : <Loading />}</View>;

  const set = (k: string, val: string) => { setV((o) => ({ ...o, [k]: val })); if (errors[k]) setErrors((e) => { const c = { ...e }; delete c[k]; return c; }); };
  const cur = steps[step];
  const minPhotos = int(form, 'min_photos', 1);

  /** Required fields of a step that are still empty. */
  const missingIn = (i: number): Record<string, string> => {
    const out: Record<string, string> = {};
    const s = steps[i];
    if (s.photos) { if (pics.filter((p) => p.path).length < 1) out.photos = 'Add at least one photo.'; return out; }
    s.fields.forEach((f) => {
      if (!bool(f, 'required') || !shows(f, v)) return;
      const n = text(f, 'name');
      if (text(f, 'type') === 'location') { if (!(v.city || '').trim()) out.location = 'Enter the city or town.'; return; }
      if (!(v[n] || '').trim()) out[n] = `${text(f, 'label')} is needed.`;
    });
    return out;
  };
  const next = () => {
    const m = missingIn(step);
    if (Object.keys(m).length) { setErrors((e) => ({ ...e, ...m })); setMsg(['Please fill in the highlighted fields.', 'bad']); return; }
    setMsg(null); setStep(step + 1);
  };

  const save = async () => {
    for (let i = 0; i < steps.length; i++) { const m = missingIn(i); if (Object.keys(m).length) { setErrors(m); setStep(i); setMsg(['Please fill in the highlighted fields.', 'bad']); return; } }
    if (pics.some((p) => p.busy)) { setMsg(['Wait for the photos to finish uploading.', 'info']); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await Api.post(`hostapp/forms/${kind}` + (id ? `?id=${id}` : ''), { values: v, photos: pics.filter((p) => p.path).map((p) => p.path) });
      AppState.bump();
      const newId = int(r, 'id');
      setMsg([text(r, 'message', 'Saved.'), 'ok']);
      if (kind === 'pet') { setId(newId); await load(newId); setStep(0); }
      else setTimeout(() => Nav.back(), 900);
    } catch (e) {
      const errs = e instanceof ApiError ? e.errors : {};
      setErrors(errs);
      // go to the first step with a problem
      const at = steps.findIndex((s) => (s.photos && errs.photos) || s.fields.some((f) => errs[text(f, 'name')] || (text(f, 'type') === 'location' && errs.location)));
      if (at >= 0) setStep(at);
      setMsg([errorText(e), 'bad']);
    }
    setSaving(false);
  };

  const submitPet = async () => {
    setSaving(true);
    try { const r = await Api.post(`hostapp/forms/pet/${id}/submit`); setMsg([text(r, 'message', 'Sent.'), 'ok']); AppState.bump(); await load(id); } catch (e) { setMsg([errorText(e), 'bad']); }
    setSaving(false);
  };

  /* ---------- photos ---------- */
  const upload = async (list: Awaited<ReturnType<typeof pickPhotos>>) => {
    const max = int(form, 'max_photos', 30);
    const room = Math.max(0, max - pics.length);
    const take = list.slice(0, room);
    if (list.length > room) setMsg([`Up to ${max} photos — the first ${room} were added.`, 'info']);
    const keys = take.map((p, i) => 'up-' + Date.now() + '-' + i);
    setPics((o) => [...o, ...take.map((p, i) => ({ path: '', url: p.uri, busy: true, key: keys[i] } as any))]);
    for (let i = 0; i < take.length; i++) {
      try {
        const r = await Api.postMultipart(`hostapp/forms/${kind}/photo`, [['id', String(id || 0)]], [await uploadOf('photo', take[i], 'listing', 1800)]);
        const path = str(r, 'path') || str(r, 'url') || '';
        if (!path) throw new Error(text(r, 'error', 'Upload failed'));
        setPics((o) => o.map((p: any) => (p.key === keys[i] ? { path, url: str(r, 'url') && /^https?:/.test(str(r, 'url')!) ? str(r, 'url')! : abs(path) } : p)));
      } catch (e) {
        setPics((o) => o.map((p: any) => (p.key === keys[i] ? { ...p, busy: false, failed: errorText(e) } : p)));
      }
    }
  };
  const addFromAlbum = async () => { const l = await pickPhotos(20); if (l.length) upload(l); };
  const addFromCamera = async () => { const p = await pickPhoto('camera'); if (p) upload([p]); };

  /* ---------- fields ---------- */
  const fieldView = (f: J) => {
    const n = text(f, 'name'), t = text(f, 'type'), label = text(f, 'label') + (bool(f, 'required') ? ' *' : '');
    const err = errors[n] || (t === 'location' ? errors.location : undefined);
    const help = t === 'location' ? null : str(f, 'help');
    const foot = <>{help ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 3 }}>{help}</Txt> : null}{err ? <Txt k="bodySmall" color={Brand.Danger} style={{ marginTop: 3 }}>{err}</Txt> : null}</>;
    let input: React.ReactNode;
    if (t === 'select') {
      const opts = objs(f, 'options').map((o) => [text(o, 'value'), text(o, 'label')] as [string, string]);
      input = <Choice label={label} value={v[n] ?? ''} options={opts} onChange={(x) => set(n, x)} />;
    } else if (t === 'checkbox') {
      input = <CheckRow text={text(f, 'label')} checked={!!v[n] && v[n] !== '0'} onChange={(c) => set(n, c ? '1' : '')} />;
    } else if (t === 'time') {
      input = <Choice label={label} value={(v[n] || '').slice(0, 5)} options={[['', 'Not set'], ...TIMES]} onChange={(x) => set(n, x)} />;
    } else if (t === 'multi') {
      const on = (v[n] || '').split(',').filter(Boolean);
      input = (
        <View>
          <Txt k="labelMedium" color={Brand.InkSoft}>{label}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {objs(f, 'options').map((o) => { const val = text(o, 'value'); const sel = on.includes(val); return (
              <Pressable key={val} onPress={() => set(n, (sel ? on.filter((x) => x !== val) : [...on, val]).join(','))} style={{ borderRadius: 50, borderWidth: 1.2, borderColor: sel ? Brand.Blue : Brand.Line, backgroundColor: sel ? Brand.Blue : '#fff', paddingHorizontal: 12, paddingVertical: 7 }}>
                <Txt k="labelMedium" color={sel ? '#fff' : Brand.InkSoft}>{text(o, 'label')}</Txt>
              </Pressable>
            ); })}
          </View>
        </View>
      );
    } else if (t === 'location') {
      input = <LocationInput v={v} set={set} />;
    } else if (t === 'pin') {
      input = <PinInput v={v} set={set} label={text(f, 'label')} />;
    } else if (t === 'beds') {
      input = <BedsInput v={v} set={set} types={objs(f, 'bed_types')} />;
    } else if (t === 'extras') {
      input = <ExtrasInput value={v[n] || '[]'} onChange={(x) => set(n, x)} label={text(f, 'label')} />;
    } else {
      const numeric = t === 'number' || t === 'decimal';
      input = <Field label={label} value={v[n] ?? ''} onChange={(x) => set(n, numeric ? x.replace(t === 'number' ? /[^0-9]/g : /[^0-9.]/g, '') : x)} keyboard={numeric ? 'numeric' as any : undefined} lines={t === 'textarea' ? 4 : 1} />;
      if (n === 'amenities' && arrOf(f, 'suggest').length) {
        const have = (v[n] || '').split(',').map((x) => x.trim()).filter(Boolean);
        input = <>{input}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {arrOf(f, 'suggest').map((a) => { const sel = have.some((h) => h.toLowerCase() === a.toLowerCase()); return (
            <Pressable key={a} onPress={() => set(n, (sel ? have.filter((h) => h.toLowerCase() !== a.toLowerCase()) : [...have, a]).join(', '))} style={{ borderRadius: 50, borderWidth: 1, borderColor: sel ? Brand.Blue : Brand.Line, backgroundColor: sel ? '#FDECEC' : '#fff', paddingHorizontal: 10, paddingVertical: 5 }}>
              <Txt k="labelSmall" color={sel ? Brand.BlueDark : Brand.InkSoft}>{sel ? '✓ ' : '+ '}{a}</Txt>
            </Pressable>
          ); })}
        </View></>;
      }
    }
    return <View key={n} style={{ marginBottom: 12 }}>{input}{foot}</View>;
  };

  const last = step === steps.length - 1;
  return (
    <View style={{ flex: 1 }}>
      <BackBar title={text(form, 'title')} onBack={() => (step ? setStep(step - 1) : Nav.back())} />
      {/* the steps */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, minHeight: 50 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: 'center' }}>
        {steps.map((s, i) => (
          <Pressable key={i} onPress={() => setStep(i)} style={{ borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: i === step ? Brand.Blue : i < step ? '#FDECEC' : '#fff', borderWidth: 1, borderColor: i === step ? Brand.Blue : Brand.Line }}>
            <Txt k="labelMedium" color={i === step ? '#fff' : Brand.InkSoft}>{i + 1}. {s.title}</Txt>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {kind === 'pet' && id ? (
          <View style={{ marginBottom: 12 }}>
            <Notice text={`Status: ${text(form, 'status_label')}${objs(form, 'missing').length || (form as any).missing?.length ? ' · Still needed: ' + ((form as any).missing as string[]).join(', ') : ''}`} tone={text(form, 'status') === 'approved' ? 'ok' : 'info'} />
            {bool(form, 'can_submit') ? <><Gap h={8} /><OutlineButton text="Send for review" icon="send" onPress={submitPet} disabled={saving} /></> : null}
          </View>
        ) : null}
        {msg ? <><Notice text={msg[0]} tone={msg[1]} /><Gap h={10} /></> : null}
        <Txt k="titleLarge">{cur.title}</Txt>
        {cur.note ? <Txt k="bodySmall" color={Brand.Muted} style={{ marginTop: 2 }}>{cur.note}</Txt> : null}
        <Gap h={10} />
        {cur.photos ? (
          <View>
            <Txt color={Brand.InkSoft}>The first photo is the cover. {minPhotos > 1 ? `Add at least ${minPhotos}. ` : ''}Bright daytime photos of every room work best.</Txt>
            <Gap h={10} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pics.map((p, i) => (
                <View key={(p as any).key || p.path || i} style={{ width: '31.5%', aspectRatio: 1 }}>
                  <Photo url={p.url} style={{ width: '100%', height: '100%' }} corner={14} />
                  {p.busy ? <View style={{ position: 'absolute', inset: 0, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' } as any}><Txt k="labelSmall" color="#fff">Uploading…</Txt></View> : null}
                  {p.failed ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: 'rgba(163,20,29,0.85)', padding: 4 }}><Txt k="labelSmall" color="#fff" numberOfLines={2}>{p.failed}</Txt></View> : null}
                  {i === 0 && !p.busy ? <View style={{ position: 'absolute', left: 6, top: 6, borderRadius: 8, backgroundColor: Brand.Sun, paddingHorizontal: 6, paddingVertical: 2 }}><Txt k="labelSmall" bold color="#4A3400">Cover</Txt></View> : null}
                  <Pressable onPress={() => setPics((o) => o.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="Remove photo" style={{ position: 'absolute', right: 4, top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={16} color="#fff" /></Pressable>
                  {i > 0 && !p.busy && p.path ? <Pressable onPress={() => setPics((o) => [o[i], ...o.filter((_, j) => j !== i)])} accessibilityLabel="Make cover photo" style={{ position: 'absolute', left: 4, bottom: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2 }}><Txt k="labelSmall" color={Brand.Ink}>Make cover</Txt></Pressable> : null}
                </View>
              ))}
            </View>
            <Gap h={12} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <OutlineButton text="From gallery" icon="photo-library" onPress={addFromAlbum} style={{ flex: 1 }} />
              <OutlineButton text="Camera" icon="photo-camera" onPress={addFromCamera} style={{ flex: 1 }} />
            </View>
            {errors.photos ? <Txt k="bodySmall" color={Brand.Danger} style={{ marginTop: 6 }}>{errors.photos}</Txt> : null}
          </View>
        ) : cur.fields.filter((f) => shows(f, v)).map(fieldView)}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Brand.Line, padding: 12, paddingBottom: 18, flexDirection: 'row', gap: 10 }}>
        {step > 0 ? <View style={{ flex: 1 }}><OutlineButton text="Back" onPress={() => setStep(step - 1)} /></View> : null}
        <View style={{ flex: 2 }}>{last ? <PrimaryButton text={id ? 'Save changes' : kind === 'pet' ? 'Save listing' : 'Add listing'} onPress={save} loading={saving} />
          : <PrimaryButton text="Next" onPress={next} />}</View>
        {!last && id ? <View style={{ flex: 1 }}><OutlineButton text="Save" onPress={save} disabled={saving} /></View> : null}
      </View>
    </View>
  );
}

const arrOf = (o: J, k: string): string[] => (Array.isArray((o as any)?.[k]) ? (o as any)[k] : []);

/** Country / state / city / place, and the map position from the phone's GPS. */
function LocationInput({ v, set }: { v: V; set: (k: string, x: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const here = async () => {
    setBusy(true); setNote('');
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) { setNote('Allow location to pin the place on the map.'); setBusy(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      set('latitude', pos.coords.latitude.toFixed(7)); set('longitude', pos.coords.longitude.toFixed(7));
      try {
        const a = (await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }))[0];
        if (a) {
          if (!v.state && a.region) set('state', a.region);
          if (!v.city && (a.city || a.subregion)) set('city', (a.city || a.subregion)!);
          if (!v.area && (a.district || a.name)) set('area', (a.district || a.name)!);
          if (!v.country && a.country) set('country', a.country);
        }
      } catch {}
      setNote('Pinned on the map here.');
    } catch { setNote('Could not read your location — try again outdoors.'); }
    setBusy(false);
  };
  return (
    <View>
      <Txt k="labelMedium" color={Brand.InkSoft}>Where is it? *</Txt>
      <Gap h={6} />
      <Field label="Country" value={v.country ?? 'India'} onChange={(x) => set('country', x)} />
      <Gap h={6} />
      <Field label="State" value={v.state ?? ''} onChange={(x) => set('state', x)} />
      <Gap h={6} />
      <Field label="City / town *" value={v.city ?? ''} onChange={(x) => set('city', x)} />
      <Gap h={6} />
      <Field label="Place (area or village)" value={v.area ?? ''} onChange={(x) => set('area', x)} />
      <Gap h={8} />
      <PinRow v={v} busy={busy} onPress={here} note={note} />
    </View>
  );
}

function PinRow({ v, busy, onPress, note }: { v: V; busy: boolean; onPress: () => void; note: string }) {
  const has = !!v.latitude && !!v.longitude;
  return (
    <View>
      <OutlineButton text={busy ? 'Finding you…' : has ? 'Pin again at my location' : 'Use my location for the map'} icon="my-location" onPress={onPress} disabled={busy} />
      <Txt k="bodySmall" color={has ? Brand.TealDark : Brand.Muted} style={{ marginTop: 4 }}>{note || (has ? `📍 On the map at ${Number(v.latitude).toFixed(4)}, ${Number(v.longitude).toFixed(4)}` : 'Stand at the place and press the button, so guests see it on the map.')}</Txt>
    </View>
  );
}

/** Just the map position (pet listings). */
function PinInput({ v, set, label }: { v: V; set: (k: string, x: string) => void; label: string }) {
  const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const here = async () => {
    setBusy(true); setNote('');
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) { setNote('Allow location to pin the place on the map.'); setBusy(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      set('latitude', pos.coords.latitude.toFixed(7)); set('longitude', pos.coords.longitude.toFixed(7)); setNote('Pinned on the map here.');
    } catch { setNote('Could not read your location — try again outdoors.'); }
    setBusy(false);
  };
  return <View><Txt k="labelMedium" color={Brand.InkSoft}>{label}</Txt><Gap h={6} /><PinRow v={v} busy={busy} onPress={here} note={note} /></View>;
}

/** Bedrooms (beds in each, attached bathroom) and common bathrooms — keeps bedrooms / bathrooms in step. */
function BedsInput({ v, set, types }: { v: V; set: (k: string, x: string) => void; types: J[] }) {
  const rooms: Record<string, number>[] = useMemo(() => { try { return (JSON.parse(v.bed_layout || '[]') as any[]).map((r) => (r && !Array.isArray(r) ? r : {})); } catch { return []; } }, [v.bed_layout]);
  const common = parseInt(v.common_baths || '0', 10) || 0;
  const put = (list: Record<string, number>[], c = common) => {
    set('bed_layout', JSON.stringify(list)); set('common_baths', String(c));
    set('bedrooms', String(list.length)); set('bathrooms', String(list.filter((r) => r.bath).length + c));
  };
  const bedText = (r: Record<string, number>) => { const p = types.filter((t) => r[text(t, 'type')] > 0).map((t) => `${r[text(t, 'type')]} ${text(t, 'label').toLowerCase()}${r[text(t, 'type')] > 1 ? (text(t, 'type') === 'mattress' ? 'es' : 's') : ''}`); return p.length > 1 ? p.slice(0, -1).join(', ') + ' & ' + p[p.length - 1] : p[0] || 'No beds chosen yet'; };
  return (
    <View>
      <Txt k="labelMedium" color={Brand.InkSoft}>Bedrooms & bathrooms</Txt>
      {rooms.map((r, i) => (
        <View key={i} style={{ marginTop: 10, borderRadius: 18, borderWidth: 1, borderColor: '#EFDCD5', backgroundColor: '#FFFAF7', padding: 12 }}>
          <View style={st.row}>
            <Txt k="titleSmall" bold style={{ flex: 1 }}>Bedroom {i + 1}</Txt>
            <Pressable onPress={() => put(rooms.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Remove bedroom ${i + 1}`}><Icon name="close" size={20} color={Brand.Muted} /></Pressable>
          </View>
          <Txt k="labelSmall" color={Brand.Muted}>{bedText(r)}</Txt>
          {types.map((t) => { const k = text(t, 'type'); return (
            <Stepper key={k} label={`${text(t, 'icon')} ${text(t, 'label')}`} value={r[k] || 0} min={0} max={10}
              onChange={(n) => put(rooms.map((x, j) => { if (j !== i) return x; const y = { ...x, [k]: n }; if (!n) delete y[k]; return y; }))} />
          ); })}
          <Pressable onPress={() => put(rooms.map((x, j) => { if (j !== i) return x; const y = { ...x }; if (y.bath) delete y.bath; else y.bath = 1; return y; }))}
            style={[st.row, { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ECD9D2' }]} accessibilityRole="checkbox" accessibilityState={{ checked: !!r.bath }}>
            <Icon name={r.bath ? 'check-box' : 'check-box-outline-blank'} size={22} color={r.bath ? Brand.Blue : Brand.Muted} />
            <Txt k="titleSmall" style={{ marginLeft: 8 }}>🚿 Attached bathroom</Txt>
          </Pressable>
        </View>
      ))}
      <Gap h={10} />
      <OutlineButton text="＋ Add a bedroom" onPress={() => rooms.length < 50 && put([...rooms, {}])} />
      <Gap h={6} />
      <Stepper label="🚿 Common bathrooms" note="Shared, not inside a bedroom" value={common} min={0} max={20} onChange={(c) => put(rooms, c)} />
      <Txt k="labelSmall" color={Brand.Muted}>{plural(rooms.length, 'bedroom')} · {plural(rooms.filter((r) => r.bath).length + common, 'bathroom')} in all</Txt>
    </View>
  );
}

/** Extra services with a price (pet listings): name, ₹, per stay / night / pet. */
function ExtrasInput({ value, onChange, label }: { value: string; onChange: (x: string) => void; label: string }) {
  let rows: { name: string; price: number | string; per: string }[] = [];
  try { rows = JSON.parse(value) || []; } catch {}
  const put = (r: typeof rows) => onChange(JSON.stringify(r));
  return (
    <View>
      <Txt k="labelMedium" color={Brand.InkSoft}>{label}</Txt>
      {rows.map((x, i) => (
        <View key={i} style={{ marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: Brand.Line, padding: 10 }}>
          <View style={st.row}>
            <View style={{ flex: 1 }}><Field label="Service" value={String(x.name ?? '')} onChange={(t) => put(rows.map((y, j) => (j === i ? { ...y, name: t } : y)))} /></View>
            <Pressable onPress={() => put(rows.filter((_, j) => j !== i))} hitSlop={8} style={{ paddingLeft: 8 }} accessibilityLabel="Remove"><Icon name="delete-outline" size={22} color={Brand.Muted} /></Pressable>
          </View>
          <Gap h={6} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Price (₹)" value={String(x.price ?? '')} keyboard={'numeric' as any} onChange={(t) => put(rows.map((y, j) => (j === i ? { ...y, price: t.replace(/[^0-9.]/g, '') } : y)))} /></View>
            <Choice label="Charged" value={x.per || 'stay'} options={[['stay', 'per stay'], ['night', 'per night'], ['pet', 'per pet']]} onChange={(t) => put(rows.map((y, j) => (j === i ? { ...y, per: t } : y)))} style={{ flex: 1 }} />
          </View>
        </View>
      ))}
      <Gap h={8} />
      <OutlineButton text="＋ Add an extra service" onPress={() => put([...rows, { name: '', price: '', per: 'stay' }])} />
    </View>
  );
}
