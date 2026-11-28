import { decodeCBOR, decodePartialCBOR } from '@levischuck/tiny-cbor';
import { base64url } from 'jose';
import { type Hex, bytesToHex } from 'viem';
import { AuthError } from './errors';

// Fixed authData layout (WebAuthn §6.1): rpIdHash 32, flags 1, signCount 4, then
// attested credential data: aaguid 16, credentialId length 2, credentialId, public key.
const FLAGS_OFFSET = 32;
const AAGUID_OFFSET = 37;
const CRED_ID_LENGTH_OFFSET = AAGUID_OFFSET + 16;
const CRED_ID_OFFSET = CRED_ID_LENGTH_OFFSET + 2;
const ATTESTED_CREDENTIAL_DATA_FLAG = 0x40;

// COSE key labels and values for an EC2 P-256 key (RFC 9053).
const COSE_KTY = 1;
const COSE_CRV = -1;
const COSE_X = -2;
const COSE_Y = -3;
const KTY_EC2 = 2;
const CRV_P256 = 1;
const COORDINATE_LENGTH = 32;

function fail(message: string): never {
  throw new AuthError('REGISTRATION_FAILED', undefined, message);
}

/**
 * Reads the P-256 public key (x, y) from a passkey's base64url attestation object.
 * The Kokio SDK needs these to compute the smart account address.
 */
export function extractP256PublicKey(attestationObject: string): { x: Hex; y: Hex } {
  const attestation = decodeCBOR(base64url.decode(attestationObject));
  const authData = attestation instanceof Map ? attestation.get('authData') : undefined;
  if (!(authData instanceof Uint8Array) || authData.length < CRED_ID_OFFSET) fail('No authData in attestation');
  if ((authData[FLAGS_OFFSET] & ATTESTED_CREDENTIAL_DATA_FLAG) === 0) fail('No public key in attestation');

  const credIdLength = (authData[CRED_ID_LENGTH_OFFSET] << 8) | authData[CRED_ID_LENGTH_OFFSET + 1];
  // Partial decode: extension data may follow the key.
  const [coseKey] = decodePartialCBOR(authData, CRED_ID_OFFSET + credIdLength);
  if (!(coseKey instanceof Map)) fail('No public key in attestation');

  const x = coseKey.get(COSE_X);
  const y = coseKey.get(COSE_Y);
  if (coseKey.get(COSE_KTY) !== KTY_EC2 || coseKey.get(COSE_CRV) !== CRV_P256) fail('Public key is not P-256');
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== COORDINATE_LENGTH || y.length !== COORDINATE_LENGTH) {
    fail('COSE public key missing EC2 coordinates');
  }
  return { x: bytesToHex(x), y: bytesToHex(y) };
}
