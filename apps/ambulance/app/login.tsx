import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { colors, typography } from '../src/theme/tokens';
import { Ambulance } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://project1-api.vercel.app/api/v1';

function extractParam(url: string | null | undefined, key: string): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams?.[key];
    if (typeof q === 'string' && q) return q;
  } catch {
    /* parse */
  }
  const m = String(url).match(new RegExp(`[?#&]${key}=([^&]+)`, 'i'));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function AmbulanceLogin() {
  const router = useRouter();
  const { loginWithGoogleIdToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const finishing = useRef(false);
  const returnUrl = useMemo(() => Linking.createURL('login'), []);

  const finish = async (idToken: string) => {
    if (finishing.current) return;
    finishing.current = true;
    setLoading(true);
    try {
      await loginWithGoogleIdToken(idToken);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } }; message?: string })
          ?.response?.data?.error?.message ||
        (err as Error).message ||
        'Not registered as ambulance operator';
      Alert.alert('Sign-in failed', message);
      finishing.current = false;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    finishing.current = false;
    try {
      const handoff = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join('');
      const startUrl =
        `${API_URL}/auth/google/mobile-start?` +
        `returnUrl=${encodeURIComponent(returnUrl)}&handoff=${handoff}&clientType=web`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
      if (result.type === 'success' && result.url) {
        const ticket = extractParam(result.url, 'ticket');
        const idToken = extractParam(result.url, 'id_token');
        if (ticket) {
          const res = await axios.get(`${API_URL}/auth/google/mobile-ticket/${ticket}`);
          if (res.data?.data?.idToken) await finish(res.data.data.idToken);
        } else if (idToken) {
          await finish(idToken);
        }
      }
    } catch (err: unknown) {
      Alert.alert('Sign-in error', (err as Error).message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.badge}>
          <Ambulance color={colors.forest} size={16} />
          <Text style={styles.badgeText}>AMBULANCE CREW</Text>
        </View>
        <Text style={styles.title}>Respond. Reach. Rescue.</Text>
        <Text style={styles.sub}>
          Live SOS offers from patients across the city. Accept the nearest emergency in
          first-come-first-serve order, update en-route status, and keep your unit on the map for
          dispatch.
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
        Your email must be pre-registered as AMBULANCE by City Admin (e.g. ambulance1.bbsr@gmail.com
        after seed).
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
