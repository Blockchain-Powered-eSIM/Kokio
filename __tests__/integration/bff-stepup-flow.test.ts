/**
 * Integration: BFF step-up flow
 *
 * The httpService interceptor (not the BFF modules) handles the step-up
 * ceremony.  From the BFF layer's perspective, a step-up-required order either:
 *   - Resolves if the user completes biometrics (interceptor retries with new AT)
 *   - Rejects with StepUpCancelledError if the user cancels
 *
 * These tests verify:
 *   (1) StepUpCancelledError propagates correctly through all BFF call sites.
 *   (2) The auth session (tokens) is NOT cleared on step-up cancellation.
 *   (3) The same order request can be retried and succeeds after step-up.
 *   (4) Unrelated BFF calls (catalogue, compatibility) are unaffected.
 *
 * httpService is mocked so tests control when step-up errors appear.
 * authStore is mocked to assert token-clearing behaviour.
 */

const mockClearTokens  = jest.fn<Promise<void>, []>();
const mockSetTokens    = jest.fn<Promise<void>, [unknown]>();

// Stable token object — tests check it is NOT nullified after step-up cancel.
const mockLiveTokens = {
  access_token:  'at-live-1',
  refresh_token: 'rt-live-1',
  id_token:      'it-live-1',
  expires_at:    Date.now() + 900_000,
  auth_time:     1_700_000_000,
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      tokens:      mockLiveTokens,
      clearTokens: mockClearTokens,
      setTokens:   mockSetTokens,
    })),
  },
}));

jest.mock('@/services/httpService', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    post:      jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

import api from '@/services/httpService';
import { createOrder }            from '@/utils/bff/order';
import { checkEsimCompatibility } from '@/utils/bff/esim';
import { getCatalogue }           from '@/utils/bff/catalogue';
import { StepUpCancelledError }   from '@/utils/auth/errors';
import { BffError }               from '@/utils/bff/errors';
import { useAuthStore }           from '@/stores/authStore';

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAN_ID      = 'us-5gb-30d';
const DEVICE_WALLET = '0xDeviceWallet000';
const ESIM_ID      = '0xMyESIM01234';

const NEW_ORDER_REQ = {
  catalogueId:    PLAN_ID,
  currency:       'USD',
  isNewESim:      true  as const,
  isCryptoPayment: true as const,
  payeeAddress:   DEVICE_WALLET,
};

const TOPUP_ORDER_REQ = {
  catalogueId:    PLAN_ID,
  currency:       'USD',
  isNewESim:      false as const,
  eSimId:         ESIM_ID,
  isCryptoPayment: true as const,
  payeeAddress:   DEVICE_WALLET,
};

const ORDER_RESPONSE = {
  orderId: 'ord-after-stepup',
  esimId:  '0xNewESIM01',
  iccid:   '89012601234567890',
  installationDetails: { qrcode: 'LPA:1$...', appleInstallationUrl: 'https://...' },
};

function orderEnvelope(data = ORDER_RESPONSE) {
  return { success: true, correlationId: null, message: '', data };
}

function compatEnvelope(results: unknown[] = []) {
  return { success: true, correlationId: null, message: '', data: { results } };
}

function plansEnvelope() {
  return {
    success: true, correlationId: null, message: '',
    data: { plans: [{ catalogueId: PLAN_ID, actualSellingPrice: 12.99 }] },
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset getState to always return mockLiveTokens (some tests may override)
  (useAuthStore.getState as jest.Mock).mockReturnValue({
    tokens:      mockLiveTokens,
    clearTokens: mockClearTokens,
    setTokens:   mockSetTokens,
  });
});

// ─── StepUpCancelledError propagation ────────────────────────────────────────

describe('StepUpCancelledError propagation from BFF order calls', () => {
  it('createOrder propagates StepUpCancelledError (new eSIM)', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
  });

  it('createOrder propagates StepUpCancelledError (topup)', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    await expect(createOrder(TOPUP_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
  });

  it('StepUpCancelledError is distinguishable from BffError', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    try {
      await createOrder(NEW_ORDER_REQ as any);
    } catch (err) {
      expect(err).toBeInstanceOf(StepUpCancelledError);
      expect(err).not.toBeInstanceOf(BffError);
    }
  });

  it('StepUpCancelledError carries the STEP_UP_CANCELLED code', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toMatchObject({
      code: 'STEP_UP_CANCELLED',
    });
  });
});

// ─── Session intact after cancellation ───────────────────────────────────────

