/**
 * Integration: BFF top-up flow
 *
 * Simulates: check eSIM compatibility → select a compatible eSIM → create a
 * topup order (isNewESim: false).  Covers single vs multiple compatible eSIMs,
 * device-wallet and external-wallet payment paths, and error handling.
 */

jest.mock('@/services/httpService', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    post:      jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

import api from '@/services/httpService';
import { checkEsimCompatibility } from '@/utils/bff/esim';
import { createOrder }            from '@/utils/bff/order';
import { BffError }               from '@/utils/bff/errors';

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAN_ID      = 'us-5gb-30d';
const ESIM_A       = '0xESIMA1234567890';
const ESIM_B       = '0xESIMB1234567890';
const ESIM_C       = '0xESIMC1234567890';
const DEVICE_WALLET = '0xDeviceWallet000';
const EXTERNAL_ADDR = '0xExternalWallet01';
const TXN_HASH      = '0xdeadbeef12345678';

const COMPAT_A = { esimId: ESIM_A, compatible: true,  vendorMismatch: false, checkError: false };
const COMPAT_B = { esimId: ESIM_B, compatible: true,  vendorMismatch: false, checkError: false };
const INCOMPAT  = { esimId: ESIM_C, compatible: false, vendorMismatch: true,  checkError: false };

const TOPUP_RESPONSE = {
  orderId:   'ord-topup-001',
  esimId:    ESIM_A,
  iccid:     '89012601234567890',
  installationDetails: {
    qrcode:              '',
    appleInstallationUrl: '',
  },
};

function compatEnvelope(results: unknown[]) {
  return { success: true, correlationId: null, message: '', data: { results } };
}

function orderEnvelope(data = TOPUP_RESPONSE) {
  return { success: true, correlationId: null, message: '', data };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── Single-eSIM topup ────────────────────────────────────────────────────────

describe('single compatible eSIM → topup', () => {
  it('full flow: check → one compatible result → topup that eSIM', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A });

    const compatibleEsims = compat.results.filter((r: any) => r.compatible);
    expect(compatibleEsims).toHaveLength(1);
    const selectedEsim = compatibleEsims[0].esimId;

    mockPost.mockResolvedValueOnce(orderEnvelope());
    const order = await createOrder({
      catalogueId:    PLAN_ID,
      currency:       'USD',
      isNewESim:      false,
      eSimId:         selectedEsim,
      isCryptoPayment: true,
      payeeAddress:   DEVICE_WALLET,
    } as any);

    expect(order.orderId).toBe('ord-topup-001');
    expect(order.esimId).toBe(ESIM_A);
  });

  it('topup order body has isNewESim: false and the selected eSimId', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A });
    const selectedEsim = compat.results.find((r: any) => r.compatible)!.esimId;

    mockPost.mockResolvedValueOnce(orderEnvelope());
    await createOrder({
      catalogueId: PLAN_ID,
      currency: 'USD',
      isNewESim: false,
      eSimId: selectedEsim,
      isCryptoPayment: true,
      payeeAddress: DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ isNewESim: false, eSimId: ESIM_A });
  });

  it('topup order body does NOT include deviceId', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId: PLAN_ID, currency: 'USD', isNewESim: false,
      eSimId: ESIM_A, isCryptoPayment: true, payeeAddress: DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('deviceId');
  });
});

// ─── Multiple compatible eSIMs ────────────────────────────────────────────────

describe('multiple compatible eSIMs — user selects one', () => {
  it('compatibility check returns all compatible eSIMs', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A, COMPAT_B, INCOMPAT]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A });

    const compatible = compat.results.filter((r: any) => r.compatible);
    expect(compatible).toHaveLength(2);
    expect(compatible.map((r: any) => r.esimId)).toEqual([ESIM_A, ESIM_B]);
  });

  it('user selects the second compatible eSIM — that eSimId is used in the order', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A, COMPAT_B]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A });

    const compatible = compat.results.filter((r: any) => r.compatible);
    const userSelection = compatible[1].esimId; // user picks second

    mockPost.mockResolvedValueOnce(orderEnvelope({ ...TOPUP_RESPONSE, esimId: ESIM_B }));
    await createOrder({
      catalogueId: PLAN_ID, currency: 'USD', isNewESim: false,
      eSimId: userSelection, isCryptoPayment: true, payeeAddress: DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ eSimId: ESIM_B });
  });

  it('incompatible eSIMs (vendorMismatch) are excluded by the caller', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A, INCOMPAT]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A });

    const incompatible = compat.results.filter((r: any) => !r.compatible);
    expect(incompatible).toHaveLength(1);
    expect(incompatible[0].vendorMismatch).toBe(true);
  });
});

