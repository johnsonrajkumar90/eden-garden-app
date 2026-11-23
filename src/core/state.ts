// App-wide state shared between screens (the same as the native app's AppState), with a tiny subscribe-able store.
import { useEffect, useState, useSyncExternalStore, useCallback, useRef } from 'react';
import { Api, Session, errorText } from './api';
import { J } from './json';

export type ReserveDraft = {
  kind: string; id: number; title: string; image: string | null; checkIn: string; checkOut: string;
  adults: number; ages: number[]; food: boolean; coupon: string; roomId: number | null; planId: number | null; rooms: number; quote: J;
  forceSearch?: number;   // booked from a Force search a host accepted
};
export type PaymentForm = { action: string; fields: J; title: string };

type State = {
  reserve: ReserveDraft | null;
  payment: PaymentForm | null;
  aiMode: 'travel' | 'pets';
  authMessage: string | null;
  localTrip: J | null; localTripDone: number; localTripTitle: string;
  refreshTick: number;
  unread: number;
};

let state: State = { reserve: null, payment: null, aiMode: 'travel', authMessage: null, localTrip: null, localTripDone: 0, localTripTitle: '', refreshTick: 0, unread: 0 };
const subs = new Set<() => void>();

export const AppState = {
  get: () => state,
  set(p: Partial<State>) { state = { ...state, ...p }; subs.forEach((f) => f()); },
  /** Lists reload after a payment or a change. */
  bump() { AppState.set({ refreshTick: state.refreshTick + 1 }); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};

export function useAppState<K extends keyof State>(k: K): State[K] {
  return useSyncExternalStore(AppState.subscribe, () => state[k]);
}

/** The signed-in session (null while loading / signed out). */
export function useSession(): Session | null {
  const [s, setS] = useState<Session | null>(Api.session);
  useEffect(() => Api.onSession(setS), []);
  return s;
}

/** Loading / error / data for one API call, reloaded with reload() or when the keys change. */
export function useLoader<T>(load: () => Promise<T>, keys: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    loadRef.current().then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setError(friendly(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...keys, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, error, loading, reload };
}

/** The website hasn't been updated with this feature yet. */
export function friendly(e: unknown) {
  const m = errorText(e);
  return m === 'Unknown API address.' ? "This part of TripArro isn't available yet — please try again later." : m;
}
