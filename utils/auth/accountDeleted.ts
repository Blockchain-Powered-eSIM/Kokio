/**
 * Account-deleted flag.
 * Persisted because the condition must survive a cold boot.
 * The passkey keeps authenticating successfully — login/begin and login/complete still mint valid tokens.
 *
 * Without this flag the user would loop: relaunch -> passkey login succeeds ->
 * first authed call 404s -> back to landing -> repeat.
 * The flag lets the auth UI skip the login/recover paths entirely and steer the user to 
 *  (a) remove the stale passkey and 
 *  (b) register a new one.
 *
 * Cleared only on a successful NEW registration.
 * Re-registering the SAME passkey resolves to the same address and must NOT clear this flag.
 */
import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const KEY = 'kokio.account.deleted';

type Listener = (deleted: boolean) => void;
const listeners = new Set<Listener>();

// In-memory mirror so synchronous render paths don't have to await SecureStore.
let _cached = false;

export function subscribeAccountDeleted(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Last known value. Call hydrateAccountDeleted() once at boot before relying on this.
export function isAccountDeletedCached(): boolean {
  return _cached;
}

// Read the persisted flag into the in-memory mirror. Call once on app boot.
export async function hydrateAccountDeleted(): Promise<boolean> {
  try {
    _cached = (await SecureStore.getItemAsync(KEY)) === 'true';
  } catch {
    _cached = false;
  }
  listeners.forEach((fn) => fn(_cached));
  return _cached;
}

export async function markAccountDeleted(): Promise<void> {
  _cached = true;
  try {
    await SecureStore.setItemAsync(KEY, 'true');
  } catch (err) {
    // Non-fatal: the in-memory mirror still guards this session.
    logger.error('ACCOUNT_DELETED_FLAG_PERSIST_FAILED', { err });
  }
  listeners.forEach((fn) => fn(true));
}

export async function clearAccountDeleted(): Promise<void> {
  _cached = false;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* best-effort */
  }
  listeners.forEach((fn) => fn(false));
}
