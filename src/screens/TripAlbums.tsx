/*
 * Memory albums inside a trip: anyone in the trip makes an album ("Day 1 at the lake") and adds photos to it.
 * A photo can be deleted only by the person who added it; an album by who made it or who made the trip.
 * Every photo is checked on the website first (no adult photos in trips).
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Api, Upload, errorText } from '../core/api';
import { J, bool, int, objs, str, text } from '../core/json';
import { pickPhotos, uploadOf } from '../core/files';
import { Brand } from '../theme';
import { Gap, Icon, Notice, OutlineButton, Press, PrimaryButton, Txt, st } from '../ui/kit';
import { Field } from '../ui/inputs';
import { Dialog, Sheet } from '../ui/sheets';
import { PhotoViewer } from './TripPosts';

export function AlbumsPanel({ id, g, onData }: { id: number; g: J; onData: (g: J) => void }) {
  const albums = objs(g, 'albums');
  const [making, setMaking] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const open = albums.find((a) => int(a, 'id') === openId) || null;
  const pairs: J[][] = []; albums.forEach((a, i) => { if (i % 2 === 0) pairs.push([a]); else pairs[pairs.length - 1].push(a); });
  return (
    <View>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Txt k="titleMedium">Memory albums</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{albums.length ? `${albums.length} album${albums.length === 1 ? '' : 's'} · ${albums.reduce((n, a) => n + int(a, 'count'), 0)} photos` : 'Keep the trip\'s photos together, day by day.'}</Txt>
        </View>
        <PrimaryButton text="New album" icon="add" onPress={() => setMaking(true)} style={{ minHeight: 46, paddingVertical: 10 }} />
      </View>
      <Gap h={12} />
      {!albums.length ? (
        <Press onPress={() => setMaking(true)} style={{ borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#DAD7D2', padding: 24, alignItems: 'center' }}>
          <View style={{ width: 64, height: 56, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}><Icon name="photo-library" size={28} color={Brand.Blue} /></View>
          <Txt k="titleSmall" style={{ marginTop: 10 }}>Make the first album</Txt>
          <Txt k="bodySmall" color={Brand.Muted} center>Everyone in the trip can add their photos to it.</Txt>
        </Press>
      ) : pairs.map((pair, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {pair.map((a) => (
            <Press key={int(a, 'id')} onPress={() => setOpenId(int(a, 'id'))} style={{ flex: 1 }} accessibilityLabel={`Album ${text(a, 'title')}`}>
              <View style={{ aspectRatio: 1, borderTopLeftRadius: 80, borderTopRightRadius: 80, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: 'hidden', backgroundColor: Brand.Field, alignItems: 'center', justifyContent: 'center' }}>
                {str(a, 'cover') ? <Image source={{ uri: str(a, 'cover')! }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} contentFit="cover" /> : <Icon name="photo-library" size={34} color={Brand.Muted} />}
                <View style={{ position: 'absolute', right: 8, bottom: 8, borderRadius: 50, backgroundColor: '#000000AA', paddingHorizontal: 8, paddingVertical: 3 }}><Txt k="labelSmall" color="#fff">{int(a, 'count')}</Txt></View>
              </View>
              <Txt k="titleSmall" numberOfLines={1} style={{ marginTop: 6 }}>{text(a, 'title')}</Txt>
              <Txt k="labelSmall" color={Brand.Muted} numberOfLines={1}>by {text(a, 'by')}</Txt>
            </Press>
          ))}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
      <Sheet open={making} onClose={() => setMaking(false)} title="New album">
        {making ? <NewAlbum id={id} done={(nd) => { onData(nd); setMaking(false); const a = objs(nd, 'albums')[0]; if (a) setOpenId(int(a, 'id')); }} /> : null}
      </Sheet>
      <Sheet open={!!open} onClose={() => setOpenId(null)}>
        {open ? <AlbumView id={id} album={open} onData={onData} onDeleted={() => setOpenId(null)} /> : null}
      </Sheet>
    </View>
  );
}

async function photoFiles(max: number): Promise<Upload[]> {
  const picked = await pickPhotos(max);
  const out: Upload[] = [];
  for (const p of picked) out.push(await uploadOf('photos[]', p, 'album'));
  return out;
}

function NewAlbum({ id, done }: { id: number; done: (g: J) => void }) {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <View>
      <Field label="Album name" value={title} onChange={(v) => setTitle(v.slice(0, 80))} placeholder="e.g. Day 1 at the lake" />
      <Gap h={10} />
      <OutlineButton text={files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} chosen — change` : 'Choose photos (optional)'} icon="add-photo-alternate"
        onPress={async () => setFiles(await photoFiles(30))} />
      {files.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {files.slice(0, 12).map((f, i) => <Image key={i} source={{ uri: f.uri }} style={{ width: 58, height: 58, borderRadius: 10 }} contentFit="cover" />)}
        </View>
      ) : null}
      {err ? <><Gap h={8} /><Notice text={err} tone="bad" /></> : null}
      <Gap />
      <PrimaryButton text="Make album" icon="photo-library" loading={busy} disabled={!title.trim()} onPress={async () => {
        setBusy(true); setErr(null);
        try { done(await Api.postMultipart(`trip-groups/${id}/albums`, [['title', title.trim()]], files)); } catch (e) { setErr(errorText(e)); }
        setBusy(false);
      }} />
      <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 8 }}>Photos are private to the people in this trip. Adult photos are not allowed.</Txt>
    </View>
  );
}

function AlbumView({ id, album, onData, onDeleted }: { id: number; album: J; onData: (g: J) => void; onDeleted: () => void }) {
  const photos = objs(album, 'photos');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<[string, string] | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<'album' | number | null>(null);
  const aid = int(album, 'id');
  const run = async (fn: () => Promise<J>, after?: (g: J) => void) => {
    setBusy(true); setMsg(null);
    try { const g = await fn(); onData(g); if (str(g, 'notice')) setMsg([str(g, 'notice')!, 'warn']); after?.(g); } catch (e) { setMsg([errorText(e), 'bad']); }
    setBusy(false);
  };
  return (
    <View>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Txt k="titleLarge">{text(album, 'title')}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{photos.length} photo{photos.length === 1 ? '' : 's'} · made by {text(album, 'by')}</Txt>
        </View>
        {bool(album, 'can_delete') ? <Pressable onPress={() => setConfirm('album')} style={{ padding: 8 }} accessibilityLabel="Delete album"><Icon name="delete-outline" color={Brand.Danger} /></Pressable> : null}
      </View>
      <Gap h={10} />
      <PrimaryButton text={busy ? 'Adding…' : 'Add photos'} icon="add-photo-alternate" loading={busy} onPress={async () => {
        const files = await photoFiles(30); if (!files.length) return;
        run(() => Api.postMultipart(`trip-groups/${id}/albums/${aid}/photos`, [], files));
      }} />
      {msg ? <><Gap h={8} /><Notice text={msg[0]} tone={msg[1]} /></> : null}
      <Gap h={12} />
      {!photos.length ? <Txt color={Brand.Muted}>No photos yet — add the first ones.</Txt> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {photos.map((p, i) => (
            <Pressable key={int(p, 'id')} onPress={() => setViewer(i)} style={{ width: '32.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: Brand.Field }} accessibilityLabel={`Photo by ${text(p, 'by')}`}>
              <Image source={{ uri: str(p, 'url') || undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              {bool(p, 'can_delete') ? (
                <Pressable onPress={() => setConfirm(int(p, 'id'))} hitSlop={6} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Delete my photo">
                  <Icon name="close" size={16} color="#fff" />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
      {busy ? <ActivityIndicator style={{ marginTop: 10 }} color={Brand.Blue} /> : null}
      {viewer !== null ? <PhotoViewer urls={photos.map((p) => text(p, 'url'))} start={viewer} onClose={() => setViewer(null)} /> : null}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}
        title={confirm === 'album' ? `Delete the album “${text(album, 'title')}”?` : 'Delete this photo?'}
        text={confirm === 'album' ? 'All its photos are deleted for everyone in the trip.' : 'It is removed from the album for everyone.'}
        actions={[['Cancel', () => setConfirm(null)], ['Delete', () => {
          const c = confirm; setConfirm(null);
          if (c === 'album') run(() => Api.post(`trip-groups/${id}/albums/${aid}/delete`), () => onDeleted());
          else if (typeof c === 'number') run(() => Api.post(`trip-groups/${id}/album-photos/${c}/delete`));
        }, Brand.Danger]]} />
    </View>
  );
}
