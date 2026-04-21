import { SignJWT, base64url } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { getDpopKeyPair } from './dpopKeystore';

export type BuildDpopProofParams = {
  /** Full request URL — no query string or fragment (RFC 9449 §4.2 htu). */
  htu: string;
  /** HTTP method in uppercase (GET, POST, …). */
  htm: string;
  /** Server-issued nonce, included verbatim when present. */
  nonce?: string;
  /**
   * Current access token, when calling a DPoP-protected resource.
   * Omit on `/v1/auth/token` — no token exists yet at that point.
   * When present, ath = base64url(SHA-256(accessToken)) is added per RFC 9449 §4.2.
   */
  accessToken?: string;
};

/**
 * Builds a fresh DPoP proof JWT (compact JWS) for one outgoing request.
 *
 * Header:  { typ: 'dpop+jwt', alg: 'ES256', jwk: <public key> }
 * Payload: { jti, htm, htu, iat, nonce?, ath? }
 *
 * The proof is signed with the device's long-lived DPoP private key from
 * dpopKeystore. Each call produces a unique jti, making proofs single-use.
 */
export async function buildDpopProof({
  htu,
  htm,
  nonce,
  accessToken,
}: BuildDpopProofParams): Promise<string> {
  const { privateKey, publicJwk } = await getDpopKeyPair();

  let ath: string | undefined;
  if (accessToken !== undefined) {
    const hash = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(accessToken),
    );
    ath = base64url.encode(new Uint8Array(hash));
  }

  const payload: Record<string, unknown> = { jti: uuidv4(), htm, htu };
  if (nonce !== undefined) payload.nonce = nonce;
  if (ath !== undefined) payload.ath = ath;

  return new SignJWT(payload)
    .setProtectedHeader({ typ: 'dpop+jwt', alg: 'ES256', jwk: publicJwk })
    .setIssuedAt()
    .sign(privateKey);
}
