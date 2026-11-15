/*
 * Sign in and sign up inside the app (no web pages): email + password, a 6-digit code by email (or SMS), new accounts
 * with the emailed confirmation code, and "forgot password". Google sign-in uses the website's Google page.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { Api, ApiError, errorText } from '../core/api';
import { AppState } from '../core/state';
import { str, text } from '../core/json';
import { Brand, Fonts, RedBar } from '../theme';
import { Gap, Icon, LinkButton, Notice, OutlineButton, PrimaryButton, Press, Txt, st } from '../ui/kit';
import { Field } from '../ui/inputs';
import { Nav, useParams } from '../nav';
import { handleIncomingLink } from '../links';

type Step = 'SignIn' | 'SignUp' | 'Code' | 'AskCode' | 'CheckEmail' | 'Forgot' | 'ForgotSent';

export default function AuthScreen({ startSignUp }: { startSignUp?: boolean }) {
  const p = useParams();
  const [step, setStep] = useState<Step>(startSignUp || p.signup ? 'SignUp' : 'SignIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [codeTarget, setCodeTarget] = useState('');
  const [codePurpose, setCodePurpose] = useState('login');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  const go = (s: Step) => { setStep(s); setErr(null); setInfo(null); setFieldErr({}); };
  useEffect(() => { const m = AppState.get().authMessage; if (m) { setErr(m); AppState.set({ authMessage: null }); } }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (step === 'SignIn' || step === 'SignUp') return false; go('SignIn'); return true; });
    return () => sub.remove();
  }, [step]);

  const done = () => Nav.back();
  /** An older website without the app sign-in answers: say so (the app never opens web pages). */
  const webFallback = (e: unknown, title: string) => {
    if (e instanceof ApiError && (e.code === 'not_json' || e.code === 'login_required' || e.status === 404 || e.status === 405)) {
      setErr(`${title} isn't available in the app right now — please try again later or sign in with your password.`); return true;
    }
    return false;
  };
  const run = async (block: () => Promise<void>) => {
    setBusy(true); setErr(null); setInfo(null);
    try { await block(); } catch (e) { setErr(errorText(e)); if (e instanceof ApiError) setFieldErr(e.errors); }
    setBusy(false);
  };
  const codeSent = (r: any, fallback: string, purpose: string, msg: (shown: string) => string) => {
    setCodeTarget(text(r, 'target', text(r, 'email', fallback))); setCodePurpose(purpose); setCode('');
    go('Code'); setInfo(msg(text(r, 'shown', fallback)));
  };
  const sendCode = (target: string) => run(async () => {
    try { const r = await Api.postSite('login/code', { id: target.trim() }); codeSent(r, target.trim(), 'login', (s) => `We sent a 6-digit code to ${s}.`); }
    catch (e) { if (!webFallback(e, 'Sign in')) throw e; }
  });
  const signIn = () => run(async () => {
    try { await Api.signIn(email, password); done(); } catch (e) {
      if (e instanceof ApiError && e.code === 'unconfirmed') {   // signed up but not confirmed yet: confirm with a code instead
        const r = await Api.postSite('login/code', { id: email.trim() });
        codeSent(r, email.trim(), 'login', (s) => `Please confirm your email first — we sent a 6-digit code to ${s}.`);
      } else throw e;
    }
  });
  const signUp = () => run(async () => {
    try {
      const r = await Api.postSite('signup', { name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      if (r.user) { await Api.refreshSession(); done(); }
      else if (text(r, 'verify') === 'code') {
        const ph = str(r, 'phone_shown');
        codeSent({ target: text(r, 'email', email.trim()), shown: text(r, 'shown', email.trim()) }, email.trim(), 'signup', (s) => `Account created. Enter the 6-digit code we sent to ${s}${ph ? ' and ' + ph : ''}.`);
      } else go('CheckEmail');
    } catch (e) { if (!webFallback(e, 'Sign up')) throw e; }
  });
  const verify = (c = code) => run(async () => {
    await Api.postSite('login/code/verify', { purpose: codePurpose, target: codeTarget, code: c });
    await Api.refreshSession(); done();
  });
  const forgot = () => run(async () => {
    try { const r = await Api.postSite('forgot-password', { email: email.trim() }); go('ForgotSent'); setInfo(text(r, 'message')); }
    catch (e) { if (!webFallback(e, 'Forgot password')) throw e; }
  });
  const google = async () => { const e = await startGoogleSignIn(); if (e) setErr(e); };

  const [title, sub] = ({
    SignIn: ['Welcome back', "Sign in to book, see your trips and look after your pets' stays."],
    SignUp: ['Create your account', 'Book verified stays, resorts and pet services — in a minute.'],
    Code: ['Enter your code', 'Check your email (and SMS) for a 6-digit code.'],
    AskCode: ['Sign in with a code', "No password needed — we'll send you a one-time code."],
    CheckEmail: ['Confirm your email', 'One last step to switch your account on.'],
    Forgot: ['Forgot your password?', "We'll email you a link to choose a new one."],
    ForgotSent: ['Forgot your password?', "We'll email you a link to choose a new one."],
  } as Record<Step, [string, string]>)[step];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <LinearGradient colors={RedBar as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingLeft: 8, paddingRight: 20, paddingTop: 4, paddingBottom: 64 }}>
          <View style={st.row}>
            <Pressable onPress={() => (step === 'SignIn' || step === 'SignUp' ? Nav.back() : go('SignIn'))} style={st.barBtn} accessibilityLabel="Back"><Icon name="arrow-back" color="#fff" /></Pressable>
            <View style={{ flex: 1 }} />
            <Image source={require('../../assets/logo_white.png')} style={{ height: 30, width: 120 }} contentFit="contain" />
          </View>
          <View style={{ paddingLeft: 12, paddingTop: 18 }}>
            <Txt k="headlineMedium" color="#fff">{title}</Txt>
            <Txt color="#FFE0DC" style={{ marginTop: 6 }}>{sub}</Txt>
          </View>
        </LinearGradient>
        <View style={[{ marginTop: -40, marginHorizontal: 16, borderRadius: 24, backgroundColor: '#fff', padding: 20 }, st.shadow]}>
          {step === 'SignIn' || step === 'SignUp' ? (
            <>
              <View style={{ flexDirection: 'row', borderRadius: 50, backgroundColor: Brand.Sky, padding: 4 }}>
                {([['SignIn', 'Sign in'], ['SignUp', 'Create account']] as [Step, string][]).map(([s, l]) => (
                  <Pressable key={s} onPress={() => go(s)} style={{ flex: 1, borderRadius: 50, backgroundColor: step === s ? Brand.Blue : 'transparent', paddingVertical: 11 }}>
                    <Txt k="labelLarge" center color={step === s ? '#fff' : Brand.InkSoft}>{l}</Txt>
                  </Pressable>
                ))}
              </View>
              <Gap h={18} />
            </>
          ) : null}
          {info ? <><Notice text={info} tone="ok" /><Gap /></> : null}
          {err ? <><Notice text={err} tone="bad" /><Gap /></> : null}

          {step === 'SignIn' ? (
            <>
              <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" autoCapitalize="none" error={fieldErr.email} />
              <Gap />
              <Field label="Password" value={password} onChange={setPassword} password onSubmit={() => email.includes('@') && password && signIn()} />
              <Pressable onPress={() => go('Forgot')} style={{ alignSelf: 'flex-end', padding: 6, marginTop: 8 }}><Txt k="titleSmall" color={Brand.Blue}>Forgot password?</Txt></Pressable>
              <Gap h={8} />
              <PrimaryButton text="Sign in" onPress={signIn} disabled={!email.includes('@') || !password} loading={busy} />
              <OrDivider />
              <GoogleButton label="Continue with Google" onPress={google} />
              <Gap h={10} />
              <OutlineButton text="Sign in with a code instead" icon="password" onPress={() => go('AskCode')} />
              <Gap h={14} />
              <View style={[st.row, { justifyContent: 'center' }]}>
                <Txt color={Brand.InkSoft}>New to TripArro? </Txt>
                <Txt k="titleSmall" color={Brand.Blue} onPress={() => go('SignUp')}>Create an account</Txt>
              </View>
            </>
          ) : step === 'SignUp' ? (
            <>
              <Field label="Full name" value={name} onChange={setName} autoCapitalize="words" error={fieldErr.name} />
              <Gap />
              <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" autoCapitalize="none" error={fieldErr.email} />
              <Gap />
              <Field label="Mobile number (optional)" value={phone} onChange={setPhone} keyboard="phone-pad" error={fieldErr.phone} />
              <Gap />
              <Field label="Password" value={password} onChange={setPassword} password error={fieldErr.password} placeholder="At least 8 characters" onSubmit={signUp} />
              <Gap h={16} />
              <PrimaryButton text="Create account" onPress={signUp} disabled={!name.trim() || !email.includes('@') || password.length < 8} loading={busy} />
              <OrDivider />
              <GoogleButton label="Sign up with Google" onPress={google} />
              <Gap />
              <Txt k="bodySmall" color={Brand.Muted} center>By creating an account you agree to TripArro's privacy and cancellation policies.</Txt>
              <View style={[st.row, { justifyContent: 'center' }]}>
                <LinkButton text="Privacy policy" onPress={() => Nav.navigate('page/privacy')} />
                <LinkButton text="Cancellation policy" onPress={() => Nav.navigate('page/cancellation')} />
              </View>
              <View style={[st.row, { justifyContent: 'center' }]}>
                <Txt color={Brand.InkSoft}>Already have an account? </Txt>
                <Txt k="titleSmall" color={Brand.Blue} onPress={() => go('SignIn')}>Sign in</Txt>
              </View>
            </>
          ) : step === 'AskCode' ? (
            <>
              <Field label="Email or mobile number" value={email} onChange={setEmail} keyboard="email-address" autoCapitalize="none" onSubmit={() => email.trim() && sendCode(email)} />
              <Gap h={16} />
              <PrimaryButton text="Send my code" onPress={() => sendCode(email)} disabled={!email.trim()} loading={busy} />
              <Gap h={6} />
              <LinkButton text="Use my password instead" onPress={() => go('SignIn')} />
            </>
          ) : step === 'Code' ? (
            <>
              <CodeBoxes code={code} onChange={(c) => { const v = c.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6 && !busy) verify(v); }} />
              <Gap h={18} />
              <PrimaryButton text={codePurpose === 'signup' ? 'Confirm and continue' : 'Sign in'} onPress={() => verify()} disabled={code.length !== 6} loading={busy} />
              <Gap h={6} />
              <View style={[st.row, { justifyContent: 'center' }]}>
                <Txt color={Brand.InkSoft}>Didn't get it? </Txt>
                <LinkButton text="Send a new code" onPress={() => sendCode(codeTarget)} disabled={busy} />
              </View>
              <Txt k="bodySmall" color={Brand.Muted} center>Codes work for 10 minutes. Check your spam folder too.</Txt>
            </>
          ) : step === 'CheckEmail' ? (
            <>
              <View style={{ alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: Brand.Sky, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="mark-email-read" color={Brand.Blue} size={30} />
              </View>
              <Gap />
              <Txt center color={Brand.InkSoft}>We emailed a link to {email.trim()}. Open it to switch your account on, then sign in here.</Txt>
              <Gap h={16} />
              <PrimaryButton text="Open my email app" onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'message://' : 'mailto:').catch(() => {})} />
              <Gap h={8} />
              <OutlineButton text="I've confirmed — sign in" onPress={() => go('SignIn')} />
            </>
          ) : step === 'Forgot' ? (
            <>
              <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" autoCapitalize="none" onSubmit={() => email.includes('@') && forgot()} />
              <Gap h={16} />
              <PrimaryButton text="Email me a reset link" onPress={forgot} disabled={!email.includes('@')} loading={busy} />
              <Gap h={6} />
              <LinkButton text="Back to sign in" onPress={() => go('SignIn')} />
            </>
          ) : (
            <>
              <Txt color={Brand.InkSoft}>Open the link in the email to choose a new password, then sign in here with it.</Txt>
              <Gap h={16} />
              <PrimaryButton text="Back to sign in" onPress={() => go('SignIn')} />
            </>
          )}
        </View>
        <Txt k="bodySmall" color={Brand.Muted} center style={{ marginTop: 16, marginBottom: 24, paddingHorizontal: 24 }}>Guests, hosts, resort owners, pet hosts and partners use the same sign-in.</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OrDivider() {
  return (
    <View style={[st.row, { paddingVertical: 16 }]}>
      <View style={{ flex: 1, height: 1, backgroundColor: Brand.Line }} />
      <Txt k="bodySmall" color={Brand.Muted}>  or  </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: Brand.Line }} />
    </View>
  );
}

