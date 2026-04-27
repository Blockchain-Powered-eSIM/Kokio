/**
 * Integration: BFF new-eSIM order flow
 *
 * Tests the purchase path: check compatibility (no compatible eSIMs) → fetch
 * a plan → create a new eSIM order.  Covers device-wallet and external-wallet
 * payment variants, coupon application, and error propagation.
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
import { getCatalogue }            from '@/utils/bff/catalogue';
import { checkEsimCompatibility }  from '@/utils/bff/esim';
import { createOrder }             from '@/utils/bff/order';
import { getCoupon }               from '@/utils/bff/coupon';
import { BffError }                from '@/utils/bff/errors';

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAN = {
  catalogueId: 'us-5gb-30d',
  actualSellingPrice: 12.99,
  serviceRegionCode: 'US',
};

const DEVICE_WALLET = '0xDeviceWallet000';
const EXTERNAL_ADDR = '0xExternalWallet01';
const TXN_HASH      = '0xabc123transactionhash';

const ORDER_RESPONSE = {
  orderId:   'ord-new-001',
  esimId:    '0xNewESIM01',
  iccid:     '89012601234567890',
  installationDetails: {
    qrcode:              'LPA:1$sm.kokio.app$ACTIVATION',
    appleInstallationUrl: 'https://esimsetup.apple.com/esim_qrcode_provision?body=LPA:1$...',
  },
};

const COUPON_DOC = {
  code: 'SAVE1234', tokenName: 'USDC', network: 'BASE',
  totalAmount: '50', balance: '50', isExhausted: false,
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
  lastRedeemedAt: null, lastRedeemedBy: null, redemptions: [],
};

function plansEnvelope(plans = [PLAN]) {
  return { success: true, correlationId: null, message: '', data: { plans } };
}

function compatEnvelope(results: unknown[] = []) {
  return { success: true, correlationId: null, message: '', data: { results } };
}

function orderEnvelope(data = ORDER_RESPONSE) {
  return { success: true, correlationId: null, message: '', data };
}

function couponEnvelope(doc = COUPON_DOC) {
  return { success: true, correlationId: null, message: '', data: doc };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── Compatibility check → new eSIM purchase ─────────────────────────────────

describe('compatibility check → new eSIM purchase', () => {
  it('full flow: check compatibility (none found) → create new eSIM order', async () => {
    // 1. Check: no compatible eSIMs for this device
    mockGet.mockResolvedValueOnce(compatEnvelope([]));
    const compat = await checkEsimCompatibility({ planId: PLAN.catalogueId, esimId: '0xMyESIM' });
    expect(compat.results).toHaveLength(0);

    // 2. No compatible eSIM → must buy new
    mockPost.mockResolvedValueOnce(orderEnvelope());
    const order = await createOrder({
      catalogueId:    PLAN.catalogueId,
      currency:       'USD',
      isNewESim:      true,
      isCryptoPayment: true,
      payeeAddress:   DEVICE_WALLET,
    } as any);

    expect(order.orderId).toBe('ord-new-001');
    expect(order.installationDetails.qrcode).toBeTruthy();
    // Total: 1 GET (compat) + 1 POST (order)
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('order request carries isNewESim: true and no eSimId', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId: PLAN.catalogueId,
      currency: 'USD',
      isNewESim: true,
      isCryptoPayment: true,
      payeeAddress: DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ isNewESim: true });
    expect(body).not.toHaveProperty('eSimId');
  });

  it('order uses the catalogueId taken from the plans response', async () => {
    mockGet.mockResolvedValueOnce(plansEnvelope([PLAN]));
    mockPost.mockResolvedValueOnce(orderEnvelope());

    const catalogue = await getCatalogue({ serviceRegionCode: 'US' });
    const selectedPlan = catalogue.plans[0];

    await createOrder({
      catalogueId:    selectedPlan.catalogueId,
      currency:       'USD',
      isNewESim:      true,
      isCryptoPayment: true,
      payeeAddress:   DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ catalogueId: 'us-5gb-30d' });
  });
});

// ─── Device-wallet payment ────────────────────────────────────────────────────

describe('device-wallet payment (isCryptoPayment: true, payeeAddress)', () => {
  it('sends isCryptoPayment: true and payeeAddress, no txnHash', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId: PLAN.catalogueId,
      currency: 'USD',
      isNewESim: true,
      isCryptoPayment: true,
      payeeAddress: DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ isCryptoPayment: true, payeeAddress: DEVICE_WALLET });
    expect(body).not.toHaveProperty('txnHash');
  });

  it('does not include deviceId in the payment request', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId: PLAN.catalogueId,
      currency: 'USD',
      isNewESim: true,
      isCryptoPayment: true,
      payeeAddress: DEVICE_WALLET,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('deviceId');
  });
});

// ─── External-wallet payment ──────────────────────────────────────────────────

describe('external-wallet payment (txnHash + tokenName + network)', () => {
  it('sends txnHash, tokenName, network, and external payeeAddress', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId:    PLAN.catalogueId,
      currency:       'USD',
      isNewESim:      true,
      isCryptoPayment: true,
      payeeAddress:   EXTERNAL_ADDR,
      txnHash:        TXN_HASH,
      tokenName:      'USDC',
      network:        'BASE',
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({
      payeeAddress: EXTERNAL_ADDR,
      txnHash:   TXN_HASH,
      tokenName: 'USDC',
      network:   'BASE',
    });
  });

  it('does not include deviceId in the external-wallet request', async () => {
    mockPost.mockResolvedValue(orderEnvelope());
    await createOrder({
      catalogueId: PLAN.catalogueId,
      currency: 'USD',
      isNewESim: true,
      isCryptoPayment: true,
      payeeAddress: EXTERNAL_ADDR,
      txnHash: TXN_HASH,
      tokenName: 'USDC',
      network: 'BASE',
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('deviceId');
  });
});

// ─── Coupon application ───────────────────────────────────────────────────────

describe('coupon applied to a new eSIM order', () => {
  it('full flow: look up coupon → verify balance → create order with coupon code', async () => {
    mockGet.mockResolvedValueOnce(couponEnvelope());
    const coupon = await getCoupon('SAVE1234');
    expect(coupon.isExhausted).toBe(false);

    const hasSufficientBalance = Number(coupon.balance) >= PLAN.actualSellingPrice;
    expect(hasSufficientBalance).toBe(true);

    mockPost.mockResolvedValueOnce(orderEnvelope());
    await createOrder({
      catalogueId:    PLAN.catalogueId,
      currency:       'USD',
      isNewESim:      true,
      isCryptoPayment: true,
      payeeAddress:   DEVICE_WALLET,
      coupon:         coupon.code,
    } as any);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ coupon: 'SAVE1234' });
  });

  it('exhausted coupon is detected before the order is placed', async () => {
    const exhaustedCoupon = { ...COUPON_DOC, balance: '0', isExhausted: true };
    mockGet.mockResolvedValueOnce(couponEnvelope(exhaustedCoupon));
    const coupon = await getCoupon('SAVE1234');

    expect(coupon.isExhausted).toBe(true);
    // Caller should NOT proceed to createOrder — no POST was made
    expect(mockPost).not.toHaveBeenCalled();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('order creation error handling', () => {
  it('TXN_HASH_ALREADY_USED propagates as BffError with correct userMessage', async () => {
    mockPost.mockResolvedValue(bffError('TXN_HASH_ALREADY_USED'));
    await expect(
      createOrder({ catalogueId: PLAN.catalogueId, currency: 'USD', isNewESim: true, isCryptoPayment: true, payeeAddress: DEVICE_WALLET } as any)
    ).rejects.toMatchObject({
      code:        'TXN_HASH_ALREADY_USED',
      userMessage: 'Payment already processed.',
    });
  });

  it('COUPON_INSUFFICIENT_BALANCE propagates as BffError', async () => {
    mockPost.mockResolvedValue(bffError('COUPON_INSUFFICIENT_BALANCE'));
    await expect(
      createOrder({ catalogueId: PLAN.catalogueId, currency: 'USD', isNewESim: true, isCryptoPayment: true, payeeAddress: DEVICE_WALLET, coupon: 'SAVE1234' } as any)
    ).rejects.toMatchObject({
      code:        'COUPON_INSUFFICIENT_BALANCE',
      userMessage: 'Coupon has insufficient balance.',
    });
  });

  it('ORDER_CREATION_FAILED propagates as BffError', async () => {
    mockPost.mockResolvedValue(bffError('ORDER_CREATION_FAILED'));
    await expect(
      createOrder({ catalogueId: PLAN.catalogueId, currency: 'USD', isNewESim: true, isCryptoPayment: true, payeeAddress: DEVICE_WALLET } as any)
    ).rejects.toMatchObject({ code: 'ORDER_CREATION_FAILED' });
  });

  it('failed order does not prevent a successful retry', async () => {
    mockPost
      .mockResolvedValueOnce(bffError('ORDER_CREATION_FAILED'))
      .mockResolvedValueOnce(orderEnvelope());

    const baseReq = { catalogueId: PLAN.catalogueId, currency: 'USD', isNewESim: true, isCryptoPayment: true, payeeAddress: DEVICE_WALLET } as any;
    await expect(createOrder(baseReq)).rejects.toBeInstanceOf(BffError);
    const result = await createOrder(baseReq);
    expect(result.orderId).toBe('ord-new-001');
  });
});
