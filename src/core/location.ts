/*
 * The phone's location — a real, fresh fix, not only the last one the phone happened to remember: a last-known position
 * from the past 2 minutes is used straight away; otherwise a new position is asked for, and if nothing comes back in
 * time the newest last-known position (up to a day old) is used. The last good fix is kept for "near me" screens.
 */
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type LocResult = { kind: 'found'; lat: number; lng: number; accuracyM: number } | { kind: 'denied' } | { kind: 'off' } | { kind: 'notfound' };

export let lastFix: { lat: number; lng: number; accuracyM: number } | null = null;

export async function hasPermission() { try { return (await Location.getForegroundPermissionsAsync()).granted; } catch { return false; } }
export async function askPermission() {
  try {
    const p = await Location.getForegroundPermissionsAsync();
    if (p.granted) return true;
    if (!p.canAskAgain) return false;
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch { return false; }
}

/** Opens the phone's location settings (to switch location on). */
export function openLocationSettings() {
  if (Platform.OS === 'android') Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings().catch(() => {}));
  else Linking.openSettings().catch(() => {});
}
/** Opens this app's settings page (to allow a permission that was turned down for good). */
export const openAppSettings = () => Linking.openSettings().catch(() => {});

const found = (l: Location.LocationObject): LocResult => {
  lastFix = { lat: l.coords.latitude, lng: l.coords.longitude, accuracyM: l.coords.accuracy || 0 };
  return { kind: 'found', ...lastFix };
};

export async function current(timeoutMs = 15000, ask = true): Promise<LocResult> {
  if (!(ask ? await askPermission() : await hasPermission())) return { kind: 'denied' };
  try { if (!(await Location.hasServicesEnabledAsync())) return { kind: 'off' }; } catch {}
  let known: Location.LocationObject | null = null;
  try { known = await Location.getLastKnownPositionAsync({ maxAge: 24 * 3600_000 }); } catch {}
  if (known && Date.now() - known.timestamp < 2 * 60_000 && (known.coords.accuracy || 0) < 2000) return found(known);
  try {
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    if (fresh) return found(fresh);
  } catch {}
  return known ? found(known) : { kind: 'notfound' };
}

/** What to tell the person when no location came back. */
export function locMessage(r: LocResult): string {
  switch (r.kind) {
    case 'denied': return 'Allow location for TripArro to use where you are.';
    case 'off': return "Your phone's location is switched off — switch it on and try again.";
    case 'notfound': return "We couldn't find where you are right now — try again outdoors, or type the place.";
    default: return '';
  }
}
