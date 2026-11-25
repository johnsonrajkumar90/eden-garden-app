/*
 * The host's month calendar: one coloured lane per listing. A booking is a bar across its nights — it starts in the
 * middle of the check-in day with a coloured dot and ends in the middle of the check-out day with a grey dot, so
 * back-to-back stays meet in one day. Sunday-first weeks, today ringed, a "% booked" for the month.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Brand } from '../theme';
import { Icon, Txt, parseIso, st, today } from '../ui/kit';

const thisMonth = () => today().slice(0, 7);
const addMonths = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

/** One colour per listing, in the order the listings come. */
export const LANE_COLORS = ['#F2C94C', '#6EC6F0', '#E35D5D', '#4CAF6E', '#A779E9', '#F2994A', '#3DB8B0', '#EB5FA6', '#7C8CF8', '#B5895A'];
export const laneColor = (i: number) => LANE_COLORS[i % LANE_COLORS.length];

/** A lane's state for one day: free, or taken by a booking / block (key tells bookings apart). */
export type LaneDay = { state: string; key: string };
export type CalDay = { date: string; lanes: LaneDay[]; extra?: string | null };

const taken = (s?: LaneDay) => !!s && s.state !== 'free';
const CHECKOUT = '#9E9E9E';

export function MonthTitle({ label, pct, month, onMonth }: { label: string; pct?: number | null; month: string; onMonth: (m: string) => void }) {
  const canBack = month > thisMonth();
  const arrow = (icon: string, on: boolean, f: () => void, a: string) => (
    <Pressable onPress={f} disabled={!on} accessibilityLabel={a} hitSlop={6} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFE9E1', alignItems: 'center', justifyContent: 'center', opacity: on ? 1 : 0.35 }}>
      <Icon name={icon} size={20} color={Brand.Ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 10 }}>
      <Txt k="headlineSmall" bold style={{ flex: 1 }}>{label}</Txt>
      {pct != null ? <Txt k="labelMedium" color={Brand.Muted}>{pct}% booked</Txt> : null}
      {arrow('chevron-left', canBack, () => onMonth(addMonths(month, -1)), 'Previous month')}
      {arrow('chevron-right', true, () => onMonth(addMonths(month, 1)), 'Next month')}
    </View>
  );
}

export const DayPills = () => (
  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
      <View key={d} style={{ flex: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.75)', paddingVertical: 6 }}><Txt k="labelMedium" color={Brand.InkSoft} center>{d}</Txt></View>
    ))}
  </View>
);

/** The share of listing-nights taken in the month (closed nights count as not bookable). */
export function bookedPct(days: CalDay[]): number | null {
  let busy = 0, all = 0;
  days.forEach((d) => d.lanes.forEach((l) => { if (l.state === 'closed') return; all++; if (l.state !== 'free') busy++; }));
  return all ? Math.round((busy / all) * 100) : null;
}

/**
 * The month: a cell per day with a lane per listing.
 * prevLast: each lane's state on the day before the month (so a stay running in from last month draws right).
 */
