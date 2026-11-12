import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'lifelink_access_token';
const REFRESH_TOKEN_KEY = 'lifelink_refresh_token';
const USER_KEY = 'lifelink_user_identity';
const SAVED_ACCOUNTS_KEY = 'lifelink_saved_accounts';

export interface SavedAccount {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN' | 'CITY_ADMIN';
  hospitalId?: string | null;
  hospitalName?: string;
  phone?: string;
  bloodGroup?: string;
  pictureUrl?: string | null;
  lastUsedAt: number;
}

export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function saveUserIdentity(userJson: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, userJson);
}

export async function getUserIdentity(): Promise<string | null> {
  return await SecureStore.getItemAsync(USER_KEY);
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
    if (!raw) {
      // Production: start empty — accounts are saved only after a real Google sign-in.
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveAccount(account: SavedAccount): Promise<void> {
  try {
    const existing = await getSavedAccounts();
    const filtered = existing.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
    const updated = [{ ...account, lastUsedAt: Date.now() }, ...filtered];
    await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save account:', err);
  }
}

export async function removeSavedAccount(email: string): Promise<void> {
  try {
    const existing = await getSavedAccounts();
    const updated = existing.filter((a) => a.email.toLowerCase() !== email.toLowerCase());
    await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove account:', err);
  }
}


