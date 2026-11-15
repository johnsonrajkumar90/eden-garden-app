// Text boxes, drop-downs, check rows, steppers, segmented switch and the check-in / check-out calendar.
import React, { useMemo, useState } from 'react';
import { KeyboardTypeOptions, Modal, Pressable, ScrollView, StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { Brand, Fonts } from '../theme';
import { Bordered, Gap, Icon, LinkButton, MONTHS, Txt, addDays, isoDate, parseIso, shortDate, st, today } from './kit';

/** The look of every text box: soft white, rounded, a thin line that turns red when you type. */
export function Field({ label, value, onChange, error, lines = 1, keyboard, password, placeholder, style, maxLength, autoCapitalize, onSubmit }: {
  label: string; value: string; onChange: (v: string) => void; error?: string | null; lines?: number; keyboard?: KeyboardTypeOptions; password?: boolean;
  placeholder?: string; style?: StyleProp<ViewStyle>; maxLength?: number; autoCapitalize?: 'none' | 'sentences' | 'words'; onSubmit?: () => void;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={style}>
      <View style={{ borderWidth: 1.5, borderColor: error ? '#B42318' : focus ? Brand.Ink : Brand.Field, borderRadius: 16, backgroundColor: focus ? '#fff' : Brand.Field, paddingHorizontal: 14, paddingTop: 7, paddingBottom: lines > 1 ? 8 : 4 }}>
        <Txt k="labelMedium" color={focus ? Brand.Blue : Brand.Muted}>{label}</Txt>
        <TextInput value={value} onChangeText={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder} placeholderTextColor="#A59C97"
          multiline={lines > 1} numberOfLines={lines} keyboardType={keyboard} secureTextEntry={password} maxLength={maxLength} autoCapitalize={autoCapitalize}
          onSubmitEditing={onSubmit} accessibilityLabel={label} cursorColor={Brand.Blue}
          style={{ fontFamily: Fonts.regular, fontSize: 16, color: Brand.Ink, paddingVertical: 4, minHeight: lines > 1 ? lines * 22 : undefined, textAlignVertical: lines > 1 ? 'top' : 'center' }} />
      </View>
      {error ? <Txt k="bodySmall" color="#B42318" style={{ marginTop: 4, marginLeft: 6 }}>{error}</Txt> : null}
    </View>
  );
}

export function CheckRow({ text, checked, onChange, note }: { text: string; checked: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={[st.row, { paddingVertical: 6, alignItems: 'flex-start' }]} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <Icon name={checked ? 'check-box' : 'check-box-outline-blank'} color={checked ? Brand.Blue : Brand.Muted} size={24} />
      <View style={{ flex: 1, marginLeft: 10 }}><Txt>{text}</Txt>{note ? <Txt k="bodySmall" color={Brand.Muted}>{note}</Txt> : null}</View>
    </Pressable>
  );
}

/** A drop-down of (value, label) options: a list sheet with the chosen one ticked. */
export function Choice({ label, value, options, onChange, style }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; style?: StyleProp<ViewStyle> }) {
  const [open, setOpen] = useState(false);
  const shown = options.find(([v]) => v === value)?.[1] ?? value;
  return (
    <View style={style}>
      <Pressable onPress={() => setOpen(true)} style={[st.row, { borderWidth: 1.5, borderColor: Brand.Field, borderRadius: 16, backgroundColor: Brand.Field, paddingHorizontal: 14, paddingVertical: 8 }]} accessibilityRole="button" accessibilityLabel={label}>
        <View style={{ flex: 1 }}><Txt k="labelMedium" color={Brand.Muted}>{label}</Txt><Txt k="bodyLarge">{shown || 'Choose'}</Txt></View>
        <Icon name="arrow-drop-down" color={Brand.Muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingVertical: 8, maxHeight: '75%' }}>
            <Txt k="titleMedium" style={{ paddingHorizontal: 18, paddingVertical: 10 }}>{label}</Txt>
            <ScrollView>
              {options.map(([v, l]) => (
                <Pressable key={v} onPress={() => { onChange(v); setOpen(false); }} style={[st.row, { paddingHorizontal: 18, paddingVertical: 12 }]}>
                  <Txt k="bodyLarge" semi={v === value} color={v === value ? Brand.Blue : Brand.Ink} style={{ flex: 1 }}>{l}</Txt>
                  {v === value ? <Icon name="done" color={Brand.Blue} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Segmented({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={[st.row, { borderWidth: 1, borderColor: Brand.Line, borderRadius: 50, overflow: 'hidden', backgroundColor: '#fff' }]}>
      {options.map(([v, l], i) => (
        <Pressable key={v} onPress={() => onChange(v)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: v === value ? Brand.Ink : '#fff', borderLeftWidth: i ? 1 : 0, borderLeftColor: Brand.Line }}>
          <Txt k="labelLarge" color={v === value ? '#fff' : Brand.InkSoft} numberOfLines={1}>{l}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

export function Stepper({ label, value, onChange, min = 0, max = 20, note }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; note?: string }) {
  const btn = (icon: string, on: boolean, f: () => void, a: string) => (
    <Pressable onPress={f} disabled={!on} accessibilityLabel={a} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: on ? '#fff' : Brand.Field, borderWidth: 1, borderColor: on ? '#DAD7D2' : Brand.Field, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={on ? Brand.Ink : Brand.Muted} size={20} /></Pressable>
  );
  return (
    <View style={[st.row, { paddingVertical: 4 }]}>
      <View style={{ flex: 1 }}><Txt k="titleSmall">{label}</Txt>{note ? <Txt k="bodySmall" color={Brand.Muted}>{note}</Txt> : null}</View>
      {btn('remove', value > min, () => onChange(value - 1), 'Less')}
      <Txt k="titleMedium" center style={{ width: 40 }}>{value}</Txt>
      {btn('add', value < max, () => onChange(value + 1), 'More')}
    </View>
  );
}

/** One month of days to tap: a start and an end (or one day). No past dates unless allowPast. */
export function Calendar({ start, end, onPick, single, allowPast }: { start: string; end: string; onPick: (a: string, b: string) => void; single?: boolean; allowPast?: boolean }) {
  const first = parseIso(start) || new Date();
  const [month, setMonth] = useState(new Date(first.getFullYear(), first.getMonth(), 1));
  const t = today();
  const days = useMemo(() => {
    const out: (string | null)[] = [];
    const lead = month.getDay();
    for (let i = 0; i < lead; i++) out.push(null);
    const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= n; d++) out.push(isoDate(new Date(month.getFullYear(), month.getMonth(), d)));
    return out;
  }, [month]);
  const tap = (d: string) => {
    if (single) return onPick(d, d);
    if (!start || (start && end) || d <= start) onPick(d, '');
    else onPick(start, d);
  };
  return (
    <View>
      <View style={[st.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ padding: 8 }} accessibilityLabel="Previous month"><Icon name="chevron-left" /></Pressable>
        <Txt k="titleMedium">{MONTHS[month.getMonth()]} {month.getFullYear()}</Txt>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ padding: 8 }} accessibilityLabel="Next month"><Icon name="chevron-right" /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Txt key={i} k="labelSmall" center color={Brand.Muted} style={{ flex: 1 }}>{d}</Txt>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {days.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 42 }} />;
          const off = !allowPast && d < t;
          const edge = d === start || d === end;
          const inside = start && end && d > start && d < end;
          return (
            <Pressable key={i} disabled={off} onPress={() => tap(d)} style={{ width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: inside ? Brand.Sky : 'transparent' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: edge ? Brand.Blue : 'transparent' }}>
                <Txt k="bodyMedium" color={off ? '#C9C1BB' : edge ? '#fff' : Brand.Ink} semi={edge}>{Number(d.slice(8))}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A "Check-in → Check-out" field that opens a date-range calendar (no past dates). */
export function DateRangeField({ checkIn, checkOut, onChange, label = 'Dates', style }: { checkIn: string; checkOut: string; onChange: (a: string, b: string) => void; label?: string; style?: StyleProp<ViewStyle> }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(checkIn); const [b, setB] = useState(checkOut);
  return (
    <>
      <Bordered style={style} onPress={() => { setA(checkIn); setB(checkOut); setOpen(true); }}>
        <View style={st.row}>
          <Icon name="calendar-month" color={Brand.Teal} size={20} />
          <View style={{ marginLeft: 10 }}>
            <Txt k="bodySmall" color={Brand.Muted}>{label}</Txt>
            <Txt k="titleSmall">{checkIn ? `${shortDate(checkIn)} → ${checkOut ? shortDate(checkOut) : '…'}` : 'Add dates'}</Txt>
          </View>
        </View>
      </Bordered>
      <DateRangeSheet open={open} start={a} end={b} title="Check-in and check-out" onClose={() => setOpen(false)}
        onPick={(x, y) => { setA(x); setB(y); }} onDone={() => { if (a) { onChange(a, b && b > a ? b : addDays(a, 1)); } setOpen(false); }} />
    </>
  );
}

export function DateRangeSheet({ open, start, end, title, onClose, onPick, onDone, single, allowPast }: { open: boolean; start: string; end: string; title: string; onClose: () => void; onPick: (a: string, b: string) => void; onDone: () => void; single?: boolean; allowPast?: boolean }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28 }}>
          <Txt k="titleLarge">{title}</Txt>
          <Txt k="bodySmall" color={Brand.Muted}>{start ? `${shortDate(start)}${single ? '' : ' → ' + (end ? shortDate(end) : 'pick the last day')}` : single ? 'Pick a day' : 'Pick the first day'}</Txt>
          <Gap />
          <Calendar start={start} end={end} onPick={onPick} single={single} allowPast={allowPast} />
          <View style={[st.row, { justifyContent: 'flex-end', marginTop: 8 }]}>
            <LinkButton text="Cancel" onPress={onClose} color={Brand.InkSoft} />
            <LinkButton text="Done" onPress={onDone} disabled={!start} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
