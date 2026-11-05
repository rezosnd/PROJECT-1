import * as LocalAuthentication from 'expo-local-authentication';

let lastBackgroundTime = 0;

export const biometricService = {
  recordBackgroundTime(): void {
    lastBackgroundTime = Date.now();
  },

  shouldPromptBiometrics(): boolean {
    if (lastBackgroundTime === 0) return false;
    // Prompt only if app was in background for > 60 seconds
    const elapsedSeconds = (Date.now() - lastBackgroundTime) / 1000;
    return elapsedSeconds > 60;
  },

  async authenticateAsync(promptMessage = 'Unlock LifeLink CityHealth'): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return true; // Graceful pass-through if device has no biometric credentials
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use device passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  },
};

