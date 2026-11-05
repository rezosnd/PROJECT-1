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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { typography } from '../src/theme/tokens';
import { ArrowLeft, ShieldCheck, Activity, Lock } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

const AUTH_BRIDGE_ORIGIN = 'https://project1-api.vercel.app';

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

function extractIdToken(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const fromQuery = (parsed.queryParams?.id_token as string) || null;
    if (fromQuery) return fromQuery;
  } catch (_) {}
  const match = String(url).match(/[?#&]id_token=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogleIdToken, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const finishingRef = useRef(false);

  const returnUrl = useMemo(() => Linking.createURL('oauth'), []);
  const bridgeUrl = useMemo(() => {
    const params = new URLSearchParams({
      scheme: 'lifelink',
      return_url: returnUrl,
      auto: '0',
    });
    return `${AUTH_BRIDGE_ORIGIN}/api/v1/auth/google/mobile?${params.toString()}`;
  }, [returnUrl]);

  useEffect(() => {
    logout();
  }, []);

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

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const idToken = extractIdToken(url);
      if (idToken) void completeWithToken(idToken);
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Linking.getInitialURL().then((url) => {
          const idToken = extractIdToken(url);
          if (idToken) void completeWithToken(idToken);
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
        createTask: true,
      } as any);

      if (result.type === 'success') {
        const idToken = extractIdToken(result.url);
        if (!idToken) {
          Alert.alert('Almost there', 'No token returned. Close the browser and tap Continue again.');
          setIsLoading(false);
          return;
        }
        await completeWithToken(idToken);
        return;
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setIsLoading(false);
        return;
      }
      await RNLinking.openURL(bridgeUrl);
      Alert.alert('Finish in browser', 'Complete Google Sign-In, then return to Expo Go / LifeLink.');
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
          <View style={styles.logoMark}>
            <Activity size={22} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.brand}>LifeLink</Text>
          <Text style={styles.brandSub}>Emergency Health Grid</Text>
          <Text style={styles.heroLine}>
            Secure patient access for real-time ICU beds, ABHA linkage, and hospital triage.
          </Text>
        </View>

        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Use your Google account. Works with Expo Go over HTTPS — no LAN IP origins.
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
            On the next screen, tap Google → choose your Gmail → return to the app.
          </Text>
        </View>

        <View style={styles.setupBox}>
          <Text style={styles.setupTitle}>Still “Access blocked”?</Text>
          <Text style={styles.setupHint}>
            Google Cloud → Web client:{'\n'}
            • JS origin{'\n'}
            <Text style={styles.code}>{AUTH_BRIDGE_ORIGIN}</Text>
            {'\n'}
            • Redirect URI{'\n'}
            <Text style={styles.code}>
              {AUTH_BRIDGE_ORIGIN}/api/v1/auth/google/mobile-callback
            </Text>
            {'\n'}
            • Consent → Testing → add your Gmail as Test user{'\n'}
            • Vercel env: GOOGLE_CLIENT_SECRET = Web client secret
          </Text>
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={14} color="#059669" />
          <Text style={styles.footerText}>Google OAuth · JWT · Expo Go</Text>
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
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 22,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: {
    fontFamily: typography.fontFamilies.display,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  brandSub: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroLine: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#CBD5E1',
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
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
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
