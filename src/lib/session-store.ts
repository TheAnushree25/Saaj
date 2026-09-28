import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { User } from "./api";

const TOKEN_KEY = "saaj.refresh-token";
const USER_KEY = "saaj.user";

// The refresh token is as sensitive as a password, so phones keep it in the
// operating system's encrypted keychain (Android Keystore / iOS Keychain).
// The laptop web preview has no keychain, so there it falls back to AsyncStorage.
const onWeb = Platform.OS === "web";
const readToken = () => (onWeb ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY));
const writeToken = (token: string) =>
  onWeb ? AsyncStorage.setItem(TOKEN_KEY, token) : SecureStore.setItemAsync(TOKEN_KEY, token);
const removeToken = () => (onWeb ? AsyncStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY));

/** Remembers the sign-in, plus the profile, so the next launch opens instantly, even offline. */
export async function saveSession(refreshToken: string, user: User) {
  await Promise.all([writeToken(refreshToken), AsyncStorage.setItem(USER_KEY, JSON.stringify(user))]);
}

export async function loadSession(): Promise<{ refreshToken: string | null; user: User | null }> {
  const [refreshToken, rawUser] = await Promise.all([readToken(), AsyncStorage.getItem(USER_KEY)]);
  let user: User | null = null;
  try {
    user = rawUser ? (JSON.parse(rawUser) as User) : null;
  } catch {
    user = null;
  }
  return { refreshToken, user };
}

export async function clearSession() {
  await Promise.all([removeToken(), AsyncStorage.removeItem(USER_KEY)]);
}
