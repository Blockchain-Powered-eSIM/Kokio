import * as SecureStore from "expo-secure-store";
import type { KokioSmartAccount } from "kokio-sdk/types";
import type { UserData } from "./kokio-state";

// SecureStore helpers for the kokio provider. Values are stored as JSON.

export const saveValueForDeviceUID = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
};

export const saveValueForUserData = async (key: string, value: UserData) => {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
};

export const saveValueForUserWallet = async (key: string, value: KokioSmartAccount) => {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
};

export const getValueForDeviceUID = async (key: string): Promise<string | undefined> => {
  const result = await SecureStore.getItemAsync(key);
  if (result) return JSON.parse(result) as string;
};

export const getValueForUserData = async (key: string): Promise<UserData | undefined> => {
  const result = await SecureStore.getItemAsync(key);
  if (result) return JSON.parse(result) as UserData;
};

export const getValueForUserWallet = async (key: string): Promise<KokioSmartAccount | undefined> => {
  const result = await SecureStore.getItemAsync(key);
  if (result) return JSON.parse(result) as KokioSmartAccount;
};

export const deleteValueForUser = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
};
