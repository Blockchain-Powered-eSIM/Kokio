import { Buffer } from "buffer";

export function parseDEREncodedSignature(signature: Uint8Array): {
  r: string;
  s: string;
} {
  let offset = 0;
  if (signature[offset++] !== 0x30) throw new Error("Invalid DER sequence");

  const length = signature[offset++];
  if (signature[offset++] !== 0x02) throw new Error("Expected integer for r");

  const rLen = signature[offset++];
  const r = signature.slice(offset, offset + rLen);
  offset += rLen;

  if (signature[offset++] !== 0x02) throw new Error("Expected integer for s");
  const sLen = signature[offset++];
  const s = signature.slice(offset, offset + sLen);

  return {
    r: Buffer.from(r).toString("hex"),
    s: Buffer.from(s).toString("hex"),
  };
}

export function base64UrlToBuffer(base64url: string): Buffer {
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd((base64url.length + 3) & ~3, "=");
  return Buffer.from(base64, "base64");
}

export function hexToArrayBuffer(hexString: string): ArrayBuffer {
  const cleanHex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}