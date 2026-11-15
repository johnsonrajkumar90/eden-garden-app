// PDFs (invoices, manuals), photos (pinch to zoom), diary videos and a pet services receipt — all inside the app.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Api, errorText } from '../core/api';
import { useLoader } from '../core/state';
import { int, num, obj, objs, priceLines, str, text } from '../core/json';
import { Brand } from '../theme';
import { Card, ColorHeader, ErrorBox, Gap, Icon, KeyValue, Loading, PriceTable, Txt, dateTime, money, prettyDate } from '../ui/kit';
import { Nav, useParams } from '../nav';

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(16); };

/** A PDF shown in the app: downloaded with the signed-in session and drawn page by page; share or save it. */
export function PdfScreen() {
  const p = useParams(); const link = p.url || ''; const title = p.title || 'Document';
  const [file, setFile] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { setErr(null); setFile(null); Api.download(link, `doc-${hash(link)}.pdf`).then(setFile).catch((e) => setErr(errorText(e))); }, [link, tick]);
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title={title} onBack={Nav.back} actions={file ? (
        <Pressable onPress={() => Sharing.shareAsync(file, { mimeType: 'application/pdf', dialogTitle: 'Share or save', UTI: 'com.adobe.pdf' }).catch(() => {})} style={{ padding: 10 }} accessibilityLabel="Share or save"><Icon name="share" color="#fff" /></Pressable>
      ) : null} />
      {err ? <ErrorBox message={err} onRetry={() => setTick((t) => t + 1)} /> : !file ? <Loading /> : (
        <Pdf source={{ uri: file }} style={{ flex: 1, backgroundColor: 'transparent' }} trustAllCerts={false} onError={() => setErr('This document could not be shown.')} />
      )}
    </View>
  );
}

/** A photo full screen (Pet Stay Diary, listing photos): pinch to zoom. */
export function PhotoScreen() {
  const p = useParams(); const url = p.url || ''; const title = p.title || '';
  const { width, height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current; const ty = useRef(new Animated.Value(0)).current;
  const cur = useRef({ s: 1, x: 0, y: 0, s0: 1, x0: 0, y0: 0 }).current;
  const pinch = Gesture.Pinch().runOnJS(true)
    .onStart(() => { cur.s0 = cur.s; })
    .onUpdate((e) => { cur.s = Math.max(1, Math.min(5, cur.s0 * e.scale)); scale.setValue(cur.s); })
    .onEnd(() => { if (cur.s <= 1) { cur.x = 0; cur.y = 0; tx.setValue(0); ty.setValue(0); } });
  const pan = Gesture.Pan().runOnJS(true).minPointers(1)
    .onStart(() => { cur.x0 = cur.x; cur.y0 = cur.y; })
    .onUpdate((e) => { if (cur.s > 1) { cur.x = cur.x0 + e.translationX; cur.y = cur.y0 + e.translationY; tx.setValue(cur.x); ty.setValue(cur.y); } });
  const dbl = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(() => { cur.s = cur.s > 1 ? 1 : 2.5; cur.x = 0; cur.y = 0; scale.setValue(cur.s); tx.setValue(0); ty.setValue(0); });
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, dbl)}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}>
          <Image source={{ uri: Api.url(url) }} style={{ width, height: height - 60 }} contentFit="contain" accessibilityLabel={title} />
        </Animated.View>
      </GestureDetector>
      <Pressable onPress={Nav.back} style={{ position: 'absolute', top: 8, left: 8, padding: 10 }} accessibilityLabel="Back"><Icon name="arrow-back" color="#fff" /></Pressable>
      {title ? <Txt color="#fff" center style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>{title}</Txt> : null}
    </GestureHandlerRootView>
  );
}

/** A video from the Pet Stay Diary, played in the app (downloaded with the signed-in session, as diary media is private). */
export function VideoScreen() {
  const url = useParams().url || '';
  const [file, setFile] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { Api.download(url, `video-${hash(url)}.${(url.split('.').pop() || 'mp4').split('?')[0].slice(0, 4)}`).then(setFile).catch((e) => setErr(errorText(e))); }, [url]);
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
      {err ? <Txt color="#fff" center>{err}</Txt> : file ? <Player uri={file} /> : <Loading />}
      <Pressable onPress={Nav.back} style={{ position: 'absolute', top: 8, left: 8, padding: 10 }} accessibilityLabel="Back"><Icon name="arrow-back" color="#fff" /></Pressable>
    </View>
  );
}
function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />;
}

/** The receipt of a pet services booking, made in the app from the booking. */
export function PetReceiptScreen() {
  const ref = useParams().ref || '';
  const l = useLoader(() => Api.get(`pets/bookings/${ref}`), [ref]);
  const b = l.data;
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Receipt" sub={`Pet services · ${ref}`} onBack={Nav.back} />
      {!b && l.loading ? <Loading /> : !b ? <ErrorBox message={l.error || 'Could not load the receipt.'} onRetry={l.reload} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Card>
            <Txt k="titleLarge" color={Brand.Blue}>TripArro</Txt>
            <Txt k="bodySmall" color={Brand.Muted}>Payment receipt</Txt>
            <Gap />
            <KeyValue k="Booking" v={ref} />
            <KeyValue k="Pet host" v={text(obj(b, 'listing'), 'title')} />
            <KeyValue k="Guest" v={text(b, 'guest_name')} />
            <KeyValue k="Pets" v={objs(b, 'pets').map((x) => text(x, 'name')).join(', ')} />
            <KeyValue k={text(b, 'booking_kind') === 'daycare' ? 'Day' : 'Drop-off'} v={prettyDate(str(b, 'check_in'))} />
            <KeyValue k="Pick-up" v={prettyDate(str(b, 'check_out'))} />
            {str(b, 'created_at') ? <KeyValue k="Booked" v={dateTime(str(b, 'created_at'))} /> : null}
            <KeyValue k="Payment" v={text(b, 'payment_label')} />
            <Gap />
            <PriceTable lines={priceLines(b)} total={num(b, 'total')} extra={[['Paid', money(num(b, 'paid'))], ...((num(b, 'balance') || 0) > 0 ? [['Balance', money(num(b, 'balance'))] as [string, string]] : [])]} />
            <Gap />
            <Txt k="bodySmall" color={Brand.Muted}>Paid securely to TripArro. Keep this receipt for your records.</Txt>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}
