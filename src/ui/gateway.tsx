// PayU or Razorpay: shown at checkout only when the admin switched both on (Admin → Settings → Payments).
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSession } from '../core/state';
import { J, objs, text } from '../core/json';
import { Brand } from '../theme';
import { Icon, Txt, st } from './kit';

let chosen: string | null = null;
/** The gateway the guest picked (sent with the payment), or null for the site's main one. */
export const chosenGateway = () => chosen;

export function GatewayPicker() {
  const s = useSession();
  const list: J[] = objs((s?.raw as J)?.features || {}, 'gateways');
  const [pick, setPick] = useState<string>(chosen && list.some((g) => text(g, 'key') === chosen) ? chosen : text(list[0], 'key'));
  if (list.length < 2) return null;
  if (chosen !== pick) chosen = pick;
  return (
    <View style={{ marginVertical: 8 }}>
      <Txt k="titleSmall" style={{ marginBottom: 6 }}>Pay with</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {list.map((g) => {
          const k = text(g, 'key'); const on = pick === k;
          return (
            <Pressable key={k} onPress={() => { chosen = k; setPick(k); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={[st.row, { flex: 1, borderRadius: 18, borderWidth: on ? 2 : 1, borderColor: on ? Brand.Ink : Brand.Line, backgroundColor: on ? '#fff' : Brand.Field, padding: 12 }]}>
              <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} color={on ? Brand.Blue : Brand.Muted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Txt k="titleSmall">{text(g, 'label')}</Txt>
                <Txt k="labelSmall" color={Brand.Muted} numberOfLines={2}>{text(g, 'about')}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
