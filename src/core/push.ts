/*
 * Firebase push (Android): the website gives the public Firebase settings (Admin → Push notifications); the app starts
 * Firebase with them, gets this phone's push token and gives it to the website for the signed-in person. Then
 * notifications arrive even when the app is closed. With push on, the app's own check stops showing notifications
 * itself (no doubles) and only keeps the unread count.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { Api } from './api';
import { bool, obj, text } from './json';

const FirebaseInit = requireOptionalNativeModule<{ initialize(apiKey: string, appId: string, projectId: string, senderId: string): boolean; isReady(): boolean }>('FirebaseInit');

export async function pushOn(): Promise<boolean> { return (await AsyncStorage.getItem('fcm_on')) === '1'; }

let busy = false;
/** Register this phone for the signed-in person (safe to call often). */
export async function registerPush(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FirebaseInit || busy) return false;
  busy = true;
  try {
    if (!Api.session?.user) return false;
    const r = await Api.get('push/config', { platform: 'android' });
    const c = obj(r, 'config');
    if (!bool(r, 'enabled') || !c) { await AsyncStorage.removeItem('fcm_on'); return false; }
    if (!FirebaseInit.initialize(text(c, 'api_key'), text(c, 'app_id'), text(c, 'project_id'), text(c, 'sender_id'))) return false;
    if (!(await Notifications.getPermissionsAsync()).granted) return false;
    const t = await Notifications.getDevicePushTokenAsync();
    const token = String(t?.data || '');
    if (!token) return false;
    await Api.post('push/register', { token, platform: 'android' });
    await AsyncStorage.multiSet([['fcm_on', '1'], ['fcm_token', token]]);
    return true;
  } catch {
    return false;   // push is optional: the app's own check keeps working
  } finally { busy = false; }
}

/** Signing out: this phone stops getting the person's notifications. */
export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem('fcm_token');
    if (token) await Api.post('push/unregister', { token });
  } catch {}
  await AsyncStorage.multiRemove(['fcm_on', 'fcm_token']).catch(() => {});
}

/** A new token from Firebase: give it to the website. */
export function watchToken() {
  return Notifications.addPushTokenListener((t) => {
    if (Platform.OS !== 'android' || !t?.data || !Api.session?.user) return;
    Api.post('push/register', { token: String(t.data), platform: 'android' }).then(() => AsyncStorage.multiSet([['fcm_on', '1'], ['fcm_token', String(t.data)]])).catch(() => {});
  });
}
