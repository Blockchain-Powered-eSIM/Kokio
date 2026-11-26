import * as SecureStore from "expo-secure-store";

// The kokio provider stores its values in SecureStore as JSON.

export async function saveJson<T>(key: string, value: T): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function readJson<T>(key: string): Promise<T | undefined> {
  const result = await SecureStore.getItemAsync(key);
  if (result) return JSON.parse(result) as T;
}
