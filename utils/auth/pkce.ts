import * as Crypto from 'expo-crypto';
import { base64url } from 'jose';

/**
 * Generates a PKCE pair per RFC 7636 §4.
 *
 * Verifier: 64 cryptographically random bytes → base64url (86 chars, within the
 * spec's 43–128 character window). Lives in memory only for one ceremony.
 *
 * Challenge: base64url( SHA-256( ASCII(verifier) ) ) — S256 method.
 */
export async function newPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const bytes = await Crypto.getRandomBytesAsync(64);
  const verifier = base64url.encode(bytes);

  const challengeBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  // digestStringAsync returns standard base64; convert to base64url
  const challenge = challengeBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return { verifier, challenge };
}