export function LaneMonth({ days, colors, onDay, selected, prevLast }: { days: CalDay[]; colors: string[]; onDay: (d: CalDay) => void; selected?: (date: string) => boolean; prevLast?: LaneDay[] }) {
  const t0 = today();
  const lead = days.length ? (parseIso(days[0].date)?.getDay() ?? 0) : 0;   // Sunday first
  const cells: (CalDay | null)[] = [...Array(lead).fill(null), ...days];
  // a lane shows the day after a stay too (its check-out half), so look one day ahead past the month's end
  const rows: (CalDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const n = colors.length;
  const laneH = n > 6 ? 4 : 5, laneGap = n > 6 ? 3 : 5;
  const cellH = 34 + n * (laneH + laneGap) + 4;
  const prevOf = (idx: number, lane: number): LaneDay | undefined => (idx > 0 ? days[idx - 1].lanes[lane] : prevLast?.[lane]);
  return (
    <View>
      {rows.map((w, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const c = w[i];
            if (!c) return <View key={i} style={{ flex: 1, height: cellH }} />;
            const idx = days.indexOf(c);
            const isToday = c.date === t0, past = c.date < t0, sel = selected?.(c.date);
            const dn = parseIso(c.date)?.getDate();
            return (
              <Pressable key={i} onPress={() => onDay(c)} style={({ pressed }) => ({ flex: 1, height: cellH, borderRadius: 12, overflow: 'visible', opacity: pressed ? 0.75 : 1,
                backgroundColor: sel ? '#FFF1C9' : isToday ? '#D6F2DC' : 'rgba(255,255,255,0.88)', borderWidth: isToday || sel ? 2 : 1,
                borderColor: sel ? Brand.SunDark : isToday ? '#1D1B1A' : '#F1E7E3' })}
                accessibilityLabel={`${dn}${isToday ? ', today' : ''}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingTop: 5, height: 28 }}>
                  <Txt k="labelLarge" bold color={past ? '#A99D98' : Brand.Ink}>{dn}</Txt>
                </View>
                {c.lanes.map((l, li) => {
                  const prev = prevOf(idx, li), next = days[idx + 1]?.lanes[li];
                  const on = taken(l);
                  const startsHere = on && (!taken(prev) || prev!.key !== l.key);
                  const endsHere = taken(prev) && (!on || prev!.key !== l.key);   // the check-out day of the stay before
                  const goesOn = on && taken(next) && next!.key === l.key;
                  const col = colors[li];
                  const color = (s: string) => (s === 'closed' ? '#CFC6C2' : col);
                  const fade = (s: string) => (s === 'request' ? 0.5 : s === 'platform' || s === 'some' ? 0.65 : 1);
                  const top = 30 + li * (laneH + laneGap);
                  return (
                    <React.Fragment key={li}>
                      {/* the stay before ends here: from the left edge to the middle, then a grey check-out dot */}
                      {endsHere ? <View style={{ position: 'absolute', left: -3, width: '52%', top, height: laneH, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: color(prev!.state), opacity: fade(prev!.state) }} /> : null}
                      {endsHere ? <View style={{ position: 'absolute', left: '50%', marginLeft: -2, top: top - 2, width: laneH + 5, height: laneH + 4, borderRadius: 5, backgroundColor: CHECKOUT }} /> : null}
                      {/* this night: a full bar, or from the middle when the stay starts here (with a dot) */}
                      {on ? <View style={{ position: 'absolute', left: startsHere ? '50%' : -3, right: goesOn || !startsHere ? -3 : -3, top, height: laneH,
                        borderTopLeftRadius: startsHere ? 3 : 0, borderBottomLeftRadius: startsHere ? 3 : 0, backgroundColor: color(l.state), opacity: fade(l.state) }} /> : null}
                      {startsHere ? <View style={{ position: 'absolute', left: '50%', marginLeft: endsHere ? 6 : -2, top: top - 2, width: laneH + 5, height: laneH + 4, borderRadius: 5, backgroundColor: l.state === 'closed' ? '#A99D98' : col === '#F2C94C' ? '#D8A80F' : col, borderWidth: 1, borderColor: '#fff' }} /> : null}
                    </React.Fragment>
                  );
                })}
                {c.extra ? <Txt k="labelSmall" color={Brand.Muted} style={{ position: 'absolute', right: 5, top: 7, fontSize: 9 }}>{c.extra}</Txt> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Small key under the calendar. */
export const LaneKey = () => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
    {[
      [<View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: '#E35D5D' }} />, 'Check-in'],
      [<View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: CHECKOUT }} />, 'Check-out'],
      [<View style={{ width: 18, height: 5, borderRadius: 3, backgroundColor: '#E35D5D', opacity: 0.5 }} />, 'Request'],
      [<View style={{ width: 18, height: 5, borderRadius: 3, backgroundColor: '#CFC6C2' }} />, 'Closed'],
    ].map(([el, l], i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>{el as React.ReactNode}<Txt k="labelSmall" color={Brand.InkSoft}>{l as string}</Txt></View>)}
  </View>
);

/* ---------- One listing's month: a friendly night calendar ---------- */
export type NightDay = { date: string; state: string; key: string; label?: string | null; price?: string | null };

const bandColor = (s: string, col: string) => (s === 'closed' ? '#CFC6C2' : col);
const shortName = (l?: string | null) => (l || '').replace(/^⏳\s*Request\s*·\s*/u, '').split(/[·,]/)[0].trim().split(' ')[0];

/**
 * A night per cell: the day number, then the night's price when it is free — or a soft coloured ribbon when it is
 * booked (the guest's name where the stay begins), requested (lighter) or closed (grey). Ribbons run on across the
 * week, so a stay reads as one piece.
 */
export function NightMonth({ days, color, onDay, selected }: { days: NightDay[]; color: string; onDay: (d: NightDay) => void; selected?: (date: string) => boolean }) {
  const t0 = today();
  const lead = days.length ? (parseIso(days[0].date)?.getDay() ?? 0) : 0;
  const cells: (NightDay | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const rows: (NightDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const on = (d?: NightDay | null) => !!d && d.state !== 'free';
  const same = (a?: NightDay | null, b?: NightDay | null) => on(a) && on(b) && a!.key === b!.key;
  return (
    <View>
      {rows.map((w, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginBottom: 6 }}>
          {w.map((c, i) => {
            if (!c) return <View key={i} style={{ flex: 1, height: 66 }} />;
            const idx = days.indexOf(c);
            const prev = days[idx - 1], next = days[idx + 1];
            const isToday = c.date === t0, past = c.date < t0, sel = selected?.(c.date);
            const dn = parseIso(c.date)?.getDate();
            const startHere = on(c) && (!same(prev, c) || i === 0);
            const endHere = on(c) && (!same(c, next) || i === 6);
            const fade = c.state === 'request' ? 0.5 : c.state === 'platform' || c.state === 'some' ? 0.7 : 1;
            const freeNow = !on(c) && !past;
            // the picked nights: one red band across the row, rounded at its ends
            const selPrev = !!sel && i > 0 && !!prev && !!selected?.(prev.date);
            const selNext = !!sel && i < 6 && !!next && !!selected?.(next.date);
            return (
              <Pressable key={i} onPress={() => onDay(c)} style={({ pressed }) => ({ flex: 1, height: 66, alignItems: 'center', opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
                accessibilityLabel={`${dn}${isToday ? ', today' : ''}${sel ? ', selected' : ''}${on(c) ? ', ' + (c.state === 'closed' ? 'closed' : c.state === 'request' ? 'request' : 'booked') : c.price ? ', free, ' + c.price : ''}`}>
                {freeNow ? (
                  <View pointerEvents="none" style={{ position: 'absolute', top: 1, bottom: on(c) ? 28 : 3, left: selPrev ? 0 : 2, right: selNext ? 0 : 2,
                    backgroundColor: sel ? Brand.Blue : 'rgba(18,140,96,0.07)', borderWidth: sel ? 0 : 1, borderColor: 'rgba(18,140,96,0.16)',
                    borderTopLeftRadius: selPrev ? 0 : 14, borderBottomLeftRadius: selPrev ? 0 : 14, borderTopRightRadius: selNext ? 0 : 14, borderBottomRightRadius: selNext ? 0 : 14 }} />
                ) : null}
                <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4,
                  backgroundColor: sel && !freeNow ? Brand.Sun : isToday && !sel ? '#fff' : 'transparent', borderWidth: isToday && !sel ? 2 : 0, borderColor: Brand.Blue }}>
                  <Txt k="titleSmall" color={sel ? (freeNow ? '#fff' : '#4A3400') : isToday ? Brand.Blue : past ? '#BDB3AE' : Brand.Ink}>{dn}</Txt>
                </View>
                {on(c) ? (
                  <View style={{ alignSelf: 'stretch', height: 22, marginTop: 4, marginLeft: startHere ? 3 : 0, marginRight: endHere ? 3 : 0, justifyContent: 'center',
                    backgroundColor: bandColor(c.state, color), opacity: past ? fade * 0.55 : fade,
                    borderTopLeftRadius: startHere ? 11 : 0, borderBottomLeftRadius: startHere ? 11 : 0, borderTopRightRadius: endHere ? 11 : 0, borderBottomRightRadius: endHere ? 11 : 0 }}>
                    {startHere ? <Txt k="labelSmall" color={c.state === 'closed' ? '#5E5450' : '#2B211D'} numberOfLines={1} style={{ paddingLeft: 7, fontSize: 10 }}>
                      {c.state === 'closed' ? 'Closed' : c.state === 'request' ? 'Request' : shortName(c.label) || 'Booked'}
                    </Txt> : null}
                  </View>
                ) : (
                  <Txt k="labelSmall" color={sel ? '#FFE9A8' : past ? '#CFC6C2' : '#128C60'} style={{ marginTop: 6, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>{past ? '' : c.price || (isToday ? 'Today' : 'Free')}</Txt>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** "12 booked · 18 free" with a soft progress bar. */
export function MonthMeter({ days, color }: { days: NightDay[]; color: string }) {
  const open = days.filter((d) => d.state !== 'closed');
  const busy = open.filter((d) => d.state !== 'free').length;
  const pct = open.length ? Math.round((busy / open.length) * 100) : 0;
  return (
    <View style={{ borderRadius: 18, backgroundColor: '#ffffffd9', padding: 12, marginBottom: 12 }}>
      <View style={[st.row, { marginBottom: 8 }]}>
        <Txt k="titleSmall" style={{ flex: 1 }}>🛏️ {busy} booked · {open.length - busy} free{days.length - open.length ? ` · ${days.length - open.length} closed` : ''}</Txt>
        <Txt k="titleSmall" color={Brand.Blue}>{pct}%</Txt>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F3ECE8', overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: color }} /></View>
    </View>
  );
}

export const NightKey = ({ color }: { color: string }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
    {[[color, 1, 'Booked'], [color, 0.5, 'Request'], ['#CFC6C2', 1, 'Closed']].map(([c, o, l]) => (
      <View key={l as string} style={[st.row, { gap: 5, borderRadius: 50, backgroundColor: '#ffffffd9', paddingHorizontal: 10, paddingVertical: 5 }]}>
        <View style={{ width: 16, height: 8, borderRadius: 4, backgroundColor: c as string, opacity: o as number }} /><Txt k="labelSmall" color={Brand.InkSoft}>{l as string}</Txt>
      </View>
    ))}
    <View style={[st.row, { gap: 5, borderRadius: 50, backgroundColor: '#ffffffd9', paddingHorizontal: 10, paddingVertical: 5 }]}><View style={{ width: 14, height: 10, borderRadius: 4, backgroundColor: 'rgba(18,140,96,0.12)', borderWidth: 1, borderColor: 'rgba(18,140,96,0.3)' }} /><Txt k="labelSmall" color="#128C60">Free · price a night</Txt></View>
    <View style={[st.row, { gap: 5, borderRadius: 50, backgroundColor: '#ffffffd9', paddingHorizontal: 10, paddingVertical: 5 }]}><View style={{ width: 14, height: 10, borderRadius: 4, backgroundColor: Brand.Blue }} /><Txt k="labelSmall" color={Brand.InkSoft}>Picked</Txt></View>
  </View>
);
