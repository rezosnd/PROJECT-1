import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { colors, typography } from '../src/theme/tokens';
import { Stethoscope } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const AUTH_BRIDGE = 'https://project1-api.vercel.app';
const API_URL = Constants.expoConfig?.extra?.apiUrl || `${AUTH_BRIDGE}/api/v1`;
const APP_SCHEME = 'gmhdoctor';

function extractParam(url: string | null | undefined, key: string): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams?.[key];
    if (typeof q === 'string' && q) return q;
    if (Array.isArray(q) && q[0]) return String(q[0]);
  } catch {
    /* ignore */
  }
  const m = String(url).match(new RegExp(`[?#&]${key}=([^&]+)`, 'i'));
  return m ? decodeURIComponent(m[1]) : null;
}

function randomHandoffId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

export default function DoctorLogin() {
  const router = useRouter();
  const { loginWithGoogleIdToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const finishing = useRef(false);
  const pollStop = useRef<null | (() => void)>(null);
  const activeHandoff = useRef<string | null>(null);

  // Must match Android intent / Custom Tabs return URL for release APKs
  const returnUrl = useMemo(() => Linking.createURL('oauth'), []);

  const finish = async (idToken: string) => {
    if (finishing.current) return;
    finishing.current = true;
    pollStop.current?.();
    pollStop.current = null;
    setLoading(true);
    try {
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        /* ignore */
      }
      await loginWithGoogleIdToken(idToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Doctor sign-in failed',
        err?.response?.data?.error?.message || err.message || 'Not registered as doctor'
      );
      finishing.current = false;
    } finally {
      setLoading(false);
    }
  };

  const completeFromUrl = async (url: string) => {
    const ticket = extractParam(url, 'ticket');
    const idToken = extractParam(url, 'id_token');
    if (ticket) {
      const res = await axios.get(`${API_URL}/auth/google/mobile-ticket/${encodeURIComponent(ticket)}`, {
        timeout: 15000,
      });
      if (res.data?.data?.idToken) await finish(res.data.data.idToken);
      return;
    }
    if (idToken) await finish(idToken);
  };

  const startHandoffPoll = (handoff: string) => {
    pollStop.current?.();
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped || finishing.current) return;
      if (Date.now() - started > 90_000) return;
      try {
        const res = await axios.get(
          `${API_URL}/auth/google/mobile-handoff/${encodeURIComponent(handoff)}`,
          { timeout: 8000, validateStatus: () => true }
        );
        if (res.status === 200 && res.data?.data?.ticket) {
          const ticket = res.data.data.ticket as string;
          const tok = await axios.get(
            `${API_URL}/auth/google/mobile-ticket/${encodeURIComponent(ticket)}`,
            { timeout: 15000 }
          );
          if (tok.data?.data?.idToken) {
            await finish(tok.data.data.idToken);
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (!stopped && !finishing.current) {
        setTimeout(tick, 1500);
      }
    };
    pollStop.current = () => {
      stopped = true;
    };
    setTimeout(tick, 1200);
  };

  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => {
      if (url && (url.includes('ticket=') || url.includes('id_token='))) {
        void completeFromUrl(url);
      }
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) onUrl({ url });
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && activeHandoff.current && !finishing.current) {
        startHandoffPoll(activeHandoff.current);
      }
    });
    return () => {
      sub.remove();
      appSub.remove();
      pollStop.current?.();
    };
  }, []);

  const signIn = async () => {
    setLoading(true);
    finishing.current = false;
    try {
      const handoff = randomHandoffId();
      activeHandoff.current = handoff;
      // API expects snake_case return_url + scheme (not camelCase returnUrl)
      const params = new URLSearchParams({
        scheme: APP_SCHEME,
        return_url: returnUrl,
        handoff,
      });
      const startUrl = `${AUTH_BRIDGE}/api/v1/auth/google/mobile-start?${params.toString()}`;
      startHandoffPoll(handoff);

      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
        createTask: false,
      } as any);

      if (finishing.current) return;

      if (result.type === 'success' && result.url) {
        await completeFromUrl(result.url);
        return;
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        try {
          const res = await axios.get(
            `${API_URL}/auth/google/mobile-handoff/${encodeURIComponent(handoff)}`,
            { timeout: 8000, validateStatus: () => true }
          );
          if (res.status === 200 && res.data?.data?.ticket) {
            const tok = await axios.get(
              `${API_URL}/auth/google/mobile-ticket/${encodeURIComponent(res.data.data.ticket)}`,
              { timeout: 15000 }
            );
            if (tok.data?.data?.idToken) {
              await finish(tok.data.data.idToken);
              return;
            }
          }
        } catch {
          /* ignore */
        }
      }
    } catch (err: any) {
      Alert.alert('Sign-in error', err.message || 'Try again');
    } finally {
      if (!finishing.current) setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.badge}>
          <Stethoscope color={colors.forest} size={16} />
          <Text style={styles.badgeText}>DOCTOR APP</Text>
        </View>
        <Text style={styles.title}>Scan. Refer. Hold.</Text>
        <Text style={styles.sub}>
          Ask the patient for their Care QR in GetMyHospital. Scan to see full clinical details,
          insurance, and refer them to another hospital or department with a 15-minute bed hold.
        </Text>
      </View>

      <Pressable style={styles.btn} onPress={signIn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.forest} />
        ) : (
          <Text style={styles.btnText}>Sign in with Google</Text>
        )}
      </Pressable>
      <Text style={styles.hint}>
        Sign in with a Gmail that City Admin or Hospital Admin pre-registered as DOCTOR.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forest, padding: 24, justifyContent: 'space-between' },
  hero: { marginTop: 48 },
  logo: { width: 72, height: 72, marginBottom: 20 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: { ...typography.caption, color: colors.forest, fontWeight: '800' },
  title: { ...typography.display, color: '#fff', marginBottom: 12 },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 22 },
  btn: {
    backgroundColor: colors.lime,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { ...typography.title, color: colors.forest, fontSize: 17 },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
});
