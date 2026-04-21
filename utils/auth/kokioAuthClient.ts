import type { paths, components } from './generated/kokioAuth';
import { Config } from '@/appKeys';
import { v4 as uuidv4 } from 'uuid';

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

export type RegistrationOptionsResponse  = components['schemas']['RegistrationOptionsResponse'];
export type AuthenticationOptionsResponse = components['schemas']['AuthenticationOptionsResponse'];

export type ErrorResponse             = components['schemas']['ErrorResponse'];

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
): Promise<T> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    'x-correlation-id': uuidv4(),
    ...extraHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = formEncoded
      ? 'application/x-www-form-urlencoded'
      : 'application/json';
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

  if (_onResponse) res = await _onResponse(res, init, url);

  const json = await res.json() as T;
  return json;
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

  token(params: TokenRequest, dpopProof: string) {
    type R = paths['/v1/auth/token']['post']['responses']['200']['content']['application/json'];
    const body = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return authFetch<R>('/v1/auth/token', 'POST', body as unknown as Record<string, unknown>, { DPoP: dpopProof }, true);
  },

  revokeToken(body: TokenRevokeRequest) {
    type R = paths['/v1/auth/token/revoke']['post']['responses']['200']['content']['application/json'];
    const encoded = new URLSearchParams(body as unknown as Record<string, string>).toString();
    return authFetch<R>('/v1/auth/token/revoke', 'POST', encoded as unknown as Record<string, unknown>, {}, true);
  },

  stepUpBegin(body: LoginBeginRequest) {
    type R = paths['/v1/auth/stepup/begin']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/stepup/begin', 'POST', body as unknown as Record<string, unknown>);
  },

  stepUpComplete(body: StepUpCompleteRequest, dpopProof: string) {
    type R = paths['/v1/auth/stepup/complete']['post']['responses']['200']['content']['application/json'];
    return authFetch<R>('/v1/auth/stepup/complete', 'POST', body as unknown as Record<string, unknown>, { DPoP: dpopProof });
  },
};
