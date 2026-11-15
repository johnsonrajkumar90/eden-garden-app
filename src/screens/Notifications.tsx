// Account → Notifications: booking updates from the website, newest first. Tap one to open it.
import React, { useEffect, useState } from 'react';
import { AppState as RNAppState, FlatList, Linking, Pressable, View } from 'react-native';
import { Api } from '../core/api';
import { useLoader, useSession } from '../core/state';
import { bool, int, objs, text } from '../core/json';
import * as Notifier from '../core/notifier';
import { Brand } from '../theme';
import { ColorHeader, EmptyBox, ErrorBox, Icon, LinkButton, Loading, Txt, dateTime, st } from '../ui/kit';
import { Nav } from '../nav';

export default function NotificationsScreen() {
  const session = useSession();
  const [tick, setTick] = useState(0);
  const [allowed, setAllowed] = useState(true);
  const l = useLoader(async () => (session?.user ? Api.get('notifications', { limit: 50 }) : null), [tick, session?.user?.id]);
  useEffect(() => { if (l.data) Notifier.setUnread(int(l.data, 'unread')); }, [l.data]);
  useEffect(() => {
    const upd = () => Notifier.canPost().then(setAllowed).catch(() => {});
    upd(); const s = RNAppState.addEventListener('change', (st) => st === 'active' && upd()); return () => s.remove();
  }, []);
  const list = objs(l.data, 'items');
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Notifications" sub="Booking updates, check-in and Pet Stay Diary" onBack={Nav.back}
        actions={int(l.data, 'unread') > 0 ? <LinkButton text="Mark all read" color="#fff" onPress={async () => { try { Notifier.setUnread(int(await Api.post('notifications/read', { all: true }), 'unread')); setTick((t) => t + 1); } catch {} }} /> : null} />
      {!session?.user ? <EmptyBox title="Sign in to see your notifications" text="Booking confirmations, check-in news and Pet Stay Diary updates appear here and on your phone." action="Sign in" onAction={() => Nav.navigate('login')} />
        : l.loading && !l.data ? <Loading />
        : l.error ? <ErrorBox message={l.error} onRetry={() => setTick((t) => t + 1)} />
        : (
          <FlatList data={list} keyExtractor={(n) => String(int(n, 'id'))} contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
            ListHeaderComponent={!allowed ? (
              <View style={{ backgroundColor: Brand.WarnSoft, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <View style={st.row}><Icon name="notifications-off" color={Brand.Warn} /><Txt semi>  Phone notifications are off</Txt></View>
                <Txt k="bodySmall" color={Brand.InkSoft}>Turn them on to hear about confirmations, check-in and diary updates even when the app is closed.</Txt>
                <LinkButton text="Turn on notifications" onPress={async () => { const ok = await Notifier.askPermission(); setAllowed(ok); if (!ok) Linking.openSettings().catch(() => {}); }} />
              </View>
            ) : undefined}
            ListEmptyComponent={<EmptyBox title="No notifications yet" text="When you book, we'll let you know here about confirmations, payments, check-in and Pet Stay Diary updates." icon="notifications-none" />}
            renderItem={({ item: n }) => {
              const unread = !bool(n, 'read');
              const icon = ({ checkin: 'login', reminder: 'schedule', message: 'chat-bubble-outline', booking: 'calendar-month' } as Record<string, string>)[text(n, 'kind')] || 'notifications-none';
              return (
                <Pressable onPress={() => {
                  if (unread) Api.post('notifications/read', { id: int(n, 'id') }).then((j) => Notifier.setUnread(int(j, 'unread'))).catch(() => {});
                  const link = text(n, 'link');
                  if (link.startsWith('http') || link.startsWith('/')) Nav.openLink(link); else setTick((t) => t + 1);
                }} style={{ flexDirection: 'row', backgroundColor: unread ? Brand.Sky : '#fff', borderRadius: 14, padding: 14 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={Brand.Blue} /></View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Txt semi={unread}>{text(n, 'title')}</Txt>
                    {text(n, 'body') ? <Txt k="bodySmall" color={Brand.InkSoft} numberOfLines={2}>{text(n, 'body')}</Txt> : null}
                    <Txt k="labelSmall" color={Brand.Muted}>{dateTime(text(n, 'created_at'))}</Txt>
                  </View>
                  {unread ? <View style={{ marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.Coral }} /> : null}
                </Pressable>
              );
            }} />
        )}
    </View>
  );
}