/** Six boxes for the one-time code (one hidden text field underneath). */
function CodeBoxes({ code, onChange }: { code: string; onChange: (c: string) => void }) {
  const ref = useRef<any>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 300); }, []);
  return (
    <Pressable onPress={() => ref.current?.focus()}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const ch = code[i] || ''; const active = i === code.length;
          return (
            <View key={i} style={{ flex: 1, height: 56, borderRadius: 14, backgroundColor: ch ? Brand.Sky : Brand.Page, borderWidth: active ? 2 : 1, borderColor: active ? Brand.Blue : Brand.Line, alignItems: 'center', justifyContent: 'center' }}>
              <Txt k="headlineSmall">{ch}</Txt>
            </View>
          );
        })}
      </View>
      <TextInput ref={ref} value={code} onChangeText={onChange} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode"
        style={{ position: 'absolute', opacity: 0.01, width: '100%', height: 56, fontFamily: Fonts.regular }} caretHidden accessibilityLabel="6-digit code" />
    </Pressable>
  );
}

/** "Continue with Google": white, with Google's four-colour G. */
export function GoogleButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={[{ alignSelf: 'stretch', height: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.Line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, st.shadow]} accessibilityRole="button" accessibilityLabel={label}>
      <Svg width={20} height={20} viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
      <View style={{ width: 10 }} />
      <Txt k="labelLarge">{label}</Txt>
    </Press>
  );
}

/**
 * Google sign-in: Google's own page in a browser tab; TripArro sends the person back to the app signed in
 * (triparro-app://auth?code=…). Returns an error, or null.
 */
export async function startGoogleSignIn(): Promise<string | null> {
  try {
    const r = await WebBrowser.openAuthSessionAsync(Api.url('auth/google?app=1'), 'triparro-app://auth', { toolbarColor: Brand.Matte, showTitle: true });
    if (r.type === 'success' && r.url) handleIncomingLink(r.url);
    return null;
  } catch {
    try { await Linking.openURL(Api.url('auth/google?app=1')); return null; } catch { return 'Could not open Google sign-in on this phone.'; }
  }
}
