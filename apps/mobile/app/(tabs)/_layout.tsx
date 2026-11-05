import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Home, Building2, Clock, User } from 'lucide-react-native';
import { typography } from '../../src/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabItem({
  icon: Icon,
  label,
  focused,
}: {
  icon: any;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItemContainer}>
      <Icon
        size={22}
        color={focused ? '#0F172A' : '#94A3B8'}
        strokeWidth={focused ? 2.5 : 1.8}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? '#0F172A' : '#94A3B8' },
          focused && styles.tabLabelFocused,
        ]}
      >
        {label}
      </Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 8),
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={Home} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="hospitals"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={Building2} label="Hospitals" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={Clock} label="Requests" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={User} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 48,
    width: 64,
  },
  tabLabel: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    marginTop: 3,
  },
  tabLabelFocused: {
    fontFamily: typography.fontFamilies.bodyBold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0B3D1A',
    position: 'absolute',
    bottom: -2,
  },
});
