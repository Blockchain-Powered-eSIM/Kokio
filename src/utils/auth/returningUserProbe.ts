import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const SEEN_KEY = 'kokioWelcomeBackSeen';
const PENDING = '0';
const SEEN = '1';

export async function markWelcomeBackPending(): Promise<void> {
  await SecureStore.setItemAsync(SEEN_KEY, PENDING);
}

export async function markWelcomeBackSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(SEEN_KEY, SEEN);
  } catch (err) {
    logger.error('WELCOME_BACK_SEEN_PERSIST_FAILED', { err });
  }
}

// Dev-only: used by settings.tsx's "Reset Cutover Test State" row.
export async function clearWelcomeBackSeen(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SEEN_KEY);
  } catch (err) {
    logger.error('WELCOME_BACK_SEEN_CLEAR_FAILED', { err });
  }
}

export async function shouldShowWelcomeBack(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(SEEN_KEY)) === PENDING;
  } catch {
    return false;
  }
}
