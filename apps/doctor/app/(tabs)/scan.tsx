import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Linking,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
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
  const [cameraKey, setCameraKey] = useState(0);
  const [torch, setTorch] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  // Remount camera when this tab is focused — fixes black / frozen preview
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setScanned(false);
      setCameraKey((k) => k + 1);
      return () => {
        setIsFocused(false);
        setTorch(false);
      };
    }, [])
  );

  useEffect(() => {
    if (isFocused && mode === 'camera' && permission?.granted) {
      setScanned(false);
      setCameraKey((k) => k + 1);
    } else if (!isFocused) {
      setTorch(false);
    }
  }, [mode, permission?.granted]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const prev = appState.current;
      if (prev?.match(/inactive|background/) && next === 'active') {
        if (isFocused && mode === 'camera' && permission?.granted) {
          setCameraKey((k) => k + 1);
          setScanned(false);
        }
      }
      appState.current = next;
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isFocused, mode, permission?.granted]);

  const askPermission = useCallback(async () => {
    const res = await requestPermission();
    if (!res.granted) {
      Alert.alert(
        'Camera blocked',
        'Enable camera for GetMyHospital Doctor in system settings to scan Care QR.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    setCameraKey((k) => k + 1);
  }, [requestPermission]);

  const resolvePatient = async (payload: string) => {
    const normalized = normalizeQrRaw(payload);
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const patient = await referralsApi.scan(normalized);
      setPatient(patient);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      setCameraKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const cameraActive = Boolean(isFocused && mode === 'camera' && permission?.granted && !busy);

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
        <View style={styles.header}>
          <Text style={styles.title}>Camera access</Text>
          <Text style={styles.sub}>
            Needed to scan the patient’s green Care QR from their GetMyHospital profile.
          </Text>
        </View>
        <Pressable style={styles.btn} onPress={askPermission}>
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
      <View style={styles.header}>
        <Text style={styles.title}>Scan Care QR</Text>
        <Text style={styles.sub}>
          Point at the patient’s green Care QR (Profile) — not the ABHA card.
        </Text>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'camera' && styles.tabOn]}
            onPress={() => {
              setMode('camera');
              setScanned(false);
              setCameraKey((k) => k + 1);
            }}
          >
            <Text style={[styles.tabText, mode === 'camera' && styles.tabTextOn]}>Camera</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'paste' && styles.tabOn]}
            onPress={() => {
              setMode('paste');
              setTorch(false);
            }}
          >
            <Text style={[styles.tabText, mode === 'paste' && styles.tabTextOn]}>Paste</Text>
          </Pressable>
        </View>
      </View>

      {mode === 'camera' ? (
        <View style={styles.camWrap}>
          {cameraActive ? (
            <CameraView
              key={`cam-${cameraKey}`}
              style={styles.camera}
              facing="back"
              mode="picture"
              active={cameraActive}
              enableTorch={torch}
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
          ) : (
            <View style={[styles.camera, styles.cameraPlaceholder]}>
              <ActivityIndicator color={colors.lime} />
              <Text style={styles.placeholderText}>Starting camera…</Text>
            </View>
          )}

          <View pointerEvents="none" style={styles.frame} />

          <View style={styles.camControls}>
            <Pressable
              style={styles.chip}
              onPress={() => setTorch((t) => !t)}
              disabled={!cameraActive}
            >
              <Text style={styles.chipText}>{torch ? 'Torch on' : 'Torch'}</Text>
            </Pressable>
            <Pressable
              style={styles.chip}
              onPress={() => {
                setScanned(false);
                setCameraKey((k) => k + 1);
              }}
            >
              <Text style={styles.chipText}>Refresh camera</Text>
            </Pressable>
          </View>

          {busy && (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.lime} size="large" />
              <Text style={{ color: '#fff', marginTop: 8 }}>Loading patient…</Text>
            </View>
          )}
          {scanned && !busy ? (
            <Pressable
              style={styles.rescan}
              onPress={() => {
                setScanned(false);
                setCameraKey((k) => k + 1);
              }}
            >
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
          <Pressable style={styles.btn} onPress={() => resolvePatient(manual)} disabled={busy}>
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
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.display, fontSize: 24, color: colors.ink },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 8 : 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 320,
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3D1A',
  },
  placeholderText: { color: 'rgba(255,255,255,0.8)', marginTop: 10, fontWeight: '600' },
  frame: {
    position: 'absolute',
    top: '20%',
    left: '12%',
    right: '12%',
    bottom: '28%',
    borderWidth: 3,
    borderColor: colors.lime,
    borderRadius: 18,
  },
  camControls: {
    position: 'absolute',
    top: 14,
    right: 12,
    left: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(168,224,23,0.5)',
  },
  chipText: { color: colors.lime, fontWeight: '800', fontSize: 12 },
  overlay: {
    ...StyleSheet.absoluteFill,
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
  pasteBox: { paddingHorizontal: 20, gap: 12 },
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
    marginHorizontal: 20,
  },
  btnText: { fontWeight: '800', color: colors.forest, fontSize: 16 },
  link: { color: colors.lime, fontWeight: '700', textAlign: 'center' },
});
