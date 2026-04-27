import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Allow callers to opt out of auth header injection for public endpoints.
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
  }
}
import qs from 'qs';
import { v4 as uuidv4 } from 'uuid';
import { router } from 'expo-router';

import { Config } from '@/appKeys';
import { useAuthStore } from '@/stores/authStore';
import { buildDpopProof } from '@/utils/auth/dpopProof';
import { refreshAccessToken, TokenFamilyRevokedError } from '@/utils/auth/refresh';
import { StepUpCancelledError } from '@/utils/auth/errors';

// ─── Auth event callbacks ─────────────────────────────────────────────────────
// Register these in your root provider before any authenticated request fires.
// AUTH-502 wires up setStepUpHandler; AUTH-506 wires up setUnauthenticatedHandler.

/** Metadata forwarded to the step-up UI so it can show context-aware copy. */
export type StepUpHint = {
  /** e.g. "POST /v1/order" — for UX telemetry / copy. */
  operationName: string;
  /** Seconds since last biometric auth that the server requires (from 401 body). */
  requiredAuthTimeAge?: number;
};

let _onStepUpNeeded: ((hint: StepUpHint) => void) | null = null;
let _onUnauthenticated: (() => void) | null = null;

export function setStepUpHandler(fn: (hint: StepUpHint) => void): void { _onStepUpNeeded    = fn; }
export function setUnauthenticatedHandler(fn: () => void): void        { _onUnauthenticated = fn; }

// ─── Step-up queue (AUTH-502) ─────────────────────────────────────────────────
// All concurrent requests that hit STEP_UP_REQUIRED park here. AUTH-502 calls
// resolveStepUp() on success or rejectStepUp(err) on cancellation / failure.

type StepUpEntry = { resolve: () => void; reject: (e: Error) => void };
let _stepUpQueue: StepUpEntry[] = [];
let _stepUpActive = false;

export function resolveStepUp(): void {
  const entries = _stepUpQueue.splice(0);
  _stepUpActive = false;
  entries.forEach(({ resolve }) => resolve());
}

export function rejectStepUp(err: Error = new StepUpCancelledError()): void {
  const entries = _stepUpQueue.splice(0);
  _stepUpActive = false;
  entries.forEach(({ reject }) => reject(err));
}

function waitForStepUp(hint: StepUpHint): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    _stepUpQueue.push({ resolve, reject });
    if (!_stepUpActive) {
      _stepUpActive = true;
      _onStepUpNeeded?.(hint);
    }
  });
}

// ─── Refresh mutex ────────────────────────────────────────────────────────────
// Concurrent callers that all need a refresh share a single in-flight promise.

// ─── Auth failure ─────────────────────────────────────────────────────────────

async function handleAuthFailure(): Promise<void> {
  await useAuthStore.getState().clearTokens();
  _onUnauthenticated?.();
  // Navigate to the landing/auth screen — AUTH-506 may override via the callback above.
  router.replace('/');
}

// ─── Per-origin BFF nonce cache ───────────────────────────────────────────────
// Mirrors the auth-server nonce cache in kokioAuthClient but scoped to the BFF.

const _bffNonceCache = new Map<string, string>();

export function clearBffNonceCache(): void { _bffNonceCache.clear(); }

function bffOrigin(): string | null {
  const base = Config.API_BASE_URL;
  if (!base) return null;
  try { return new URL(base).origin; } catch { return null; }
}

// ─── Retry-aware config ───────────────────────────────────────────────────────

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// ─── Axios instance ───────────────────────────────────────────────────────────

const instance: AxiosInstance = axios.create({
  timeout: 30_000,
  paramsSerializer: (params) => qs.stringify(params),
});

