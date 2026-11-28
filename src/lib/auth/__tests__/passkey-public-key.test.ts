import { encodeCBOR } from '@levischuck/tiny-cbor';
import { base64url } from 'jose';
import { bytesToHex } from 'viem';
import { extractP256PublicKey } from '../passkey-public-key';

const X = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const Y = Uint8Array.from({ length: 32 }, (_, i) => 200 - i);
const CRED_ID = Uint8Array.from({ length: 20 }, (_, i) => i);

function coseKey(overrides: Record<number, number | Uint8Array> = {}) {
  return new Map<number, number | Uint8Array>([
    [1, 2], [3, -7], [-1, 1], [-2, X], [-3, Y],
    ...Object.entries(overrides).map(([k, v]) => [Number(k), v] as [number, number | Uint8Array]),
  ]);
}

// Builds a "none" attestation object the way an authenticator lays it out.
function attestationObject({ key = coseKey(), flags = 0x45, extensions }: {
  key?: Map<number, number | Uint8Array>; flags?: number; extensions?: Map<string, boolean>;
} = {}): string {
  const header = new Uint8Array(37);
  header[32] = extensions ? flags | 0x80 : flags;
  const attested = new Uint8Array([...new Uint8Array(16), 0, CRED_ID.length, ...CRED_ID]);
  const authData = new Uint8Array([
    ...header,
    ...attested,
    ...encodeCBOR(key),
    ...(extensions ? encodeCBOR(extensions) : []),
  ]);
  const attestation = new Map<string, unknown>([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]);
  return base64url.encode(encodeCBOR(attestation as never));
}

describe('extractP256PublicKey', () => {
  it('returns the x and y coordinates', () => {
    expect(extractP256PublicKey(attestationObject())).toEqual({ x: bytesToHex(X), y: bytesToHex(Y) });
  });

  it('ignores extension data after the key', () => {
    const result = extractP256PublicKey(attestationObject({ extensions: new Map([['credProtect', true]]) }));
    expect(result).toEqual({ x: bytesToHex(X), y: bytesToHex(Y) });
  });

  it('rejects an attestation without a public key', () => {
    expect(() => extractP256PublicKey(attestationObject({ flags: 0x05 }))).toThrow('No public key in attestation');
  });

  it('rejects a key that is not P-256', () => {
    expect(() => extractP256PublicKey(attestationObject({ key: coseKey({ [-1]: 2 }) }))).toThrow('not P-256');
  });

  it('rejects short coordinates', () => {
    expect(() => extractP256PublicKey(attestationObject({ key: coseKey({ [-2]: X.slice(1) }) }))).toThrow(
      'missing EC2 coordinates',
    );
  });
});
