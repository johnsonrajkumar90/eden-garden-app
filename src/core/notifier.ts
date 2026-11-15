/*
 * Phone notifications: the app asks the website for new notifications (every 30 s while open, about every 15 minutes in
 * the background) and shows them. Messages and trip posts pop up with sound. The first check after signing in only
 * remembers where the list stands, so old notifications don't all pop up at once.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { Platform } from 'react-native';
import { Api } from './api';
import { AppState } from './state';
import { bool, int, objs, text } from './json';

const TASK = 'triparro-notifications';
const CHANNEL = 'updates';
const CHANNEL_MSG = 'messages';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function createChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Booking updates', importance: Notifications.AndroidImportance.DEFAULT, sound: 'default', vibrationPattern: [0, 200], lightColor: '#D7192A' });
  await Notifications.setNotificationChannelAsync(CHANNEL_MSG, { name: 'Messages', importance: Notifications.AndroidImportance.HIGH, sound: 'default', vibrationPattern: [0, 250, 150, 250], lightColor: '#D7192A' });
}

export async function soundOn() { return (await AsyncStorage.getItem('notify_sound')) !== '0'; }
export async function setSound(on: boolean) { await AsyncStorage.setItem('notify_sound', on ? '1' : '0'); }

export async function canPost() { return (await Notifications.getPermissionsAsync()).granted; }
export async function askPermission() {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || !p.canAskAgain) return p.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Fetch new notifications and show them (returns how many are new). */
export async function check(post = true): Promise<number> {
  let user = Api.session?.user;
  if (!user) { try { user = (await Api.refreshSession()).user; } catch { return 0; } }
  if (!user) return 0;
  const key = `last_${user.id}`;
  const last = Number((await AsyncStorage.getItem(key)) || -1);
  const j = await Api.get('notifications', { after: last > 0 ? last : null, limit: 20 });
  AppState.set({ unread: int(j, 'unread') });
  const items = objs(j, 'items');
  const top = Math.max(last, ...items.map((x) => int(x, 'id')));
  if (last < 0) { await AsyncStorage.setItem(key, String(Math.max(top, 0))); return 0; }
  const fresh = items.filter((x) => !bool(x, 'read') && int(x, 'id') > last && !bool(x, 'muted')).sort((a, b) => int(a, 'id') - int(b, 'id'));
  if (post && (await canPost())) {
    const sound = await soundOn();
    for (const n of fresh.slice(-5)) {
      const isMsg = ['message', 'chat'].includes(text(n, 'kind'));
      await Notifications.scheduleNotificationAsync({
        content: { title: text(n, 'title'), body: text(n, 'body'), sound: sound ? 'default' : undefined, data: { id: int(n, 'id'), link: text(n, 'link') },
          ...(Platform.OS === 'android' ? { color: '#D7192A' } : {}) },
        trigger: Platform.OS === 'android' ? { channelId: isMsg ? CHANNEL_MSG : CHANNEL } as any : null,
      });
    }
  }
  if (top > last) await AsyncStorage.setItem(key, String(top));
  return fresh.length;
}

export async function setUnread(n: number) { AppState.set({ unread: n }); }

// the background check (Android WorkManager / iOS background refresh decide the exact time — about every 15 minutes)
TaskManager.defineTask(TASK, async () => {
  try { await check(true); return BackgroundTask.BackgroundTaskResult.Success; } catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});

export async function scheduleBackground() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  } catch {}
}

/** Signed out: forget what was seen and clear the phone's notifications. */
export async function reset() {
  try { const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('last_')); await AsyncStorage.multiRemove(keys); } catch {}
  try { await Notifications.dismissAllNotificationsAsync(); } catch {}
  AppState.set({ unread: 0 });
}

/** A short sound so people hear what new messages sound like (shown as a small notification). */
let lastChime = 0;
export async function chime() {
  if (!(await soundOn()) || Date.now() - lastChime < 1500 || !(await canPost())) return;
  lastChime = Date.now();
  await Notifications.scheduleNotificationAsync({ content: { title: 'TripArro', body: 'Sounds are on for new messages and updates.', sound: 'default' }, trigger: Platform.OS === 'android' ? ({ channelId: CHANNEL_MSG } as any) : null }).catch(() => {});
}
