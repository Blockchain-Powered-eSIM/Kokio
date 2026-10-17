// Decides whether this device should see the one-time post-cutover
// welcome-back screen. Shown to every device unconditionally, new or
// returning - see KOKIO_LAUNCH_TODO.md section 3 for why.
import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const SEEN_KEY = 'kokioWelcomeBackSeen';

export async function hasSeenWelcomeBack(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(SEEN_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markWelcomeBackSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(SEEN_KEY, '1');
  } catch (err) {
    logger.error('WELCOME_BACK_SEEN_PERSIST_FAILED', { err });
  }
}

// Dev-only: iOS Keychain-backed SecureStore survives app uninstall, so
// settings.tsx's "Reset Cutover Test State" row uses this to re-test on iOS.
export async function clearWelcomeBackSeen(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SEEN_KEY);
  } catch (err) {
    logger.error('WELCOME_BACK_SEEN_CLEAR_FAILED', { err });
  }
}

// justCutOver must come from runMainnetCutoverIfNeeded()'s own return value,
// not be re-derived by reading kokioLocalDataVersion here - that key is
// already '3' by the time this runs, which would make this always skip.
export async function shouldShowWelcomeBack(justCutOver: boolean): Promise<boolean> {
  if (!justCutOver) return false;
  if (await hasSeenWelcomeBack()) return false;
  return true;
}
