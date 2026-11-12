import * as SecureStore from 'expo-secure-store';

const ACCESS = 'gmh_amb_access';
const REFRESH = 'gmh_amb_refresh';
const USER = 'gmh_amb_user';

export async function saveTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await SecureStore.deleteItemAsync(USER);
}

export async function saveUserIdentity(json: string) {
  await SecureStore.setItemAsync(USER, json);
}

export async function getUserIdentity() {
  return SecureStore.getItemAsync(USER);
}
