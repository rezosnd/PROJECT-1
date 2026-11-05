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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { typography } from '../src/theme/tokens';
import { ArrowLeft, ShieldCheck, Activity } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

/** Always use public HTTPS for Google OAuth (LAN IPs are rejected by Google). */
const AUTH_BRIDGE_ORIGIN = 'https://project1-api.vercel.app';

function GoogleIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </Svg>
  );
}

function resolveApiOrigin(): string {
  const extra = Constants.expoConfig?.extra || {};
  const apiUrl =
    extra.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    `${AUTH_BRIDGE_ORIGIN}/api/v1`;
  return String(apiUrl).replace(/\/api\/v1\/?$/, '');
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
  const apiOrigin = useMemo(() => resolveApiOrigin(), []);
  // Google OAuth always through Vercel HTTPS (valid public TLD)
  const bridgeOrigin = AUTH_BRIDGE_ORIGIN;

  const bridgeUrl = useMemo(() => {
    const params = new URLSearchParams({
      scheme: 'lifelink',
      return_url: returnUrl,
    });
    return `${bridgeOrigin}/api/v1/auth/google/mobile?${params.toString()}`;
  }, [bridgeOrigin, returnUrl]);

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
          Alert.alert(
            'Google Sign-In',
            'Signed in but no token returned. Close the browser and try again.'
          );
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

      // Last resort: open system browser
      await RNLinking.openURL(bridgeUrl);
      Alert.alert(
        'Finish in browser',
        'Complete Google Sign-In, then return to LifeLink. The app opens automatically when done.'
      );
      setIsLoading(false);
    } catch (err: any) {
      Alert.alert('Google Sign-In', err?.message || 'Could not open Google sign-in');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
        <ArrowLeft size={20} color="#0F172A" />
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Activity size={22} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={styles.brand}>LifeLink</Text>
        <Text style={styles.brandSub}>Emergency Health Grid</Text>
      </View>

      <Text style={styles.title}>Sign in with Google</Text>
      <Text style={styles.subtitle}>
        Secure patient login via Gmail. After sign-in, complete your care profile once for faster bed holds.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Continue securely</Text>
        <Text style={styles.cardDesc}>
          Uses HTTPS Google OAuth on {bridgeOrigin.replace('https://', '')} — no LAN IP, no WebView block.
        </Text>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.googleButton,
            (pressed || isLoading) && { opacity: 0.88 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={styles.googleIconWrap}>
                <GoogleIcon />
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.setupBox}>
          <Text style={styles.setupTitle}>Still see Access blocked?</Text>
          <Text style={styles.setupHint}>
            Google Cloud → your Web client:{'\n'}
            • Redirect URI:{'\n'}
            <Text style={styles.code}>
              {bridgeOrigin}/api/v1/auth/google/mobile-callback
            </Text>
            {'\n'}
            • JS origin: <Text style={styles.code}>{bridgeOrigin}</Text>
            {'\n'}
            • OAuth consent → Testing → add your Gmail as Test user{'\n\n'}
            API host: <Text style={styles.code}>{apiOrigin}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ShieldCheck size={14} color="#059669" />
        <Text style={styles.footerText}>Google OAuth · JWT · ABDM-ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 28,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginTop: 28,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brand: {
    fontFamily: typography.fontFamilies.display,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  brandSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: typography.fontFamilies.display,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
  card: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  googleButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  setupBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  setupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  setupHint: {
    fontSize: 11,
    lineHeight: 16,
    color: '#1E40AF',
  },
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
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});
