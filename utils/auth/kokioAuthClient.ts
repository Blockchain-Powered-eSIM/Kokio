import type { paths, components } from './generated/kokioAuth';
import { Config } from '@/appKeys';
import { v4 as uuidv4 } from 'uuid';
import { AuthError } from './errors';

// ─── Re-export generated types consumed across the auth layer ────────────────

export type { components };

export type RegisterBeginRequest      = components['schemas']['RegisterBeginRequest'];
export type RegisterCompleteRequest   = components['schemas']['RegisterCompleteRequest'];
export type RegisterCompleteData      = components['schemas']['RegisterCompleteData'];

export type LoginBeginRequest         = components['schemas']['LoginBeginRequest'];
export type LoginCompleteRequest      = components['schemas']['LoginCompleteRequest'];
export type LoginCompleteData         = components['schemas']['LoginCompleteData'];

export type TokenRequest              = components['schemas']['TokenRequest'];
export type TokenResponse             = components['schemas']['TokenResponse'];
export type TokenRevokeRequest        = components['schemas']['TokenRevokeRequest'];

export type StepUpCompleteRequest     = components['schemas']['StepUpCompleteRequest'];
export type StepUpTokenResponse       = components['schemas']['StepUpTokenResponse'];

export type RegistrationOptionsResponse   = components['schemas']['RegistrationOptionsResponse'];
export type AuthenticationOptionsResponse = components['schemas']['AuthenticationOptionsResponse'];

export type ErrorResponse = components['schemas']['ErrorResponse'];

// ─── DPoP proof builder type ─────────────────────────────────────────────────
// A function that produces a fresh compact DPoP proof JWS for one request.
// Receives the current cached nonce for the origin (undefined on first call to
// a fresh origin). See utils/auth/dpopProof.ts for the concrete implementation.

export type DpopProofBuilder = (nonce?: string) => Promise<string>;

// ─── DPoP nonce error ────────────────────────────────────────────────────────

export class DpopNonceError extends Error {
  readonly code = 'DPOP_NONCE_ERROR' as const;
  constructor() {
    super('DPoP nonce challenge failed after one retry');
    this.name = 'DpopNonceError';
  }
}

// ─── Per-origin nonce cache (RFC 9449 §8) ────────────────────────────────────
// Populated from every DPoP-Nonce response header (successful or not) so future
// proofs include the nonce proactively, avoiding a round-trip challenge entirely.

const _nonceCache = new Map<string, string>();

export function clearNonceCache(): void {
  _nonceCache.clear();
}

// ─── Interceptor slots (AUTH-301 / AUTH-302) ─────────────────────────────────

type RequestInterceptor  = (init: RequestInit, url: string) => Promise<RequestInit>;
type ResponseInterceptor = (res: Response, init: RequestInit, url: string) => Promise<Response>;

let _onRequest:  RequestInterceptor  | null = null;
let _onResponse: ResponseInterceptor | null = null;

export function setRequestInterceptor(fn: RequestInterceptor)   { _onRequest  = fn; }
export function setResponseInterceptor(fn: ResponseInterceptor) { _onResponse = fn; }

// ─── Internal fetch helper ────────────────────────────────────────────────────

type Method = 'GET' | 'POST';

