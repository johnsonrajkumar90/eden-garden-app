/*
 * Trip posts: a little social feed for the people in the trip — words and photos, likes and comments.
 * No phone numbers, email addresses or website links (the website checks too); everyone in the trip gets a notification.
 * The person who posted, or the person who made the trip, can delete a post.
 */
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, Upload, errorText } from '../core/api';
import { J, arr, bool, int, obj, objs, str, text } from '../core/json';
import { Picked, pickPhoto, pickPhotos, uploadOf } from '../core/files';
import { Brand, Fonts } from '../theme';
import { Icon, LinkButton, Notice, Txt, parseIso, st, MONTHS } from '../ui/kit';
import { Dialog } from '../ui/sheets';
import { openGroupUrl } from './Groups';

const Faces = ['#FFC72C', '#FF8A7A', '#8C9BF2', '#5CC29A', '#7CC8F0', '#F0A3D0'];

/** The same check as the website, so the person sees why before sending. */
export function contactProblem(t: string): string | null {
  const digits = t.replace(/(?<=\d)[\s\-().\/]+(?=\d)/g, '');
  if (/\+?\d{10,}/.test(digits)) return "Posts can't include phone numbers — to keep the trip safe, share them in person.";
  if (/[A-Z0-9._%+\-]+\s*(@|\(at\)|\[at\]|\s+at\s+)\s*[A-Z0-9\-]+\s*(\.|\(dot\)|\[dot\]|\s+dot\s+)\s*[A-Z]{2,}/i.test(t)) return "Posts can't include email addresses.";
  if (/(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|\b[a-z0-9][a-z0-9\-]{1,62}\s*\.\s*(com|in|net|org|co|io|me|ly|app|info|biz|xyz|site|online|link|shop|store|club|live|tv|us|uk|page|dev)\b)/i.test(t)) return "Posts can't include website links.";
  return null;
}

