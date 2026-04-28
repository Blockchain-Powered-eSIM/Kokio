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
  let envelope: BffEnvelope<T>;
  try {
    envelope = (await promise) as BffEnvelope<T>;
  } catch (rejection) {
    // httpService rejects non-2xx responses with the raw AxiosResponse object.
    // Extract the BFF error envelope from .data if present.
    const resp = rejection as { data?: unknown; status?: number } | null;
    const body = resp?.data as BffErrorEnvelope | undefined;
    if (body?.success === false && typeof body.code === 'string') {
      throw new BffError(body.code, resp?.status, body.message);
    }
    throw rejection;
  }
  if (!envelope.success) {
    throw new BffError(envelope.code, undefined, envelope.message);
  }
  return envelope.data;
}