describe('session is intact after step-up cancellation', () => {
  it('clearTokens is NOT called when the user cancels step-up', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it('clearTokens is NOT called on topup step-up cancellation', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    await expect(createOrder(TOPUP_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it('auth tokens remain accessible after step-up cancellation', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);

    const { tokens } = useAuthStore.getState();
    expect(tokens).toBe(mockLiveTokens);
    expect(tokens!.access_token).toBe('at-live-1');
  });

  it('session tokens survive multiple consecutive step-up cancellations', async () => {
    mockPost.mockRejectedValue(new StepUpCancelledError());

    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    await expect(createOrder(TOPUP_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);

    expect(mockClearTokens).not.toHaveBeenCalled();
    expect(useAuthStore.getState().tokens).toBe(mockLiveTokens);
  });
});

// ─── Retry after step-up completes ───────────────────────────────────────────

describe('order succeeds when retried after step-up completes', () => {
  it('user cancels first attempt, then completes biometrics — retry succeeds', async () => {
    mockPost
      .mockRejectedValueOnce(new StepUpCancelledError())  // first: user cancels
      .mockResolvedValueOnce(orderEnvelope());             // second: step-up done

    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);

    const result = await createOrder(NEW_ORDER_REQ as any);
    expect(result.orderId).toBe('ord-after-stepup');
  });

  it('retry sends the identical request body as the original attempt', async () => {
    mockPost
      .mockRejectedValueOnce(new StepUpCancelledError())
      .mockResolvedValueOnce(orderEnvelope());

    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    await createOrder(NEW_ORDER_REQ as any);

    const [firstUrl,  firstBody]  = mockPost.mock.calls[0];
    const [secondUrl, secondBody] = mockPost.mock.calls[1];
    expect(firstUrl).toBe(secondUrl);
    expect(firstBody).toEqual(secondBody);
  });

  it('topup order retried after step-up includes isNewESim: false and eSimId', async () => {
    mockPost
      .mockRejectedValueOnce(new StepUpCancelledError())
      .mockResolvedValueOnce(orderEnvelope());

    await expect(createOrder(TOPUP_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    await createOrder(TOPUP_ORDER_REQ as any);

    const [, retryBody] = mockPost.mock.calls[1];
    expect(retryBody).toMatchObject({ isNewESim: false, eSimId: ESIM_ID });
  });

  it('succeeds on third attempt after two cancellations', async () => {
    mockPost
      .mockRejectedValueOnce(new StepUpCancelledError())
      .mockRejectedValueOnce(new StepUpCancelledError())
      .mockResolvedValueOnce(orderEnvelope());

    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);
    const result = await createOrder(NEW_ORDER_REQ as any);
    expect(result.orderId).toBe('ord-after-stepup');
    expect(mockPost).toHaveBeenCalledTimes(3);
  });
});

// ─── Step-up does not affect unrelated BFF calls ─────────────────────────────

describe('step-up cancellation does not affect unrelated BFF operations', () => {
  it('catalogue browsing succeeds immediately after a step-up cancellation', async () => {
    mockPost.mockRejectedValueOnce(new StepUpCancelledError());
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);

    mockGet.mockResolvedValueOnce(plansEnvelope());
    const catalogue = await getCatalogue({ serviceRegionCode: 'US' });
    expect(catalogue.plans).toHaveLength(1);
  });

  it('compatibility check succeeds immediately after a step-up cancellation', async () => {
    mockPost.mockRejectedValueOnce(new StepUpCancelledError());
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);

    mockGet.mockResolvedValueOnce(compatEnvelope([
      { esimId: ESIM_ID, compatible: true, vendorMismatch: false, checkError: false },
    ]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_ID });
    const compatible = compat.results.filter((r: any) => r.compatible);
    expect(compatible).toHaveLength(1);
  });

  it('interleaved: compat check → step-up cancel → compat check again still works', async () => {
    mockGet
      .mockResolvedValueOnce(compatEnvelope([]))          // first compat: no results
      .mockResolvedValueOnce(compatEnvelope([             // second compat (after recovery)
        { esimId: ESIM_ID, compatible: true, vendorMismatch: false, checkError: false },
      ]));
    mockPost.mockRejectedValueOnce(new StepUpCancelledError());

    // 1. First compatibility check (no eSIM yet)
    const first = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_ID });
    expect(first.results).toHaveLength(0);

    // 2. Attempt order → step-up → user cancels
    await expect(createOrder(NEW_ORDER_REQ as any)).rejects.toBeInstanceOf(StepUpCancelledError);

    // 3. Check compatibility again — works fine
    const second = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_ID });
    expect(second.results.filter((r: any) => r.compatible)).toHaveLength(1);
  });
});
