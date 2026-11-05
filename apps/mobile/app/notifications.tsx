import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../src/components/ui/Card';
import { colors, radius, typography, spacing } from '../src/theme/tokens';
import { ArrowLeft, Bell, CheckCircle2, Clock } from 'lucide-react-native';

const NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: '15-Minute Hold Confirmed',
    message: 'AIIMS Bhubaneswar has placed an immediate hold on 1 ICU bed.',
    time: '4 mins ago',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'ABHA Link Verified',
    message: 'Your Ayushman Bharat digital health identity was successfully linked.',
    time: '2 hours ago',
    read: true,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>In-App Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {NOTIFICATIONS.map((n) => (
          <Card key={n.id} variant="surface" style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, !n.read && styles.unreadIconBox]}>
                <Bell size={18} color={!n.read ? colors.blue : colors.muted} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifMsg}>{n.message}</Text>
                <View style={styles.timeRow}>
                  <Clock size={11} color={colors.muted} />
                  <Text style={styles.timeText}>{n.time}</Text>
                </View>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 54,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h3,
    color: colors.ink,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unreadIconBox: {
    backgroundColor: colors.blueLight,
  },
  textContainer: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
  },
  notifMsg: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  timeText: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: colors.muted,
  },
});

