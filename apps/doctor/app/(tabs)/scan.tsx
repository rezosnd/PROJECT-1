import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { referralsApi } from '../../src/lib/api/referrals.api';
import { colors, typography } from '../../src/theme/tokens';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<'camera' | 'paste'>('camera');

  const resolvePatient = async (payload: string) => {
    if (!payload.trim() || busy) return;
    setBusy(true);
    try {
      const patient = await referralsApi.scan(payload.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/patient/[id]',
        params: { id: patient.id, data: JSON.stringify(patient) },
      });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Scan failed',
        err?.response?.data?.error?.message || err.message || 'Invalid Care QR'
      );
      setScanned(false);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }

  if (!permission.granted && mode === 'camera') {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.sub}>Needed to scan the patient’s Care QR from their profile.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => setMode('paste')} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Paste QR payload instead</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Scan Care QR</Text>
      <Text style={styles.sub}>Patient → Profile → Care QR. Or paste the QR JSON / patient ID.</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'camera' && styles.tabOn]}
          onPress={() => setMode('camera')}
        >
          <Text style={[styles.tabText, mode === 'camera' && styles.tabTextOn]}>Camera</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'paste' && styles.tabOn]}
          onPress={() => setMode('paste')}
        >
          <Text style={[styles.tabText, mode === 'paste' && styles.tabTextOn]}>Paste</Text>
        </Pressable>
      </View>

      {mode === 'camera' ? (
        <View style={styles.camWrap}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={
              scanned || busy
                ? undefined
                : ({ data }) => {
                    setScanned(true);
                    void resolvePatient(data);
                  }
            }
          />
          <View style={styles.frame} />
          {busy && (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.lime} size="large" />
              <Text style={{ color: '#fff', marginTop: 8 }}>Loading patient…</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.pasteBox}>
          <TextInput
            style={styles.input}
            multiline
            placeholder='Paste QR JSON or patient UUID'
            placeholderTextColor={colors.muted}
            value={manual}
            onChangeText={setManual}
          />
          <Pressable
            style={styles.btn}
            onPress={() => resolvePatient(manual)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.forest} />
            ) : (
              <Text style={styles.btnText}>Open patient</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.display, fontSize: 24, color: colors.ink },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  tabText: { fontWeight: '700', color: colors.muted },
  tabTextOn: { color: colors.lime },
  camWrap: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 360,
  },
  frame: {
    position: 'absolute',
    top: '22%',
    left: '12%',
    right: '12%',
    bottom: '22%',
    borderWidth: 3,
    borderColor: colors.lime,
    borderRadius: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteBox: { gap: 12 },
  input: {
    minHeight: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    textAlignVertical: 'top',
    color: colors.ink,
  },
  btn: {
    backgroundColor: colors.lime,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { fontWeight: '800', color: colors.forest, fontSize: 16 },
  link: { color: colors.lime, fontWeight: '700', textAlign: 'center' },
});
