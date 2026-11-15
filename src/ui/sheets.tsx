// Bottom sheets and dialogs, plus small phone helpers (maps, clipboard, dial, long text).
import React, { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '../theme';
import { LinkButton, Txt, st } from './kit';

/** A sheet that slides up from the bottom (white, rounded top), scrolls when long. */
export function Sheet({ open, onClose, title, children, scroll = true, style }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }} onPress={onClose} accessibilityLabel="Close" />
        <View style={[{ backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%', paddingBottom: insets.bottom + 12 }, style]}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Brand.Line, marginTop: 10, marginBottom: 6 }} />
          {title ? <Txt k="titleLarge" style={{ paddingHorizontal: 18, paddingBottom: 8 }}>{title}</Txt> : null}
          {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>{children}</ScrollView> : <View style={{ paddingHorizontal: 16, flexShrink: 1 }}>{children}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A centred dialog with a title, text and buttons ("Delete", "Cancel"). */
export function Dialog({ open, onClose, title, text, children, actions }: { open: boolean; onClose: () => void; title?: string; text?: string; children?: ReactNode; actions?: [string, () => void, string?][] }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={onClose}>
          <Pressable style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20 }} onPress={() => {}}>
            {title ? <Txt k="titleLarge" style={{ marginBottom: 8 }}>{title}</Txt> : null}
            {text ? <Txt color={Brand.InkSoft}>{text}</Txt> : null}
            {children}
            {actions ? (
              <View style={[st.row, { justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }]}>
                {actions.map(([l, f, c], i) => <LinkButton key={i} text={l} onPress={f} color={c || Brand.Blue} />)}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Long text shortened to a few lines, with "Read more". */
export function ExpandText({ text, lines = 5 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Txt k="bodyLarge" color={Brand.InkSoft} numberOfLines={open ? undefined : lines}>{text}</Txt>
      {text.length > 220 ? <Txt k="titleSmall" color={Brand.Blue} style={{ marginTop: 6 }} onPress={() => setOpen(!open)}>{open ? 'Show less' : 'Read more'}</Txt> : null}
    </View>
  );
}

/** Directions in the phone's maps app (not a website). */
export function openMaps(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  const url = Platform.OS === 'ios' ? `maps:0,0?q=${q}&ll=${lat},${lng}` : `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`).catch(() => {}));
}
export const copyText = (t: string) => Clipboard.setStringAsync(t).catch(() => {});
export const dial = (phone: string) => Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
export const whatsapp = (phone: string, msg = '') => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}${msg ? '?text=' + encodeURIComponent(msg) : ''}`).catch(() => {});
