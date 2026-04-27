export type { paths, components, operations } from './generated/koKioBff';

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

// ─── BffError ─────────────────────────────────────────────────────────────────

export class BffError extends Error {
  readonly code: string;
  readonly correlationId: string | null;

  constructor(envelope: BffErrorEnvelope) {
    super(envelope.message);
    this.name = 'BffError';
    this.code = envelope.code;
    this.correlationId = envelope.correlationId;
  }
}

// ─── unwrapBffResponse ────────────────────────────────────────────────────────
// The httpService interceptor already strips the Axios wrapper and returns the
// raw BFF envelope as the resolved value. This helper asserts success and
// extracts .data, or throws BffError on success: false.

export async function unwrapBffResponse<T>(promise: Promise<unknown>): Promise<T> {
  const envelope = (await promise) as BffEnvelope<T>;
  if (!envelope.success) {
    throw new BffError(envelope);
  }
  return envelope.data;
}