async function authFetch<T>(
  path: string,
  method: Method,
  body?: Record<string, unknown> | string,
  extraHeaders?: Record<string, string>,
  formEncoded = false,
  buildProof?: DpopProofBuilder,
): Promise<T> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const url    = `${base}${path}`;
  const origin = new URL(url).origin;

  for (let attempt = 0; attempt <= 1; attempt++) {
    const headers: Record<string, string> = {
      'x-correlation-id': uuidv4(),
      ...extraHeaders,
    };

    if (body !== undefined) {
      headers['Content-Type'] = formEncoded
        ? 'application/x-www-form-urlencoded'
        : 'application/json';
    }

    // Build a fresh DPoP proof for this attempt, including any cached nonce.
    if (buildProof) {
      headers['DPoP'] = await buildProof(_nonceCache.get(origin));
    }

    let init: RequestInit = {
      method,
      headers,
      body: body === undefined
        ? undefined
        : formEncoded
          ? (body as string)
          : JSON.stringify(body),
    };

    if (_onRequest) init = await _onRequest(init, url);

    let res = await fetch(url, init);

    // Proactively cache any nonce the server supplies (RFC 9449 §8).
    // We do this before the nonce-challenge check so that on retry the
    // updated nonce is already in the map when buildProof is called above.
    const freshNonce = res.headers.get('DPoP-Nonce');
    if (freshNonce) _nonceCache.set(origin, freshNonce);

    // Detect nonce challenge: the server wants us to include its nonce in the
    // proof. Retry once; if the server rejects again, give up.
    if (buildProof && res.status === 401) {
      const wwwAuth = res.headers.get('WWW-Authenticate') ?? '';
      if (wwwAuth.includes('use_dpop_nonce')) {
        if (attempt === 1) throw new DpopNonceError();
        continue; // retry — next iteration picks up freshNonce from cache
      }
    }

    if (_onResponse) res = await _onResponse(res, init, url);

    // Read the body as text first so we can inspect it regardless of Content-Type.
    // Some error paths return plain text or HTML — calling res.json() directly on
    // those throws a SyntaxError that has no userMessage and surfaces as a raw
    // "Unexpected token T" crash in logs.
    const text = await res.text();
    const contentType = res.headers.get('content-type') ?? '';

    if (__DEV__) {
      console.log(`[authFetch] ${method} ${path} → ${res.status} (${contentType})\n`, text.slice(0, 500));
    }

    if (!contentType.includes('application/json')) {
      throw new AuthError('SERVER_ERROR', res.status, text || `HTTP ${res.status}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AuthError('SERVER_ERROR', res.status, `HTTP ${res.status}: invalid JSON`);
    }
  }

  // Unreachable: the loop always returns or throws. Satisfies TS control flow.
  throw new DpopNonceError();
}

// ─── Typed endpoint wrappers ─────────────────────────────────────────────────

export const kokioAuthClient = {

  registerBegin(body: RegisterBeginRequest) {
    type R = paths['/v1/auth/register/begin']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/register/begin', 'POST', body as unknown as Record<string, unknown>);
  },

  registerComplete(body: RegisterCompleteRequest) {
    type R = paths['/v1/auth/register/complete']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/register/complete', 'POST', body as unknown as Record<string, unknown>);
  },

  loginBegin(body: LoginBeginRequest) {
    type R = paths['/v1/auth/login/begin']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/login/begin', 'POST', body as unknown as Record<string, unknown>);
  },

  loginComplete(body: LoginCompleteRequest) {
    type R = paths['/v1/auth/login/complete']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/login/complete', 'POST', body as unknown as Record<string, unknown>);
  },

  authorize(params: paths['/v1/auth/authorize']['get']['parameters']['query']) {
    type R = void; // 302 redirect — caller follows via expo-linking
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const base = Config.AUTH_SERVER_BASE_URL ?? '';
    return `${base}/v1/auth/authorize?${qs}` as unknown as R;
  },

  /**
   * Token issuance / refresh.
   * `buildProof` receives the current cached DPoP nonce for the auth server
   * origin (undefined on first ever call) and must return a compact DPoP proof
   * JWS. On a `use_dpop_nonce` 401 the proof is rebuilt with the server nonce
   * and the request is retried once automatically.
   */
  token(params: TokenRequest, buildProof: DpopProofBuilder) {
    type R = paths['/v1/auth/token']['post']['responses']['200']['content']['application/json'];
    const body = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return authFetch<R>(
      '/v1/auth/token',
      'POST',
      body as unknown as Record<string, unknown>,
      {},
      true,
      buildProof,
    );
  },

  revokeToken(body: TokenRevokeRequest) {
    type R = paths['/v1/auth/token/revoke']['post']['responses']['200']['content']['application/json'];
    const encoded = new URLSearchParams(body as unknown as Record<string, string>).toString();
    return authFetch<R>(
      '/v1/auth/token/revoke',
      'POST',
      encoded as unknown as Record<string, unknown>,
      {},
      true,
    );
  },

  stepUpBegin(body: LoginBeginRequest) {
    type R = paths['/v1/auth/stepup/begin']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/stepup/begin', 'POST', body as unknown as Record<string, unknown>);
  },

  /**
   * Step-up authentication completion.
   * Same nonce retry semantics as `token()`.
   */
  stepUpComplete(body: StepUpCompleteRequest, buildProof: DpopProofBuilder) {
    type R = paths['/v1/auth/stepup/complete']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>(
      '/v1/auth/stepup/complete',
      'POST',
      body as unknown as Record<string, unknown>,
      {},
      false,
      buildProof,
    );
  },
};
