import * as SecureStore from 'expo-secure-store';
import { generateKeyPair, exportJWK, importJWK, calculateJwkThumbprint } from 'jose';
import type { JWK } from 'jose';

const STORE_PRIVATE = 'kokio.dpop.privateKey';
const STORE_PUBLIC  = 'kokio.dpop.publicKey';

export type DpopKeyPair = {
  privateKey: CryptoKey;
  publicJwk: JWK;
  jkt: string;
};

// Module-scope memo: survives re-renders and provider remounts within one process.
// Cleared by clearDpopKeyPair() or process restart (new app launch loads from SecureStore).
let _memo: DpopKeyPair | null = null;
// In-flight guard: concurrent callers during app init all share the same promise
// so generateKeyPair is called exactly once even if getDpopKeyPair is awaited in parallel.
let _inFlight: Promise<DpopKeyPair> | null = null;

async function _loadOrGenerate(): Promise<DpopKeyPair> {
  const [rawPrivate, rawPublic] = await Promise.all([
    SecureStore.getItemAsync(STORE_PRIVATE),
    SecureStore.getItemAsync(STORE_PUBLIC),
  ]);

  if (rawPrivate && rawPublic) {
    const privateJwk: JWK = JSON.parse(rawPrivate);
    const publicJwk: JWK  = JSON.parse(rawPublic);
    const privateKey = await importJWK(privateJwk, 'ES256') as CryptoKey;
    const jkt = await calculateJwkThumbprint(publicJwk, 'sha256');
    return { privateKey, publicJwk, jkt };
  }

  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const [privateJwk, publicJwk] = await Promise.all([
    exportJWK(privateKey),
    exportJWK(publicKey),
  ]);

  await Promise.all([
    SecureStore.setItemAsync(STORE_PRIVATE, JSON.stringify(privateJwk)),
    SecureStore.setItemAsync(STORE_PUBLIC,  JSON.stringify(publicJwk)),
  ]);

  const jkt = await calculateJwkThumbprint(publicJwk, 'sha256');
  return { privateKey: privateKey as CryptoKey, publicJwk, jkt };
}

export function getDpopKeyPair(): Promise<DpopKeyPair> {
  if (_memo) return Promise.resolve(_memo);
  if (_inFlight) return _inFlight;

  _inFlight = _loadOrGenerate()
    .then((pair) => { _memo = pair; return pair; })
    .finally(() => { _inFlight = null; });

  return _inFlight;
}

export async function clearDpopKeyPair(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STORE_PRIVATE),
    SecureStore.deleteItemAsync(STORE_PUBLIC),
  ]);
  _memo = null;
}