// ── Request interceptor ───────────────────────────────────────────────────────
// 1. Proactive refresh if expires_at - now < 60 s.
// 2. Attach Authorization: DPoP <AT> and DPoP: <proof> (with ath).
instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  config.headers['x-correlation-id'] = uuidv4();
  config.baseURL ??= Config.API_BASE_URL;

  if (config.skipAuth) return config; // public endpoint — skip auth entirely

  const stored = useAuthStore.getState().tokens;
  if (!stored) return config; // unauthenticated request — no auth headers

  let tokens = stored;

  // Proactive refresh: act before the AT expires mid-flight.
  if (tokens.expires_at - Date.now() < 60_000) {
    try { tokens = await refreshAccessToken(); }
    catch { /* fall through — 401 handler will retry refresh reactively */ }
  }

  // htu = full URL without query / fragment (RFC 9449 §4.2)
  const base   = (config.baseURL ?? '').replace(/\/$/, '');
  const path   = config.url ?? '';
  const htu    = buildHtu(base, path);
  const htm    = (config.method ?? 'get').toUpperCase();
  const origin = htu ? safeOrigin(htu) : null;
  const nonce  = origin ? _bffNonceCache.get(origin) : undefined;

  const proof = await buildDpopProof({
    htu,
    htm,
    nonce,
    accessToken: tokens.access_token,
  });

  config.headers['Authorization'] = `DPoP ${tokens.access_token}`;
  config.headers['DPoP']          = proof;

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
// Success: cache BFF nonce + unwrap .data.
// 401 INVALID_TOKEN   (3): refresh once, retry.
// 401 STEP_UP_REQUIRED(4): wait for step-up, retry.
// 401 use_dpop_nonce  (5): nonce cached above, retry.
// Refresh failure     (6): clear tokens, dispatch UNAUTHENTICATED.
instance.interceptors.response.use(
  (res: AxiosResponse) => {
    // Proactively cache any BFF-issued nonce for the next request.
    const nonce  = res.headers['dpop-nonce'] as string | undefined;
    const origin = bffOrigin();
    if (nonce && origin) _bffNonceCache.set(origin, nonce);

    return res.data as unknown;
  },

  async (error: AxiosError) => {
    const cfg    = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const body   = error.response?.data as { code?: string; error?: string; required_auth_time_age?: number } | undefined;
    const wwwAuth = (error.response?.headers?.['www-authenticate'] as string | undefined) ?? '';

    // Cache any nonce from the error response too (RFC 9449 §8).
    const errNonce = error.response?.headers?.['dpop-nonce'] as string | undefined;
    const origin   = bffOrigin();
    if (errNonce && origin) _bffNonceCache.set(origin, errNonce);

    // Non-401 or already retried — pass through.
    if (status !== 401 || !cfg || cfg._retried) {
      return Promise.reject(error.response ?? error);
    }
    cfg._retried = true;

    // 5. DPoP nonce challenge from BFF — nonce is now cached, retry re-builds proof.
    if (wwwAuth.includes('use_dpop_nonce')) {
      return instance(cfg);
    }

    // 4. Step-up required — park request until AUTH-602 resolves step-up.
    //    The BFF may return the error code in either `error` or `code` field.
    //    On cancel / failure: reject the queued request only — the session is
    //    still valid, so do NOT clear tokens or navigate away.
    if (body?.code === 'STEP_UP_REQUIRED' || body?.error === 'STEP_UP_REQUIRED') {
      const hint: StepUpHint = {
        operationName:       `${(cfg.method ?? 'GET').toUpperCase()} ${cfg.url ?? ''}`,
        requiredAuthTimeAge: body?.required_auth_time_age,
      };
      try {
        await waitForStepUp(hint);
        return instance(cfg);
      } catch (stepErr) {
        return Promise.reject(stepErr);
      }
    }

    // 3. Invalid / expired token — refresh once, retry with new AT.
    if (body?.code === 'INVALID_TOKEN' || wwwAuth.includes('invalid_token')) {
      try {
        await refreshAccessToken();
        return instance(cfg);
      } catch (refreshErr) {
        // TokenFamilyRevokedError: tokens already cleared in refresh.ts; just navigate.
        // Any other error: clear and navigate via handleAuthFailure().
        if (!(refreshErr instanceof TokenFamilyRevokedError)) {
          await handleAuthFailure();
        } else {
          _onUnauthenticated?.();
          router.replace('/');
        }
        return Promise.reject(error.response ?? error);
      }
    }

    // Other 401 (e.g. UNAUTHORIZED on a public endpoint) — pass through as-is.
    return Promise.reject(error.response ?? error);
  },
);

// ─── URL helpers ──────────────────────────────────────────────────────────────

function buildHtu(base: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const u = new URL(path);
    return `${u.origin}${u.pathname}`;
  }
  try {
    const u = new URL(base + path);
    return `${u.origin}${u.pathname}`;
  } catch {
    return base + path;
  }
}

function safeOrigin(url: string): string | null {
  try { return new URL(url).origin; } catch { return null; }
}

// ─── Public API (identical interface to the original httpService.js) ──────────

const EMPTY = {};

const api = {
  getHeaders() {
    return { 'x-correlation-id': uuidv4() };
  },
  getBaseURL() {
    return Config.API_BASE_URL;
  },
  getConfig() {
    return {
      baseURL: Config.API_BASE_URL ?? '',
      timeout: 30_000,
      paramsSerializer: (params: Record<string, unknown>) => qs.stringify(params),
    };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(url: string, params: Record<string, unknown> = EMPTY, config: AxiosRequestConfig = this.getConfig()): Promise<any> {
    return instance.get(url, { ...config, params });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post(url: string, data: Record<string, unknown> = EMPTY, config: AxiosRequestConfig = this.getConfig()): Promise<any> {
    return instance.post(url, data, config);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put(url: string, data: Record<string, unknown> = EMPTY, config: AxiosRequestConfig = this.getConfig()): Promise<any> {
    return instance.put(url, data, config);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(url: string, config: AxiosRequestConfig = this.getConfig()): Promise<any> {
    return instance.delete(url, config);
  },
};

export default api;
