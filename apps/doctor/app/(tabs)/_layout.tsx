import React from 'react';
import { Tabs } from 'expo-router';
import { Home, QrCode, Send, User } from 'lucide-react-native';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan QR', tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="referrals"
        options={{ title: 'Referrals', tabBarIcon: ({ color, size }) => <Send color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