function ago(at: string) {
  const t = parseIso(at); if (!t) return '';
  const m = Math.floor((Date.now() - t.getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  if (m < 10080) return `${Math.floor(m / 1440)} d ago`;
  return `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`;
}

function Face({ name, id, size = 40 }: { name: string; id: number; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Faces[((id % Faces.length) + Faces.length) % Faces.length], alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: Fonts.bold, color: Brand.Ink, fontSize: size * 0.42 }}>{name.slice(0, 1).toUpperCase()}</Text></View>;
}

export function PostsPanel({ id, g, onData }: { id: number; g: J; onData: (g: J) => void }) {
  const me = objs(g, 'members').find((m) => bool(m, 'you'));
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [viewing, setViewing] = useState<[string[], number] | null>(null);
  const problem = contactProblem(body);
  const send = async () => {
    setBusy(true); setErr(null);
    try {
      const files: Upload[] = [];
      for (let i = 0; i < photos.length; i++) files.push(await uploadOf('photos[]', photos[i], `post${i}`));
      onData(await Api.postMultipart(`trip-groups/${id}/posts`, [['body', body.trim()]], files));
      setBody(''); setPhotos([]);
    } catch (e) { setErr(errorText(e)); }
    setBusy(false);
  };
  const act = async (path: string, b: Record<string, any> = {}) => { try { onData(await Api.post(path, b)); setErr(null); } catch (e) { setErr(errorText(e)); } };
  const can = !busy && !problem && (!!body.trim() || photos.length > 0);
  const posts = objs(g, 'posts');
  return (
    <View>
      <View style={{ borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          <Face name={text(me, 'name') || 'You'} id={int(me, 'id')} />
          <TextInput value={body} onChangeText={(v) => setBody(v.slice(0, 2000))} placeholder="Share a moment from the trip…" placeholderTextColor={Brand.Muted} multiline cursorColor={Brand.Matte}
            style={{ flex: 1, marginLeft: 10, borderRadius: 18, backgroundColor: '#F3F0EE', paddingHorizontal: 14, paddingVertical: 11, fontFamily: Fonts.regular, fontSize: 16, color: Brand.Ink, maxHeight: 180 }} accessibilityLabel="Write a post" />
        </View>
        {photos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
            {photos.map((p, i) => (
              <View key={p.uri} style={{ width: 84, height: 84, borderRadius: 14, overflow: 'hidden' }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
                <Pressable onPress={() => setPhotos((x) => x.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Remove photo"><Icon name="close" size={16} color="#fff" /></Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        {problem ? <Txt k="labelMedium" color={Brand.Matte} style={{ marginTop: 8 }}>{problem}</Txt> : null}
        {err ? <Notice text={err} tone="bad" style={{ marginTop: 8 }} /> : null}
        <View style={[st.row, { marginTop: 10 }]}>
          <Pressable disabled={photos.length >= 6} onPress={async () => { const ps = await pickPhotos(6 - photos.length); setPhotos((x) => [...x, ...ps].slice(0, 6)); }} style={[st.row, { paddingHorizontal: 10, paddingVertical: 8 }]}>
            <Icon name="add-photo-alternate" size={22} color="#0E9F6E" /><Txt k="labelLarge" color={Brand.InkSoft}> Photos</Txt>
          </Pressable>
          <Pressable disabled={photos.length >= 6} onPress={async () => { const p = await pickPhoto('camera'); if (p) setPhotos((x) => [...x, p].slice(0, 6)); }} style={[st.row, { paddingHorizontal: 10, paddingVertical: 8 }]}>
            <Icon name="photo-camera" size={22} color="#1F6FEB" /><Txt k="labelLarge" color={Brand.InkSoft}> Camera</Txt>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable disabled={!can} onPress={send} style={{ borderRadius: 50, overflow: 'hidden' }}>
            <LinearGradient colors={can ? [Brand.Matte, '#E8452F'] : ['#E6DCD8', '#E6DCD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingVertical: 9, minWidth: 70, alignItems: 'center' }}>
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Txt bold color={can ? '#fff' : Brand.Muted}>Post</Txt>}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
      <Txt k="labelSmall" color={Brand.Muted} style={{ marginTop: 6, marginLeft: 4 }}>Only people in this trip see posts. Phone numbers, emails and links can't be posted.</Txt>
      {!posts.length ? <Txt color={Brand.InkSoft} style={{ paddingVertical: 18, paddingHorizontal: 4 }}>No posts yet — share the first photo of the trip!</Txt> : null}
      {posts.map((p) => <PostCard key={int(p, 'id')} id={id} p={p} act={act} view={(urls, i) => setViewing([urls, i])} />)}
      {viewing ? <PhotoViewer urls={viewing[0]} start={viewing[1]} onClose={() => setViewing(null)} /> : null}
    </View>
  );
}

function PostCard({ id, p, act, view }: { id: number; p: J; act: (path: string, b?: Record<string, any>) => void; view: (urls: string[], i: number) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState<[string, string] | null>(null);
  const photos = arr<string>(p, 'photos').map(String);
  const comments = objs(p, 'comments');
  const liked = bool(p, 'liked');
  const problem = contactProblem(comment);
  const rows: string[][] = []; photos.slice(0, 4).forEach((u, i) => { if (i % 2 === 0) rows.push([u]); else rows[rows.length - 1].push(u); });
  return (
    <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, overflow: 'hidden' }}>
      <View style={[st.row, { paddingLeft: 14, paddingRight: 4, paddingTop: 12 }]}>
        <Face name={text(p, 'by')} id={int(p, 'by_id')} />
        <View style={{ flex: 1, paddingLeft: 10 }}>
          <Txt k="titleSmall" bold>{bool(p, 'mine') ? 'You' : text(p, 'by')}</Txt>
          <Txt k="labelSmall" color={Brand.Muted}>{ago(text(p, 'at'))}</Txt>
        </View>
        {bool(p, 'can_delete') ? <Pressable onPress={() => setConfirm([`trip-groups/${id}/items/${int(p, 'id')}/delete`, 'Delete this post? Its photos and comments go too.'])} style={{ padding: 10 }} accessibilityLabel="Delete post"><Icon name="delete-outline" color={Brand.Muted} /></Pressable> : null}
      </View>
      {text(p, 'body') ? <Txt k="bodyLarge" style={{ paddingHorizontal: 14, paddingVertical: 8 }}>{text(p, 'body')}</Txt> : null}
      {obj(p, 'auto') ? <AutoCard a={obj(p, 'auto')!} view={(u) => view([u], 0)} /> : null}
      {photos.length ? (
        <View style={{ marginTop: 4 }}>
          {photos.length === 1 ? (
            <Pressable onPress={() => view(photos, 0)}><Image source={{ uri: photos[0] }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: Brand.Sky }} contentFit="cover" accessibilityLabel="Photo" /></Pressable>
          ) : rows.map((pair, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 3, marginTop: r > 0 ? 3 : 0 }}>
              {pair.map((u, c) => {
                const i = r * 2 + c;
                return (
                  <Pressable key={i} onPress={() => view(photos, i)} style={{ flex: 1, aspectRatio: 1, backgroundColor: Brand.Sky }}>
                    <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
                    {i === 3 && photos.length > 4 ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 26, fontFamily: Fonts.bold }}>+{photos.length - 4}</Text></View> : null}
                  </Pressable>
                );
              })}
              {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      ) : null}
      {int(p, 'likes') > 0 || comments.length ? (
        <View style={[st.row, { paddingHorizontal: 14, paddingVertical: 8 }]}>
          {int(p, 'likes') > 0 ? <View style={st.row}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#E8452F', alignItems: 'center', justifyContent: 'center' }}><Icon name="favorite" size={11} color="#fff" /></View><Txt k="labelMedium" color={Brand.InkSoft}> {int(p, 'likes')}</Txt></View> : null}
          <View style={{ flex: 1 }} />
          {comments.length ? <Txt k="labelMedium" color={Brand.InkSoft} onPress={() => setShowComments(!showComments)}>{comments.length} comment{comments.length === 1 ? '' : 's'}</Txt> : null}
        </View>
      ) : null}
      <View style={{ marginHorizontal: 12, height: 1, backgroundColor: Brand.Line }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 2 }}>
        <Pressable onPress={() => act(`trip-groups/${id}/posts/${int(p, 'id')}/like`)} style={[st.row, { flex: 1, justifyContent: 'center', paddingVertical: 10 }]} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
          <Icon name={liked ? 'favorite' : 'favorite-border'} size={20} color={liked ? '#E8452F' : Brand.InkSoft} /><Txt semi color={liked ? '#E8452F' : Brand.InkSoft}> Like</Txt>
        </Pressable>
        <Pressable onPress={() => setShowComments(!showComments)} style={[st.row, { flex: 1, justifyContent: 'center', paddingVertical: 10 }]}>
          <Icon name="chat-bubble-outline" size={20} color={Brand.InkSoft} /><Txt semi color={Brand.InkSoft}> Comment</Txt>
        </Pressable>
      </View>
      {showComments ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {comments.map((c) => (
            <View key={int(c, 'id')} style={{ flexDirection: 'row', marginTop: 8 }}>
              <Face name={text(c, 'by')} id={int(c, 'by_id')} size={30} />
              <View style={{ flex: 1, marginLeft: 8, borderRadius: 16, backgroundColor: '#F3F0EE', paddingHorizontal: 12, paddingVertical: 8 }}>
                <Txt k="labelLarge" bold>{bool(c, 'mine') ? 'You' : text(c, 'by')}</Txt>
                <Txt>{text(c, 'body')}</Txt>
                <Txt k="labelSmall" color={Brand.Muted}>{ago(text(c, 'at'))}</Txt>
              </View>
              {bool(c, 'can_delete') ? <Pressable onPress={() => setConfirm([`trip-groups/${id}/comments/${int(c, 'id')}/delete`, 'Delete this comment?'])} style={{ padding: 8 }} accessibilityLabel="Delete comment"><Icon name="close" size={16} color={Brand.Muted} /></Pressable> : null}
            </View>
          ))}
          <View style={[st.row, { marginTop: 10 }]}>
            <TextInput value={comment} onChangeText={(v) => setComment(v.slice(0, 1000))} placeholder="Write a comment…" placeholderTextColor={Brand.Muted} multiline cursorColor={Brand.Matte}
              style={{ flex: 1, borderRadius: 20, backgroundColor: '#F3F0EE', paddingHorizontal: 14, paddingVertical: 10, fontFamily: Fonts.regular, fontSize: 15, color: Brand.Ink, maxHeight: 110 }} accessibilityLabel="Write a comment" />
            <LinkButton text="Send" disabled={!comment.trim() || !!problem} onPress={() => { act(`trip-groups/${id}/posts/${int(p, 'id')}/comments`, { body: comment.trim() }); setComment(''); }} />
          </View>
          {problem ? <Txt k="labelSmall" color={Brand.Matte} style={{ marginTop: 4 }}>{problem.replace('Posts', 'Comments')}</Txt> : null}
        </View>
      ) : null}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.[1]} actions={[['Keep', () => setConfirm(null), Brand.InkSoft], ['Delete', () => { const c = confirm; setConfirm(null); if (c) act(c[0]); }, Brand.Danger]]} />
    </View>
  );
}

/** What was added to the plan, as a card in the post: what kind, its name, details and photo. */
function AutoCard({ a, view }: { a: J; view: (u: string) => void }) {
  const [icon, colour] = ({ place: ['place', '#0E9F6E'], booking: ['hotel', '#1F6FEB'], ticket: ['confirmation-number', '#7C3AED'], plan: ['route', '#B45309'], todo: ['task-alt', '#0891B2'], fav: ['favorite', '#E8452F'] } as Record<string, [string, string]>)[text(a, 'kind')] || ['description', '#54656F'];
  const coords = arr<number>(a, 'coords');
  const photo = str(a, 'photo');
  return (
    <View>
      <Txt k="labelMedium" color={Brand.InkSoft} style={{ marginLeft: 14, marginTop: 6 }}>added to the plan</Txt>
      <Pressable disabled={coords.length !== 2} onPress={() => openGroupUrl(`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`)}
        style={{ marginHorizontal: 14, marginVertical: 8, borderRadius: 18, backgroundColor: colour + '12', borderWidth: 1, borderColor: colour + '40', overflow: 'hidden' }}>
        {photo ? <Pressable onPress={() => view(photo)}><Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: Brand.Sky }} contentFit="cover" accessibilityLabel={text(a, 'title')} /></Pressable> : null}
        <View style={[st.row, { padding: 12 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colour, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} color="#fff" /></View>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Txt k="labelSmall" bold color={colour}>{text(a, 'label')}</Txt>
            <Txt k="titleSmall" bold numberOfLines={2}>{text(a, 'title')}</Txt>
            {text(a, 'sub') ? <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={2}>{text(a, 'sub')}</Txt> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/** Full-screen photos, swipe between them. */
export function PhotoViewer({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(start);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000000F2' }}>
        <FlatList data={urls} horizontal pagingEnabled initialScrollIndex={start} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })} showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index }) => <Image source={{ uri: item }} style={{ width, height }} contentFit="contain" accessibilityLabel={`Photo ${index + 1} of ${urls.length}`} />} />
        {urls.length > 1 ? <Txt color="#fff" center style={{ position: 'absolute', bottom: 24, left: 0, right: 0 }}>{page + 1} / {urls.length}</Txt> : null}
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 40, right: 12, padding: 12 }} accessibilityLabel="Close"><Icon name="close" size={28} color="#fff" /></Pressable>
      </View>
    </Modal>
  );
}
