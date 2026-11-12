import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { colors, typography } from '../../src/theme/tokens';

export default function DoctorProfile() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Doctor profile</Text>
      <View style={styles.card}>
        {user?.pictureUrl ? (
          <Image source={{ uri: user.pictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={{ fontWeight: '800', color: colors.forest }}>
              {(user?.name || 'D')[0]}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>{user?.doctorSpecialty || 'Specialty not set'}</Text>
        {user?.doctorLicenseNo ? (
          <Text style={styles.meta}>License {user.doctorLicenseNo}</Text>
        ) : null}
      </View>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { ...typography.display, fontSize: 24, color: colors.ink, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.title, color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  logout: {
    marginTop: 24,
    backgroundColor: colors.forest,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.lime, fontWeight: '800' },
});