// ─── No compatible eSIMs → fallback to new purchase ─────────────────────────

describe('no compatible eSIMs → caller falls back to new eSIM purchase', () => {
  it('returns empty compatible list when no eSIM matches the plan', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([INCOMPAT]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_C });

    const compatible = compat.results.filter((r: any) => r.compatible);
    expect(compatible).toHaveLength(0);
    // Caller falls back to new eSIM — no POST made yet
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns empty list when results array is empty', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A });
    expect(compat.results).toHaveLength(0);
  });
});

// ─── External-wallet topup ────────────────────────────────────────────────────

describe('topup via external wallet', () => {
  it('topup order includes txnHash, tokenName, network, external payeeAddress', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId:    PLAN_ID,
      currency:       'USD',
      isNewESim:      false,
      eSimId:         ESIM_A,
      isCryptoPayment: true,
      payeeAddress:   EXTERNAL_ADDR,
      txnHash:        TXN_HASH,
      tokenName:      'USDC',
      network:        'BASE',
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({
      isNewESim:    false,
      eSimId:       ESIM_A,
      payeeAddress: EXTERNAL_ADDR,
      txnHash:      TXN_HASH,
      tokenName:    'USDC',
      network:      'BASE',
    });
  });

  it('does not include deviceId in the external-wallet topup request', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId: PLAN_ID, currency: 'USD', isNewESim: false,
      eSimId: ESIM_A, isCryptoPayment: true, payeeAddress: EXTERNAL_ADDR,
      txnHash: TXN_HASH, tokenName: 'USDC', network: 'BASE',
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('deviceId');
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('topup flow error handling', () => {
  it('ESIM_NOT_FOUND_FOR_DEVICE from compatibility check propagates as BffError', async () => {
    mockGet.mockResolvedValue(bffError('ESIM_NOT_FOUND_FOR_DEVICE'));
    await expect(
      checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A }),
    ).rejects.toMatchObject({
      code:        'ESIM_NOT_FOUND_FOR_DEVICE',
      userMessage: 'eSIM not found.',
    });
  });

  it('TOPUP_COMPATIBILITY_CHECK_FAILED propagates with correct userMessage', async () => {
    mockGet.mockResolvedValue(bffError('TOPUP_COMPATIBILITY_CHECK_FAILED'));
    await expect(
      checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A }),
    ).rejects.toMatchObject({
      code:        'TOPUP_COMPATIBILITY_CHECK_FAILED',
      userMessage: 'Could not check top-up compatibility. Please try again.',
    });
  });

  it('ORDER_CREATION_FAILED on topup propagates as BffError', async () => {
    mockPost.mockResolvedValue(bffError('ORDER_CREATION_FAILED'));
    await expect(
      createOrder({ catalogueId: PLAN_ID, currency: 'USD', isNewESim: false, eSimId: ESIM_A, isCryptoPayment: true, payeeAddress: DEVICE_WALLET } as any)
    ).rejects.toBeInstanceOf(BffError);
  });

  it('failed topup can be retried and succeeds', async () => {
    const req = { catalogueId: PLAN_ID, currency: 'USD', isNewESim: false, eSimId: ESIM_A, isCryptoPayment: true, payeeAddress: DEVICE_WALLET } as any;
    mockPost
      .mockResolvedValueOnce(bffError('ORDER_CREATION_FAILED'))
      .mockResolvedValueOnce(orderEnvelope());

    await expect(createOrder(req)).rejects.toBeInstanceOf(BffError);
    const result = await createOrder(req);
    expect(result.orderId).toBe('ord-topup-001');
  });

  it('compatibility check error does not affect subsequent order call', async () => {
    mockGet.mockResolvedValue(bffError('TOPUP_COMPATIBILITY_CHECK_FAILED'));
    await expect(
      checkEsimCompatibility({ planId: PLAN_ID, esimId: ESIM_A }),
    ).rejects.toBeInstanceOf(BffError);

    // User decides to buy new eSIM instead
    mockPost.mockResolvedValue(orderEnvelope());
    const order = await createOrder({
      catalogueId: PLAN_ID, currency: 'USD', isNewESim: true,
      isCryptoPayment: true, payeeAddress: DEVICE_WALLET,
    } as any);
    expect(order.orderId).toBe('ord-topup-001');
  });
});
