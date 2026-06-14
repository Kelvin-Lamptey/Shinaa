import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Secure token storage wrapper that is platform-agnostic (native vs web)
export async function saveToken(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error("SecureStore save error, fallback to AsyncStorage:", e);
      // In case native secure storage fails in some emulator setups
      localStorage.setItem(key, value);
    }
  }
}

export async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error("SecureStore read error, fallback to AsyncStorage:", e);
      return localStorage.getItem(key);
    }
  }
}

export async function deleteToken(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error("SecureStore delete error, fallback to AsyncStorage:", e);
      localStorage.removeItem(key);
    }
  }
}
