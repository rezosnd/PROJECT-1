import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { BRAND } from '../src/lib/brand';
import { typography } from '../src/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const API_URL =
  Constants.expoConfig?.extra?.apiUrl || 'https://project1-api.vercel.app/api/v1';

function firstParam(v: string | string[] | undefined): string | null {
  if (typeof v === 'string' && v) return v;
  if (Array.isArray(v) && v[0]) return String(v[0]);
  return null;
}

/**
 * Deep-link handoff: exp://…/--/oauth?ticket=…
 * Missing this route caused Expo Go's blue "Something went wrong" screen.
 */
export default function OAuthHandoffScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ticket?: string; id_token?: string }>();
  const { loginWithGoogleIdToken } = useAuthStore();
  const [status, setStatus] = useState('Signing you in…');
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        try {
          await WebBrowser.dismissBrowser();
        } catch (_) {}
        try {
          await WebBrowser.dismissAuthSession();
        } catch (_) {}

        const ticket = firstParam(params.ticket);
        const direct = firstParam(params.id_token);
        let idToken = direct;

        if (!idToken && ticket) {
          setStatus('Confirming Google ticket…');
          const res = await axios.get(
            `${API_URL}/auth/google/mobile-ticket/${encodeURIComponent(ticket)}`,
            { timeout: 15000 }
          );
          idToken = res.data?.data?.idToken || null;
        }

        if (!idToken) {
          throw new Error('Sign-in ticket missing or expired. Tap Continue with Google again.');
        }

        setStatus('Creating your GetMyHospital session…');
        await loginWithGoogleIdToken(idToken, 'PATIENT');
        router.replace('/(tabs)');
      } catch (err: any) {
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Could not finish Google sign-in'
        );
        setStatus('Sign-in interrupted');
      }
    })();
  }, [params.ticket, params.id_token, loginWithGoogleIdToken, router]);

  return (
    <View style={styles.safe}>
      <View style={styles.card}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel={BRAND.name}
        />
        {error ? (
          <>
            <Text style={styles.title}>Couldn’t open the app session</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable
              style={styles.btn}
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={BRAND.colors.forest} />
            <Text style={styles.title}>{status}</Text>
            <Text style={styles.body}>Hang tight — returning you to GetMyHospital.</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.colors.page,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D8E0D4',
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  logo: { width: '100%', height: 56, marginBottom: 8 },
  title: {
    marginTop: 8,
    fontFamily: typography.fontFamilies.display,
    fontSize: 18,
    fontWeight: '800',
    color: '#0A0A0A',
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5B6B5E',
    textAlign: 'center',
  },
  btn: {
    marginTop: 12,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: BRAND.colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: BRAND.colors.lime, fontWeight: '800', fontSize: 14 },
});
