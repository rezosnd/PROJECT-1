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
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

const AUTH_BRIDGE_ORIGIN = 'https://project1-api.vercel.app';
const API_URL =
  Constants.expoConfig?.extra?.apiUrl || `${AUTH_BRIDGE_ORIGIN}/api/v1`;

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

async function resolveIdTokenFromTicket(ticket: string): Promise<string | null> {
  const res = await axios.get(`${API_URL}/auth/google/mobile-ticket/${encodeURIComponent(ticket)}`, {
    timeout: 15000,
  });
  return res.data?.data?.idToken || null;
}

async function resolveIdTokenFromAuthUrl(url: string): Promise<string | null> {
  const ticket = extractParam(url, 'ticket');
  if (ticket) return resolveIdTokenFromTicket(ticket);
  return extractParam(url, 'id_token');
}

function randomHandoffId(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogleIdToken, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const finishingRef = useRef(false);
  const pollStopRef = useRef<null | (() => void)>(null);
  const activeHandoffRef = useRef<string | null>(null);

  const returnUrl = useMemo(() => Linking.createURL('oauth'), []);

  useEffect(() => {
    void logout();
  }, [logout]);

  const completeWithToken = async (idToken: string) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    pollStopRef.current?.();
    pollStopRef.current = null;
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
        Alert.alert('Almost there', 'No sign-in ticket returned. Close the browser and try again.');
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

  const completeWithTicket = async (ticket: string) => {
    if (finishingRef.current) return;
    try {
      setIsLoading(true);
      const idToken = await resolveIdTokenFromTicket(ticket);
      if (!idToken) {
        setIsLoading(false);
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

  const startHandoffPoll = (handoff: string) => {
    pollStopRef.current?.();
    let stopped = false;
    pollStopRef.current = () => {
      stopped = true;
    };
    const started = Date.now();
    const tick = async () => {
      if (stopped || finishingRef.current) return;
      if (Date.now() - started > 120000) return;
      try {
        const res = await axios.get(
          `${API_URL}/auth/google/mobile-handoff/${encodeURIComponent(handoff)}`,
          { timeout: 8000, validateStatus: () => true }
        );
        const ticket = res.data?.data?.ticket;
        if (res.status === 200 && ticket) {
          await completeWithTicket(ticket);
          return;
        }
      } catch (_) {}
      if (!stopped && !finishingRef.current) setTimeout(tick, 1200);
    };
    setTimeout(tick, 1500);
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
        const handoff = activeHandoffRef.current;
        if (handoff && !finishingRef.current) startHandoffPoll(handoff);
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
      pollStopRef.current?.();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    finishingRef.current = false;
    setIsLoading(true);
    const handoff = randomHandoffId();
    activeHandoffRef.current = handoff;
    const params = new URLSearchParams({
      scheme: 'lifelink',
      return_url: returnUrl,
      handoff,
    });
    const startUrl = `${AUTH_BRIDGE_ORIGIN}/api/v1/auth/google/mobile-start?${params.toString()}`;
    startHandoffPoll(handoff);

    try {
      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
        createTask: false,
      } as any);

      if (finishingRef.current) return;

      if (result.type === 'success' && result.url) {
        await completeWithAuthUrl(result.url);
        return;
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        try {
          const res = await axios.get(
            `${API_URL}/auth/google/mobile-handoff/${encodeURIComponent(handoff)}`,
            { timeout: 8000, validateStatus: () => true }
          );
          if (res.status === 200 && res.data?.data?.ticket) {
            await completeWithTicket(res.data.data.ticket);
            return;
          }
        } catch (_) {}
        setIsLoading(false);
        return;
      }

      await RNLinking.openURL(startUrl);
      setIsLoading(false);
    } catch (err: any) {
      pollStopRef.current?.();
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

        <View style={styles.centerBlock}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={BRAND.name}
          />

          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={({ pressed }) => [styles.googleButton, (pressed || isLoading) && { opacity: 0.92 }]}
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7F2' },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 8 : 20,
    paddingBottom: 28,
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
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingBottom: 48,
  },
  logo: {
    width: '78%',
    maxWidth: 280,
    height: 88,
  },
  googleButton: {
    width: '100%',
    maxWidth: 340,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  gIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
});
