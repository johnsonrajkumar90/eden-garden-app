// Privacy policy, cancellation policy, host terms — in the app; and "Delete my account".
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Api, errorText } from '../core/api';
import { useLoader, useSession } from '../core/state';
import { text } from '../core/json';
import * as Notifier from '../core/notifier';
import { Brand } from '../theme';
import { Card, ColorHeader, ErrorBox, Gap, Loading, Notice, PrimaryButton, Txt } from '../ui/kit';
import { CheckRow, Field } from '../ui/inputs';
import { HtmlText } from '../ui/html';
import { Nav, useParams } from '../nav';
import { DOCK_SPACE } from '../ui/dock';

export function PageScreen() {
  const slug = useParams().slug || 'privacy';
  const l = useLoader(() => Api.get(`pages/${slug}`), [slug]);
  const d = l.data;
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title={d ? text(d, 'title') : slug === 'privacy' ? 'Privacy policy' : slug === 'cancellation' ? 'Cancellation policy' : 'Host terms'} onBack={Nav.back} />
      {!d && l.loading ? <Loading /> : !d ? <ErrorBox message={l.error || 'Could not load this page.'} onRetry={l.reload} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }}><Card><HtmlText html={text(d, 'html')} /></Card></ScrollView>
      )}
    </View>
  );
}

/** Delete my account — in the app (the stores require it). Guests only; host and partner accounts are closed by the team. */
export function DeleteAccountScreen() {
  const session = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const u = session?.user;
  return (
    <View style={{ flex: 1 }}>
      <ColorHeader title="Delete my account" sub="This can't be undone." onBack={Nav.back} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: DOCK_SPACE }} keyboardShouldPersistTaps="handled">
        {done ? <><Notice text={done} tone="ok" /><Gap /><PrimaryButton text="Back to TripArro" onPress={() => Nav.home()} /></>
          : !u ? <Notice text="Sign in to delete your account." />
          : u.role !== 'guest' ? <Notice tone="warn" text="Host, resort owner, pet host, partner and admin accounts are closed by the TripArro team so your listings, bookings and payouts are handled properly. Please contact customer care from the Account menu." />
          : (
            <Card>
              <Txt k="titleMedium">What happens</Txt>
              <Txt color={Brand.InkSoft} style={{ marginTop: 6 }}>{'• Your account, profile and saved pets are deleted and you are signed out.\n• Bookings and invoices stay with the host and TripArro for tax and accounting records, without a login.\n• Upcoming bookings are not cancelled — cancel them first from Trips if you need to.'}</Txt>
              <Gap />
              <Field label="Your password" value={password} onChange={setPassword} password />
              <CheckRow text="I understand my account will be deleted" checked={confirm} onChange={setConfirm} />
              {err ? <><Gap h={8} /><Notice text={err} tone="bad" /></> : null}
              <Gap />
              <PrimaryButton text="Delete my account" disabled={!password || !confirm} loading={busy} onPress={async () => {
                setBusy(true); setErr(null);
                try {
                  const r = await Api.post('account/delete', { password, confirm });
                  setDone(text(r, 'message', 'Your account has been deleted.'));
                  await Notifier.reset(); Api.refreshSession().catch(() => {});
                } catch (e) { setErr(errorText(e)); }
                setBusy(false);
              }} />
            </Card>
          )}
      </ScrollView>
    </View>
  );
}
