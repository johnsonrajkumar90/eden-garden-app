// TripArro AI: the travel companion (real stays at live prices, guest limits and extra-guest charges) and the pet services assistant.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Api, errorText } from '../core/api';
import { AppState, useAppState } from '../core/state';
import { J, int, objs, str, text } from '../core/json';
import * as Loc from '../core/location';
import { Brand, Fonts, RedBar } from '../theme';
import { Gap, Icon, OutlineButton, Photo, Press, Txt, st } from '../ui/kit';
import { PropertyCard } from '../ui/cards';
import { PetHostCard } from '../ui/petcards';
import { Nav } from '../nav';

type Msg = { user: boolean; text: string; stays?: J[]; pets?: J[]; exps?: J[]; actions?: J[] };
// the conversations stay while the app is open (switching tabs keeps them)
const store: Record<string, Msg[]> = { travel: [], pets: [] };
const answered = new Set<string>();

export default function AiScreen() {
  const mode = useAppState('aiMode');
  const [, setTick] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<any>>(null);
  const msgs = store[mode];
  const push = (target: Msg[], m: Msg) => { target.push(m); setTick((t) => t + 1); };
  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80); }, [msgs.length, mode, busy]);

  const send = async (q: string) => {
    const question = q.trim(); if (!question || busy) return;
    const target = msgs;
    const history = target.slice(-10).map((m) => ({ role: m.user ? 'user' : 'assistant', content: m.text }));
    push(target, { user: true, text: question });
    setBody(''); setBusy(true);
    try {
      if (mode === 'pets') {
        // "near me": send the phone's position when location is already allowed (never asks on its own here)
        const wantsNear = /\b(near|nearby|close to me|around me|my area|my location)\b/i.test(question);
        let fix: { lat: number; lng: number } | null = null;
        if (wantsNear && (await Loc.hasPermission())) { fix = Loc.lastFix; if (!fix) { const r = await Loc.current(8000, false); if (r.kind === 'found') fix = r; } }
        const r = await Api.post('pets/ai', { message: question, history, ...(fix ? { lat: fix.lat, lng: fix.lng } : {}) });
        push(target, { user: false, text: text(r, 'reply').replace(/\s*\[pet:\d+]/g, ''), pets: objs(r, 'items') });
      } else {
        const r = await Api.post('ai/chat', { messages: [...history, { role: 'user', content: question }] });
        push(target, { user: false, text: text(r, 'reply'), stays: objs(r, 'listings'), pets: objs(r, 'pets'), exps: objs(r, 'experiences'), actions: objs(r, 'actions') });
      }
    } catch (e) { push(target, { user: false, text: errorText(e) }); }
    setBusy(false);
  };
  // Yes / No on something TripArro AI prepared (a booking, a pet host, an enquiry, a charger) — done only after Yes
  const decide = async (code: string, yes: boolean) => {
    if (busy || answered.has(code)) return;
    answered.add(code); setBusy(true);
    const target = msgs;
    try { const r = await Api.post('ai/chat', yes ? { confirm: code } : { cancel: code }); push(target, { user: false, text: text(r, 'reply'), actions: objs(r, 'actions') }); }
    catch (e) { push(target, { user: false, text: errorText(e) }); }
    setBusy(false);
  };

  const ideas = mode === 'pets' ? ['Find dog boarding in Coimbatore', 'Cat-friendly boarding with pickup', 'Boarding for my Labrador under ₹800', 'What should I pack for my dog?']
    : ['A cottage in Ooty for 6 people this weekend', 'How many guests can stay, and what do extra guests cost?', 'Resorts in Munnar under ₹6,000', 'Plan 3 days in Kodaikanal'];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={RedBar as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 }}>
        <View style={st.row}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}><Icon name="auto-awesome" color="#fff" /></View>
          <View style={{ paddingLeft: 10 }}>
            <Txt k="headlineSmall" color="#fff">TripArro AI</Txt>
            <Txt k="bodySmall" color="#FFE0DC">{mode === 'pets' ? 'Verified pet hosts only · not veterinary advice' : 'Real listings at live prices'}</Txt>
          </View>
        </View>
        <Gap />
        <View style={{ flexDirection: 'row', borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.14)', padding: 4 }}>
          {([['travel', 'Stays & trips'], ['pets', 'Pet services']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => AppState.set({ aiMode: k })} style={{ flex: 1, borderRadius: 50, backgroundColor: mode === k ? '#fff' : 'transparent', paddingVertical: 9 }}>
              <Txt k="labelLarge" center color={mode === k ? Brand.Blue : '#fff'}>{l}</Txt>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
      <FlatList ref={list} data={msgs} keyExtractor={(_, i) => mode + i} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ gap: 10 }}>
            <Txt k="titleLarge">{mode === 'pets' ? 'Ask about pet services' : 'How can I help with your trip?'}</Txt>
            <Txt color={Brand.InkSoft}>{mode === 'pets' ? "Tell me the city, dates and your pet — I'll find verified hosts." : 'Ask in your own words — places, dates, guests, budget.'}</Txt>
            {ideas.map((idea) => (
              <Pressable key={idea} onPress={() => send(idea)} style={[st.row, { borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 14 }]}>
                <Icon name={mode === 'pets' ? 'pets' : 'travel-explore'} size={20} color={Brand.Blue} />
                <Txt style={{ flex: 1, paddingHorizontal: 12 }}>{idea}</Txt>
                <Icon name="arrow-forward" size={18} color={Brand.Muted} />
              </Pressable>
            ))}
          </View>
        }
        ListFooterComponent={busy ? (
          <View style={[st.row, { alignSelf: 'flex-start', borderRadius: 20, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 11, marginTop: 12 }]}>
            <ActivityIndicator size="small" color={Brand.Blue} /><Txt color={Brand.InkSoft}>  Thinking…</Txt>
          </View>
        ) : undefined}
        renderItem={({ item: m }: { item: Msg }) => (
          <View style={{ alignItems: m.user ? 'flex-end' : 'flex-start' }}>
            <View style={{ maxWidth: 320, backgroundColor: m.user ? Brand.Blue : '#fff', borderRadius: 20, borderBottomRightRadius: m.user ? 6 : 20, borderBottomLeftRadius: m.user ? 20 : 6, paddingHorizontal: 14, paddingVertical: 11, elevation: m.user ? 0 : 1 }}>
              <Txt color={m.user ? '#fff' : Brand.Ink}>{m.text}</Txt>
            </View>
            {(m.stays || []).slice(0, 5).map((s, i) => <View key={'s' + i} style={{ alignSelf: 'stretch', marginHorizontal: -16 }}><PropertyCard p={s} onPress={() => Nav.navigate(`property/${text(s, 'kind', 'stay')}/${int(s, 'id')}`)} /></View>)}
            {(m.pets || []).slice(0, 5).map((c, i) => <View key={'p' + i} style={{ alignSelf: 'stretch', marginTop: 8 }}><PetHostCard c={c} compact onPress={() => Nav.navigate(`petlisting/${int(c, 'id')}`)} /></View>)}
            {(m.exps || []).slice(0, 3).map((x, i) => (
              <Press key={'x' + i} onPress={() => Nav.openSite(`/services/${int(x, 'id')}/${text(x, 'slug')}`, text(x, 'title'))} style={[st.row, { alignSelf: 'stretch', marginTop: 8, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, padding: 10 }]}>
                <Photo url={str(x, 'image')} corner={14} style={{ width: 84, height: 84 }} label={text(x, 'title')} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Txt k="labelMedium" color={Brand.Muted}>{text(x, 'category')}</Txt>
                  <Txt k="titleSmall" numberOfLines={2}>{text(x, 'title')}</Txt>
                  {text(x, 'location') || text(x, 'place') ? <Txt k="bodySmall" color={Brand.Muted} numberOfLines={1}>{text(x, 'location') || text(x, 'place')}</Txt> : null}
                </View>
              </Press>
            ))}
            {(m.actions || []).map((a, i) => {
              const url = str(a, 'url');
              if (text(a, 'type') === 'confirm') {
                const code = text(a, 'code');
                return (
                  <View key={'a' + i} style={{ marginTop: 8, maxWidth: 320, borderRadius: 18, backgroundColor: Brand.SunSoft, padding: 12 }}>
                    <Txt color={Brand.SunInk}>{text(a, 'summary')}</Txt>
                    {!answered.has(code) ? (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <Pressable disabled={busy} onPress={() => decide(code, true)} style={{ borderRadius: 50, backgroundColor: Brand.Blue, paddingHorizontal: 18, paddingVertical: 10, opacity: busy ? 0.5 : 1 }}><Txt k="labelLarge" color="#fff">{text(a, 'yes', 'Yes')}</Txt></Pressable>
                        <OutlineButton text="No" disabled={busy} onPress={() => decide(code, false)} />
                      </View>
                    ) : null}
                  </View>
                );
              }
              return url ? <OutlineButton key={'a' + i} text={text(a, 'label', 'Open')} onPress={() => Nav.openLink(url)} style={{ marginTop: 6 }} /> : null;
            })}
          </View>
        )} />
      <View style={[st.row, { backgroundColor: '#fff', padding: 12, borderTopWidth: 0.5, borderTopColor: Brand.Line }]}>
        <TextInput value={body} onChangeText={setBody} placeholder={mode === 'pets' ? 'e.g. Boarding for 2 cats in Ooty' : 'Ask TripArro AI…'} placeholderTextColor="#A59C97" multiline cursorColor={Brand.Blue}
          style={{ flex: 1, maxHeight: 110, borderWidth: 1, borderColor: Brand.Line, borderRadius: 24, backgroundColor: Brand.Page, paddingHorizontal: 16, paddingVertical: 11, fontFamily: Fonts.regular, fontSize: 15, color: Brand.Ink }} accessibilityLabel="Ask TripArro AI" />
        <Pressable onPress={() => send(body)} disabled={!body.trim() || busy} style={{ marginLeft: 8, width: 48, height: 48, borderRadius: 24, backgroundColor: !body.trim() || busy ? '#E6DCD3' : Brand.CoralDark, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Send">
          <Icon name="send" color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
