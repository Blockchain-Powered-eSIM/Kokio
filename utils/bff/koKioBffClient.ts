import { BffError } from './errors';

export type { paths, components, operations } from './generated/koKioBff';
export { BffError, formatBffError } from './errors';

// ─── BFF response envelope types ─────────────────────────────────────────────

interface BffSuccessEnvelope<T> {
  success: true;
  correlationId: string | null;
  message: string;
  data: T;
}

interface BffErrorEnvelope {
  success: false;
  code: string;
  correlationId: string | null;
  message: string;
}

type BffEnvelope<T> = BffSuccessEnvelope<T> | BffErrorEnvelope;

// ─── unwrapBffResponse ────────────────────────────────────────────────────────
// The httpService interceptor already strips the Axios wrapper and returns the
// raw BFF envelope as the resolved value. This helper asserts success and
// extracts .data, or throws BffError on success: false.

export async function unwrapBffResponse<T>(promise: Promise<unknown>): Promise<T> {
  const envelope = (await promise) as BffEnvelope<T>;
  if (!envelope.success) {
    throw new BffError(envelope.code, undefined, envelope.message);
  }
  return envelope.data;
}
