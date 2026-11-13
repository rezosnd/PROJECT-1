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
import { useScannedPatientStore } from '../../src/store/scanned-patient-store';
import { colors, typography } from '../../src/theme/tokens';

/** Normalize camera / paste noise before hitting the API. */
function normalizeQrRaw(raw: string): string {
  let text = String(raw || '').trim();
  if (!text) return '';
  try {
    if (/%7B|%22|GMH1%3A/i.test(text)) text = decodeURIComponent(text);
  } catch {
    /* keep */
  }
  // If paste is a qrserver image URL, extract data=
  if (/create-qr-code|[?&]data=/i.test(text)) {
    try {
      const u = new URL(text);
      const data = u.searchParams.get('data');
      if (data) return data;
    } catch {
      const m = text.match(/[?&]data=([^&]+)/i);
      if (m) {
        try {
          return decodeURIComponent(m[1]);
        } catch {
          return m[1];
        }
      }
    }
  }
  return text;
}

export default function ScanScreen() {
  const router = useRouter();
  const setPatient = useScannedPatientStore((s) => s.setPatient);
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<'camera' | 'paste'>('camera');

  const resolvePatient = async (payload: string) => {
    const normalized = normalizeQrRaw(payload);
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const patient = await referralsApi.scan(normalized);
      setPatient(patient);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Only pass id — large JSON in route params was truncating → “patient not found”
      router.push({
        pathname: '/patient/[id]',
        params: { id: patient.id },
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
      <Text style={styles.sub}>
        Patient must show Profile → Care QR (green card) — not the ABHA card QR.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'camera' && styles.tabOn]}
          onPress={() => {
            setMode('camera');
            setScanned(false);
          }}
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
          {scanned && !busy ? (
            <Pressable style={styles.rescan} onPress={() => setScanned(false)}>
              <Text style={styles.rescanText}>Tap to scan again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.pasteBox}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Paste GMH1:… code, Care QR JSON, or patient UUID"
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
  rescan: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: colors.lime,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  rescanText: { fontWeight: '800', color: colors.forest },
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
