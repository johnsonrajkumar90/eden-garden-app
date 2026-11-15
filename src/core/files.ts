/*
 * Photos from the phone: pick from the album or take one with the camera, made small enough to upload quickly
 * (at most 1600 px on the long side, the right way up, JPEG).
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Linking } from 'react-native';
import { Upload } from './api';

export type Picked = { uri: string; width: number; height: number; type: string; name: string };

/** Ask for one photo (album or camera). Returns null when the person cancels or says no. */
export async function pickPhoto(from: 'album' | 'camera' = 'album', opts: { video?: boolean; quality?: number } = {}): Promise<Picked | null> {
  try {
    if (from === 'camera') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) { if (!p.canAskAgain) Linking.openSettings().catch(() => {}); return null; }
    }
    const o: ImagePicker.ImagePickerOptions = { mediaTypes: opts.video ? ['images', 'videos'] : ['images'], quality: opts.quality ?? 0.9, exif: false };
    const r = from === 'camera' ? await ImagePicker.launchCameraAsync(o) : await ImagePicker.launchImageLibraryAsync(o);
    if (r.canceled || !r.assets?.length) return null;
    const a = r.assets[0];
    const isVideo = a.type === 'video';
    return { uri: a.uri, width: a.width, height: a.height, type: a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'), name: a.fileName || a.uri.split('/').pop() || (isVideo ? 'video.mp4' : 'photo.jpg') };
  } catch { return null; }
}

/** Several photos from the album at once. */
export async function pickPhotos(max = 10): Promise<Picked[]> {
  try {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: max, quality: 0.9 });
    if (r.canceled) return [];
    return r.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height, type: a.mimeType || 'image/jpeg', name: a.fileName || 'photo.jpg' }));
  } catch { return []; }
}

/** A photo made smaller for upload (falls back to the original when it can't be read as an image). */
export async function shrinkPhoto(p: { uri: string; width?: number; height?: number }, maxPx = 1600): Promise<{ uri: string; width: number; height: number }> {
  try {
    const w = p.width || 0; const h = p.height || 0;
    const resize = w && h && Math.max(w, h) > maxPx ? [{ resize: w >= h ? { width: maxPx } : { height: maxPx } }] : [];
    const r = await ImageManipulator.manipulateAsync(p.uri, resize as any, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
    return { uri: r.uri, width: r.width, height: r.height };
  } catch { return { uri: p.uri, width: p.width || 0, height: p.height || 0 }; }
}

/** A picked photo as a file to upload (shrunk first). */
export async function uploadOf(field: string, p: Picked, prefix = 'photo', maxPx = 1600): Promise<Upload> {
  if (p.type.startsWith('video')) return { field, uri: p.uri, name: p.name, type: p.type };
  const s = await shrinkPhoto(p, maxPx);
  return { field, uri: s.uri, name: `${prefix}-${Date.now()}.jpg`, type: 'image/jpeg' };
}
