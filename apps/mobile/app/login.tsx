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
      auto: '1',
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
        err.response?.data?.error?.message || err.message || 'Could not verify Google account with LifeLink API'
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
      // Custom Tabs / SFSafariViewController — not a WebView (avoids disallowed_useragent)
      const result = await WebBrowser.openAuthSessionAsync(bridgeUrl, returnUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
        createTask: true,
      } as any);

      if (result.type === 'success') {
        const idToken = extractIdToken(result.url);
        if (!idToken) {
          Alert.alert(
            'Almost there',
            'Google signed in but no token returned. Close the browser tab and tap Continue again.'
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

      await RNLinking.openURL(bridgeUrl);
      Alert.alert(
        'Finish in browser',
        'Complete Google Sign-In, then return to Expo Go. LifeLink opens automatically.'
      );
      setIsLoading(false);
    } catch (err: any) {
      Alert.alert('Google Sign-In', err?.message || 'Could not open Google');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Activity size={24} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.brand}>LifeLink</Text>
          <Text style={styles.brandSub}>Emergency Health Grid</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Secure access</Text>
          <Text style={styles.cardTitle}>Sign in with Google</Text>
          <Text style={styles.cardDesc}>
            Expo Go uses HTTPS OAuth on project1-api.vercel.app — no LAN IP, no auth.expo.io.
          </Text>

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
                <View style={styles.googleIconWrap}>
                  <GoogleIcon />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <View style={styles.trustRow}>
            <Lock size={12} color="#059669" />
            <Text style={styles.trustText}>OpenID · JWT session · ABDM-ready</Text>
          </View>
        </View>

        <View style={styles.checklist}>
          <Text style={styles.checkTitle}>If Google still says Access blocked</Text>
          <Text style={styles.checkItem}>1. Google Cloud → Web client</Text>
          <Text style={styles.checkItem}>
            2. Redirect URI ={'\n'}
            <Text style={styles.code}>
              {AUTH_BRIDGE_ORIGIN}/api/v1/auth/google/mobile-callback
            </Text>
          </Text>
          <Text style={styles.checkItem}>
            3. JS origin = <Text style={styles.code}>{AUTH_BRIDGE_ORIGIN}</Text>
          </Text>
          <Text style={styles.checkItem}>4. Consent → Testing → add your Gmail as Test user</Text>
          <Text style={styles.checkItem}>
            5. Vercel env: <Text style={styles.code}>GOOGLE_CLIENT_SECRET</Text> = Web client secret
          </Text>
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={14} color="#059669" />
          <Text style={styles.footerText}>Works in Expo Go · Chrome Custom Tabs</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  bgOrbA: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#DBEAFE',
    top: -80,
    left: -60,
    opacity: 0.7,
  },
  bgOrbB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ECFCCB',
    top: 40,
    right: -70,
    opacity: 0.65,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 8 : 28,
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
  hero: { marginTop: 28, marginBottom: 22 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: {
    fontFamily: typography.fontFamilies.display,
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  brandSub: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  cardTitle: {
    marginTop: 8,
    fontFamily: typography.fontFamilies.display,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  cardDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
  googleButton: {
    marginTop: 20,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  trustRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  checklist: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  checkTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  checkItem: { fontSize: 11, lineHeight: 17, color: '#475569', marginBottom: 4 },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
});
