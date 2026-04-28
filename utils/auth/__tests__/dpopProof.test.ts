/**
 * dpopProof unit tests
 *
 * Uses real jose (signed with actual ES256 keys) and real uuid — the goal is
 * to verify the DPoP proof structure per RFC 9449, not to mock the crypto.
 *
 * getDpopKeyPair is mocked so the test owns the keypair and can run the
 * reference verifier (jwtVerify) against the same public key.
 */

import {
  generateKeyPair,
  exportJWK,
  importJWK,
  jwtVerify,
  decodeProtectedHeader,
  base64url,
  type JWK,
} from 'jose';
import { buildDpopProof } from '../dpopProof';
import type { DpopKeyPair } from '../dpopKeystore';

// ─── Mock getDpopKeyPair ──────────────────────────────────────────────────────
// We own the keypair so the reference verifier can use the matching public key.

jest.mock('../dpopKeystore');

let mockPair: DpopKeyPair;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const publicJwk = await exportJWK(publicKey);
  mockPair = {
    privateKey: privateKey as CryptoKey,
    publicJwk,
    jkt: 'test-jkt',
  };
  const { getDpopKeyPair } = require('../dpopKeystore');
  getDpopKeyPair.mockResolvedValue(mockPair);
});

// ─── Reference verifier helper ────────────────────────────────────────────────

async function verifyProof(proof: string) {
  const header = decodeProtectedHeader(proof);
  const verifyKey = await importJWK(header.jwk as JWK, 'ES256');
  const { payload, protectedHeader } = await jwtVerify(proof, verifyKey, {
    algorithms: ['ES256'],
  });
  return { payload, header: protectedHeader };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('proof structure — header', () => {
  it('sets typ to dpop+jwt', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { header } = await verifyProof(proof);
    expect(header.typ).toBe('dpop+jwt');
  });

  it('sets alg to ES256', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { header } = await verifyProof(proof);
    expect(header.alg).toBe('ES256');
  });

  it('embeds the public JWK in the header', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { header } = await verifyProof(proof);
    expect(header.jwk).toMatchObject({ kty: 'EC', crv: 'P-256' });
    // Must not include the private key scalar d
    expect((header.jwk as JWK).d).toBeUndefined();
  });

  it('signature validates against the embedded JWK (reference verifier)', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    // verifyProof throws if the signature is invalid — just resolving is the assertion
    await expect(verifyProof(proof)).resolves.toBeDefined();
  });
});

describe('proof structure — payload claims', () => {
  it('htm matches the outgoing request method exactly', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { payload } = await verifyProof(proof);
    expect(payload.htm).toBe('POST');
  });

  it('htu matches the outgoing request URL exactly', async () => {
    const url = 'https://auth.kokio.app/v1/auth/token';
    const proof = await buildDpopProof({ htu: url, htm: 'POST' });
    const { payload } = await verifyProof(proof);
    expect(payload.htu).toBe(url);
  });

  it('iat is a unix timestamp close to now', async () => {
    const before = Math.floor(Date.now() / 1000);
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const after = Math.floor(Date.now() / 1000);
    const { payload } = await verifyProof(proof);
    expect(typeof payload.iat).toBe('number');
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
  });

  it('jti is present and is a non-empty string', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { payload } = await verifyProof(proof);
    expect(typeof payload.jti).toBe('string');
    expect((payload.jti as string).length).toBeGreaterThan(0);
  });
});

describe('nonce claim', () => {
  it('includes nonce when provided', async () => {
    const proof = await buildDpopProof({
      htu: 'https://auth.kokio.app/v1/auth/token',
      htm: 'POST',
      nonce: 'server-nonce-abc',
    });
    const { payload } = await verifyProof(proof);
    expect(payload.nonce).toBe('server-nonce-abc');
  });

  it('omits nonce when not provided', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { payload } = await verifyProof(proof);
    expect(payload.nonce).toBeUndefined();
  });
});

describe('ath claim (access token hash)', () => {
  it('includes ath when accessToken is provided', async () => {
    const accessToken = 'eyJhbGciOiJSUzI1NiJ9.example.token';
    const proof = await buildDpopProof({
      htu: 'https://api.kokio.app/v1/esim',
      htm: 'GET',
      accessToken,
    });
    const { payload } = await verifyProof(proof);
    expect(typeof payload.ath).toBe('string');
  });

  it('ath equals base64url(SHA-256(accessToken))', async () => {
    const accessToken = 'eyJhbGciOiJSUzI1NiJ9.example.token';
    const proof = await buildDpopProof({
      htu: 'https://api.kokio.app/v1/esim',
      htm: 'GET',
      accessToken,
    });
    const { payload } = await verifyProof(proof);

    const hash = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(accessToken),
    );
    const expectedAth = base64url.encode(new Uint8Array(hash));
    expect(payload.ath).toBe(expectedAth);
  });

  it('omits ath when accessToken is not provided (token endpoint grant)', async () => {
    const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
    const { payload } = await verifyProof(proof);
    expect(payload.ath).toBeUndefined();
  });
});

describe('jti uniqueness', () => {
  it('produces unique jti across 1000 sequential calls', async () => {
    const jtis = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const proof = await buildDpopProof({ htu: 'https://auth.kokio.app/v1/auth/token', htm: 'POST' });
      const { payload } = await verifyProof(proof);
      jtis.add(payload.jti as string);
    }
    expect(jtis.size).toBe(1000);
  });
});
