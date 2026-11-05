import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFlashStore } from '../../lib/ui/flash-store';
import { colors, radius, typography } from '../../theme/tokens';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react-native';

export function FlashBanner() {
  const message = useFlashStore((s) => s.message);
  const clear = useFlashStore((s) => s.clear);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => clear(), 6500);
    return () => clearTimeout(t);
  }, [message?.id]);

  if (!message) return null;

  const tone = message.tone;
  const bg = tone === 'success' ? '#ECFDF5' : tone === 'warn' ? '#FFF7ED' : '#EFF6FF';
  const border = tone === 'success' ? '#A7F3D0' : tone === 'warn' ? '#FED7AA' : '#BFDBFE';
  const fg = tone === 'success' ? '#065F46' : tone === 'warn' ? '#9A3412' : '#1E3A8A';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : Info;

  return (
    <View style={[styles.wrap, { backgroundColor: bg, borderColor: border }]}>
      <Icon size={18} color={fg} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: fg }]}>{message.title}</Text>
        {message.body ? <Text style={[styles.body, { color: fg }]}>{message.body}</Text> : null}
      </View>
      <Pressable onPress={clear} hitSlop={10} accessibilityLabel="Dismiss">
        <X size={16} color={fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: radius.lg || 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  textCol: { flex: 1 },
  title: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
  },
  body: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
    opacity: 0.9,
  },
});
