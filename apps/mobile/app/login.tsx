import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  AppState,
  Linking as RNLinking,
  SafeAreaView,
  Image,
} from 'react-native';
import { BRAND } from '../src/lib/brand';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { typography } from '../src/theme/tokens';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

const AUTH_BRIDGE_ORIGIN = 'https://project1-api.vercel.app';
const API_URL =
  Constants.expoConfig?.extra?.apiUrl || `${AUTH_BRIDGE_ORIGIN}/api/v1`;

function GoogleIcon() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </Svg>
  );
}

function extractParam(url: string | null | undefined, key: string): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const fromQuery = parsed.queryParams?.[key];
    if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
    if (Array.isArray(fromQuery) && fromQuery[0]) return String(fromQuery[0]);
  } catch (_) {}
  const re = new RegExp(`[?#&]${key}=([^&]+)`, 'i');
  const match = String(url).match(re);
  return match ? decodeURIComponent(match[1]) : null;
}

async function resolveIdTokenFromAuthUrl(url: string): Promise<string | null> {
  const ticket = extractParam(url, 'ticket');
  if (ticket) {
    const res = await axios.get(`${API_URL}/auth/google/mobile-ticket/${encodeURIComponent(ticket)}`, {
      timeout: 15000,
    });
    return res.data?.data?.idToken || null;
  }
  return extractParam(url, 'id_token');
}

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogleIdToken, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const finishingRef = useRef(false);

  const returnUrl = useMemo(() => Linking.createURL('oauth'), []);
  /** Server PKCE start — avoids client-side state that caused Google "Bad Request". */
  const bridgeUrl = useMemo(() => {
    const params = new URLSearchParams({
      scheme: 'lifelink',
      return_url: returnUrl,
    });
    return `${AUTH_BRIDGE_ORIGIN}/api/v1/auth/google/mobile-start?${params.toString()}`;
  }, [returnUrl]);

  useEffect(() => {
    // Clear any stale session so OAuth handoff starts clean — do not block UI.
    void logout();
  }, [logout]);

  const completeWithToken = async (idToken: string) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loginWithGoogleIdToken(idToken, 'PATIENT');
      try {
        await WebBrowser.dismissBrowser();
      } catch (_) {}
      try {
        await WebBrowser.dismissAuthSession();
      } catch (_) {}
      router.replace('/(tabs)');
    } catch (err: any) {
      finishingRef.current = false;
      Alert.alert(
        'Sign-in failed',
        err.response?.data?.error?.message || err.message || 'Could not verify Google account'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const completeWithAuthUrl = async (url: string) => {
    if (finishingRef.current) return;
    try {
      setIsLoading(true);
      const idToken = await resolveIdTokenFromAuthUrl(url);
      if (!idToken) {
        setIsLoading(false);
        Alert.alert('Almost there', 'No sign-in ticket returned. Close the browser and tap Continue again.');
        return;
      }
      await completeWithToken(idToken);
    } catch (err: any) {
      finishingRef.current = false;
      setIsLoading(false);
      Alert.alert(
        'Sign-in failed',
        err.response?.data?.error?.message || err.message || 'Could not finish Google sign-in'
      );
    }
  };

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (extractParam(url, 'ticket') || extractParam(url, 'id_token')) {
        void completeWithAuthUrl(url);
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Linking.getInitialURL().then((url) => {
          if (url && (extractParam(url, 'ticket') || extractParam(url, 'id_token'))) {
            void completeWithAuthUrl(url);
          }
        });
      }
    });
    return () => {
      sub.remove();
      appSub.remove();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    finishingRef.current = false;
    setIsLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(bridgeUrl, returnUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
        createTask: false,
      } as any);

      if (result.type === 'success' && result.url) {
        await completeWithAuthUrl(result.url);
        return;
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setIsLoading(false);
        return;
      }
      await RNLinking.openURL(bridgeUrl);
      Alert.alert(
        'Finish in browser',
        'Complete Google Sign-In, then tap “Open GetMyHospital” if the app does not return automatically.'
      );
      setIsLoading(false);
    } catch (err: any) {
      Alert.alert('Google Sign-In', err?.message || 'Could not open Google sign-in');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>

        <View style={styles.heroCard}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
            accessibilityLabel={BRAND.name}
          />
          <Text style={styles.brandSub}>{BRAND.tagline}</Text>
          <Text style={styles.heroLine}>
            Secure patient access for real-time ICU beds, ABHA linkage, and hospital triage.
          </Text>
        </View>

        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Use your Google account. After Success, the app opens with a short secure ticket.
        </Text>

        <View style={styles.card}>
          <View style={styles.lockRow}>
            <Lock size={14} color="#059669" />
            <Text style={styles.lockText}>Encrypted session · ABDM-ready</Text>
          </View>

          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={({ pressed }) => [styles.googleButton, (pressed || isLoading) && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {isLoading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <View style={styles.gIcon}>
                  <GoogleIcon />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.helper}>
            After Google Success, tap Open GetMyHospital — Expo will finish sign-in on a secure handoff screen.
          </Text>
        </View>

        <View style={styles.setupBox}>
          <Text style={styles.setupTitle}>If Google fails</Text>
          <Text style={styles.setupHint}>
            Reload Expo (shake → Reload), then try again. After Success, tap Open GetMyHospital if the app does not return automatically.
          </Text>
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={14} color="#3F7A1E" />
          <Text style={styles.footerText}>{BRAND.name} · Google OAuth · Expo Go</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },
  heroLogo: {
    width: '100%',
    height: 64,
    backgroundColor: 'transparent',
  },
  brandSub: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: '800',
    color: '#0B3D1A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroLine: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  title: {
    marginTop: 22,
    fontFamily: typography.fontFamilies.display,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
  card: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  lockText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  googleButton: {
    height: 54,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  gIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  helper: { marginTop: 12, fontSize: 12, lineHeight: 17, color: '#94A3B8', textAlign: 'center' },
  setupBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  setupTitle: { fontSize: 12, fontWeight: '800', color: '#1E3A8A', marginBottom: 6 },
  setupHint: { fontSize: 11, lineHeight: 16, color: '#1E40AF' },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
  },
  footerText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
});
