// ─── Axios mock (must precede all imports) ────────────────────────────────────
// axios.create() runs at httpService module-load time.  We capture the two
// interceptor functions it registers so tests can invoke them directly,
// bypassing the real HTTP stack while still exercising the interceptor logic.

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  rejectStepUp,
  setStepUpHandler,
  setUnauthenticatedHandler,
  clearBffNonceCache,
} from '@/services/httpService';
import { useAuthStore }     from '@/stores/authStore';
import { refreshAccessToken } from '@/utils/auth/refresh';
import { StepUpCancelledError } from '@/utils/auth/errors';
import { router }           from 'expo-router';

jest.mock('axios', () => {
  const _reqHandlers: ((cfg: unknown) => unknown)[] = [];
  const _resHandlers: [(r: unknown) => unknown, (e: unknown) => Promise<unknown>][] = [];

  const instance = Object.assign(jest.fn(), {
    interceptors: {
      request:  { use: (fn: (c: unknown) => unknown) => _reqHandlers.push(fn) },
      response: {
        use: (
          ok:  (r: unknown) => unknown,
          err: (e: unknown) => Promise<unknown>,
        ) => _resHandlers.push([ok, err]),
      },
    },
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  });

  return {
    __esModule: true,
    default: { create: jest.fn(() => instance) },
    _instance:    instance,
    _reqHandlers,
    _resHandlers,
  };
});

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('uuid',        () => ({ v4: jest.fn(() => 'test-uuid') }));
jest.mock('@/appKeys',   () => ({ Config: { API_BASE_URL: 'https://api.test.kokio.io' } }));

jest.mock('@/utils/auth/dpopProof', () => ({
  buildDpopProof: jest.fn().mockResolvedValue('mock-dpop-proof'),
}));

jest.mock('@/utils/auth/refresh', () => {
  class TokenFamilyRevokedError extends Error {
    readonly code = 'TOKEN_FAMILY_REVOKED' as const;
    constructor() {
      super('Token family revoked');
      this.name = 'TokenFamilyRevokedError';
    }
  }
  return { TokenFamilyRevokedError, refreshAccessToken: jest.fn() };
});

jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AxiosMod = {
  _instance:   jest.Mock;
  _resHandlers: [(r: unknown) => unknown, (e: unknown) => Promise<unknown>][];
};

function getResErrorHandler(): (e: unknown) => Promise<unknown> {
  return (jest.requireMock('axios') as AxiosMod)._resHandlers[0][1];
}

function getInstanceMock(): jest.Mock {
  return (jest.requireMock('axios') as AxiosMod)._instance;
}

function make401(opts: {
  wwwAuth?:    string;
  code?:       string;
  authTimeAge?: number;
} = {}): { config: Record<string, unknown>; response: Record<string, unknown> } {
  return {
    config: { method: 'GET', url: '/test', headers: {} },
    response: {
      status: 401,
      headers: opts.wwwAuth ? { 'www-authenticate': opts.wwwAuth } : {},
      data: {
        ...(opts.code        ? { code: opts.code }                          : {}),
        ...(opts.authTimeAge != null ? { required_auth_time_age: opts.authTimeAge } : {}),
      },
    },
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LIVE_TOKENS = {
  access_token:  'at-live',
  refresh_token: 'rt-live',
  id_token:      'it-live',
  expires_at:    Date.now() + 900_000,
  auth_time:     1_700_000_000,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockClearTokens  = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
const mockUnauthHandler = jest.fn();
const mockStepUpHandler = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockClearTokens.mockResolvedValue(undefined);
  clearBffNonceCache();

  (useAuthStore.getState as jest.Mock).mockReturnValue({
    tokens:      LIVE_TOKENS,
    clearTokens: mockClearTokens,
  });

  setUnauthenticatedHandler(mockUnauthHandler);
  setStepUpHandler(mockStepUpHandler);
});

afterEach(() => {
  // Drain any parked step-up entries so module state doesn't leak between tests.
  rejectStepUp(new Error('afterEach drain'));
});

// ─── Branch 1: DPoP nonce challenge ──────────────────────────────────────────

describe('401 WWW-Authenticate: DPoP error="use_dpop_nonce"', () => {
  it('retries the original request exactly once and does not clear tokens', async () => {
    const instance = getInstanceMock();
    const error    = make401({ wwwAuth: 'DPoP error="use_dpop_nonce"' });

    instance.mockResolvedValueOnce({ ok: true });

    await getResErrorHandler()(error);

    // The interceptor must call instance(cfg) for the one allowed retry.
    expect(instance).toHaveBeenCalledTimes(1);
    expect(instance).toHaveBeenCalledWith(
      expect.objectContaining({ _retried: true }),
    );

    // Session must remain intact — no token clear, no unauthenticated event.
    expect(mockClearTokens).not.toHaveBeenCalled();
    expect(mockUnauthHandler).not.toHaveBeenCalled();
  });
});

// ─── Branch 2: STEP_UP_REQUIRED cancellation ─────────────────────────────────

describe('401 body code: STEP_UP_REQUIRED — user cancels', () => {
  it('rejects with StepUpCancelledError and does not clear tokens or fire the unauthenticated handler', async () => {
    const error   = make401({ code: 'STEP_UP_REQUIRED', authTimeAge: 300 });
    const pending = getResErrorHandler()(error);

    // The interceptor is now parked in waitForStepUp; simulate user dismissing the prompt.
    rejectStepUp();

    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);

    // Session must survive cancellation — tokens are still valid.
    expect(mockClearTokens).not.toHaveBeenCalled();
    expect(mockUnauthHandler).not.toHaveBeenCalled();
  });
});

// ─── Branch 3: INVALID_TOKEN + refresh failure ────────────────────────────────

describe('401 body code: INVALID_TOKEN — refresh fails', () => {
  it('clears tokens and calls the unauthenticated handler when refresh throws a generic error', async () => {
    const error = make401({ code: 'INVALID_TOKEN' });

    (refreshAccessToken as jest.Mock).mockRejectedValueOnce(
      new Error('network timeout'),
    );

    // The interceptor rejects after handleAuthFailure completes.
    await expect(getResErrorHandler()(error)).rejects.toBeDefined();

    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    expect(mockUnauthHandler).toHaveBeenCalledTimes(1);
    expect(router.replace as jest.Mock).toHaveBeenCalledWith('/');
  });
});
