import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { useActiveSosStore } from '../src/store/active-sos-store';
import { useAmbulancePresence } from '../src/hooks/useAmbulancePresence';
import { colors } from '../src/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 8000, retry: 1 } },
});

function AmbulanceShell() {
  useAmbulancePresence();
  return null;
}

export default function RootLayout() {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();
  const hydrateActive = useActiveSosStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Promise.all([checkSession(), hydrateActive()]);
      } finally {
        if (alive) setBooted(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!booted || isLoading) return;
    const onLogin = segments[0] === 'login';
    if (!isAuthenticated && !onLogin) router.replace('/login');
    else if (isAuthenticated && onLogin) router.replace('/(tabs)');
  }, [booted, isLoading, isAuthenticated, segments]);

  if (!booted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest }}>
        <ActivityIndicator color={colors.lime} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {isAuthenticated ? <AmbulanceShell /> : null}
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
