import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { biometricService } from '../src/lib/auth/biometrics';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme/tokens';
import '../src/i18n';
import Constants from 'expo-constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, checkSession, biometricLockEnabled } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isBiometricVerified, setIsBiometricVerified] = useState(true);
  // Only block the first boot. Never unmount the Stack during Google login —
  // that race caused Expo Go's blue "Something went wrong" after OAuth handoff.
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await checkSession();
      } finally {
        if (alive) setBooted(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Biometric App Lock Listener on Resume
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background') {
        biometricService.recordBackgroundTime();
      } else if (state === 'active') {
        if (biometricLockEnabled && biometricService.shouldPromptBiometrics()) {
          setIsBiometricVerified(false);
          const success = await biometricService.authenticateAsync();
          setIsBiometricVerified(success);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [biometricLockEnabled]);

  // Route Protection & Navigation Guard
  useEffect(() => {
    if (!booted || isLoading) return;

    const inAuthGroup =
      segments[0] === 'login' || segments[0] === 'splash' || segments[0] === 'oauth';
    const onOnboarding = segments[0] === 'onboarding';
    const needsProfile = Boolean(
      user?.needsProfileSetup || (user?.role === 'PATIENT' && user?.profileComplete === false)
    );

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/splash');
    } else if (isAuthenticated && needsProfile && !onOnboarding) {
      router.replace('/onboarding');
    } else if (isAuthenticated && !needsProfile && (inAuthGroup || onOnboarding)) {
      // Stay on oauth until it navigates itself
      if (segments[0] !== 'oauth') {
        router.replace('/(tabs)');
      }
    }
  }, [booted, isAuthenticated, isLoading, segments, user]);

  if (!booted || !isBiometricVerified) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="splash" options={{ animation: 'fade' }} />
          <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="oauth" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="hospital/[id]"
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="top-doctors"
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="doctor/[id]"
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

