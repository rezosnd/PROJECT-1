import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aiApi, AiChatResponse, AiHospitalMatch, AiLanguage } from '../src/lib/api/ai.api';
import { useLocation } from '../src/hooks/useLocation';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { colors, typography, radius } from '../src/theme/tokens';
import {
  ChevronLeft,
  Bot,
  Phone,
  Send,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type UiMsg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hospitals?: AiHospitalMatch[];
  severity?: string;
};

const SUGGESTIONS_EN = [
  'Chest pain — nearest ICU?',
  'Ventilator availability nearby',
  'High fever — which hospital?',
  'Need O+ blood urgently',
];

const SUGGESTIONS_HI = [
  'सीने में दर्द — नज़दीकी ICU?',
  'वेंटिलेटर कहाँ है?',
  'तीव्र बुखार — अस्पताल?',
  'O+ ब्लड चाहिए',
];

export default function AiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const { location, requestLocation } = useLocation();
  const [language, setLanguage] = useState<AiLanguage>('en');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyAdvice, setEmergencyAdvice] = useState<string | undefined>();
  const scrollRef = useRef<any>(null);
  const suggestions = language === 'hi' ? SUGGESTIONS_HI : SUGGESTIONS_EN;

  useEffect(() => {
    if (isAuthenticated) requestLocation();
  }, [isAuthenticated]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true });
  }, [messages, error]);

  const chatMut = useMutation({
    mutationFn: (text: string) =>
      aiApi.chat({
        message: text,
        sessionId,
        language,
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    onSuccess: (res: AiChatResponse, text) => {
      setError(null);
      setSessionId(res.sessionId);
      setShowEmergency(res.severity === 'CRITICAL' || res.isEmergency);
      setEmergencyAdvice(res.emergencyAdvice ?? undefined);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'pending'),
        { id: `u-${Date.now()}`, role: 'user', content: text },
        {
          id: res.message.id || `a-${Date.now()}`,
          role: 'assistant',
          content: res.message.content,
          hospitals: res.hospitals,
          severity: res.severity,
        },
      ]);
      setInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== 'pending'));
      setError(err.response?.data?.error?.message || err.message || 'Could not reach CityHealth AI');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMut.isPending) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setError(null);
    setMessages((prev) => [...prev, { id: 'pending', role: 'user', content: trimmed }]);
    chatMut.mutate(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Sparkles size={18} color="#B9F84B" />
          <Text style={styles.headerTitle}>CityHealth AI</Text>
        </View>
        <View style={styles.langToggle}>
          {(['en', 'hi'] as AiLanguage[]).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[styles.langPill, language === lang && styles.langPillActive]}
            >
              <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                {lang === 'en' ? 'EN' : 'हि'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.heroStrip}>
        <Text style={styles.heroSub}>
          Verified beds & equipment — not a diagnosis. Near {location.city || 'Bhubaneswar'}.
        </Text>
      </View>

      {showEmergency && (
        <View style={styles.emergencyStrip}>
          <AlertTriangle size={18} color="#FFF" />
          <View style={styles.emergencyTextCol}>
            <Text style={styles.emergencyTitle}>Possible emergency</Text>
            <Text style={styles.emergencyBody} numberOfLines={2}>
              {emergencyAdvice || 'Call 112 now. This app is not EMS.'}
            </Text>
          </View>
          <Pressable onPress={() => Linking.openURL('tel:112')} style={styles.call112}>
            <Phone size={14} color="#FFF" />
            <Text style={styles.call112Text}>112</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.botIconCircle}>
              <Bot size={28} color="#B9F84B" />
            </View>
            <Text style={styles.emptyTitle}>How can we help?</Text>
            <Text style={styles.emptySub}>Symptoms, hospitals, equipment, or blood.</Text>
          </View>
        )}

        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubbleRow, m.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAi]}
          >
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
              {m.role === 'assistant' && (
                <View style={styles.aiLabelRow}>
                  <Bot size={12} color="#0B3D1A" />
                  <Text style={styles.aiLabel}>CityHealth AI</Text>
                  {m.severity && m.severity !== 'NORMAL' && (
                    <Text style={styles.sevBadge}>{m.severity}</Text>
                  )}
                </View>
              )}
              <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>
                {m.content}
              </Text>
              {m.hospitals && m.hospitals.length > 0 && (
                <View style={styles.hospList}>
                  {m.hospitals.slice(0, 4).map((h) => (
                    <Pressable
                      key={h.hospitalId}
                      onPress={() => router.push(`/hospital/${h.hospitalId}`)}
                      style={styles.hospCard}
                    >
                      <Text style={styles.hospName} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <Text style={styles.hospMeta}>
                        {h.distanceKm?.toFixed?.(1) ?? h.distanceKm} km
                        {h.freeBedsNow != null
                          ? ` · ${h.freeBedsNow} free ${h.allocatedWard || 'beds'}`
                          : ''}
                      </Text>
                      {h.phone ? (
                        <Pressable onPress={() => Linking.openURL(`tel:${h.phone}`)}>
                          <Text style={styles.hospPhone}>{h.phone}</Text>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}

        {chatMut.isPending && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#0B3D1A" size="small" />
            <Text style={styles.loadingText}>Checking verified data…</Text>
          </View>
        )}

        {error && (
          <Pressable onPress={() => send(messages[messages.length - 1]?.content || '')} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        )}
      </ScrollView>

      {messages.length === 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
          {suggestions.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={styles.suggestChip}>
              <Text style={styles.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Describe symptoms or ask for hospitals…"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          editable={!chatMut.isPending}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => send(input)}
          disabled={chatMut.isPending || !input.trim()}
          style={[styles.sendBtn, (chatMut.isPending || !input.trim()) && styles.sendBtnDisabled]}
        >
          {chatMut.isPending ? (
            <ActivityIndicator color="#B9F84B" size="small" />
          ) : (
            <Send size={20} color="#B9F84B" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: '700', color: colors.ink },
  langToggle: { flexDirection: 'row', backgroundColor: colors.cardSoft, borderRadius: radius.pill, padding: 2 },
  langPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  langPillActive: { backgroundColor: '#0B3D1A' },
  langText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  langTextActive: { color: '#B9F84B' },
  heroStrip: {
    backgroundColor: '#0B3D1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  emergencyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.red,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emergencyTextCol: { flex: 1 },
  emergencyTitle: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  emergencyBody: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 2 },
  call112: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  call112Text: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8, gap: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  botIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0B3D1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: '#0B3D1A', borderBottomRightRadius: 4 },
  bubbleAi: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  aiLabel: { fontSize: 9, fontWeight: '800', color: '#0B3D1A', textTransform: 'uppercase' },
  sevBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.orange,
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: colors.ink },
  bubbleTextUser: { color: '#FFF' },
  hospList: { marginTop: 10, gap: 8 },
  hospCard: {
    borderWidth: 1,
    borderColor: '#D8E0D4',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#F0FBE4',
  },
  hospName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  hospMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  hospPhone: { fontSize: 11, fontWeight: '700', color: '#0B3D1A', marginTop: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  loadingText: { fontSize: 12, color: colors.muted },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.redLight,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 12, color: colors.red, fontWeight: '600' },
  retryText: { fontSize: 11, color: colors.red, marginTop: 4, fontWeight: '700' },
  suggestScroll: { maxHeight: 44, paddingHorizontal: 12, marginBottom: 4 },
  suggestChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D8E0D4',
    backgroundColor: '#FFF',
  },
  suggestText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D8E0D4',
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#FFF',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0B3D1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
