// Top-up flow across the BFF clients: check which eSIMs a plan can top up,
// pick one, then place the top-up order against its eSimRef.

import api from '@/services/httpService';
import { checkEsimCompatibility } from '@/utils/bff/esim';
import { submitOrder, type CreateOrderRequest } from '@/utils/bff/order';
import { BffError } from '@/utils/bff/errors';

jest.mock('@/services/httpService', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    post:      jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

const PLAN_ID = 'us-5gb-30d';

function result(eSimRef: string, compatible: boolean, vendorMismatch = false) {
  return { eSimRef, esimId: `0x${eSimRef}`, compatible, vendorMismatch, checkError: false };
}

const COMPAT_A = result('esim-a', true);
const COMPAT_B = result('esim-b', true);
const INCOMPAT = result('esim-c', false, true);

function compatEnvelope(results: unknown[]) {
  return { success: true, correlationId: null, message: '', data: { results } };
}

function orderEnvelope() {
  return { success: true, correlationId: null, message: '', data: { orderId: 'ord-topup-001' } };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

function topupRequest(eSimRef: string): CreateOrderRequest {
  return { catalogueId: PLAN_ID, isNewESim: false, eSimRef, paymentMethod: 'FIAT', useStoreCredit: false };
}

beforeEach(() => jest.clearAllMocks());

describe('top-up after a compatibility check', () => {
  it('orders a top-up for the single compatible eSIM', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID });
    const selected = compat.results.find((r) => r.compatible)!;

    mockPost.mockResolvedValueOnce(orderEnvelope());
    const order = await submitOrder(topupRequest(selected.eSimRef));

    expect(order.data.orderId).toBe('ord-topup-001');
    expect(mockPost.mock.calls[0][1]).toMatchObject({ isNewESim: false, eSimRef: 'esim-a' });
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('deviceId');
  });

  it('uses the eSIM the user picked when several are compatible', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A, COMPAT_B, INCOMPAT]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID });
    const compatible = compat.results.filter((r) => r.compatible);
    expect(compatible.map((r) => r.eSimRef)).toEqual(['esim-a', 'esim-b']);

    mockPost.mockResolvedValueOnce(orderEnvelope());
    await submitOrder(topupRequest(compatible[1].eSimRef));
    expect(mockPost.mock.calls[0][1]).toMatchObject({ eSimRef: 'esim-b' });
  });

  it('checks one eSIM when an eSimRef is given', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([COMPAT_A]));
    await checkEsimCompatibility({ planId: PLAN_ID }, 'esim-a');
    expect(mockGet.mock.calls[0][0]).toBe('/esim/compatibility/esim-a');
  });

  it('leaves the order alone when nothing is compatible', async () => {
    mockGet.mockResolvedValueOnce(compatEnvelope([INCOMPAT]));
    const compat = await checkEsimCompatibility({ planId: PLAN_ID });
    expect(compat.results.filter((r) => r.compatible)).toHaveLength(0);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('top-up errors', () => {
  it.each([
    ['ESIM_NOT_FOUND_FOR_DEVICE', 'eSIM not found.'],
    ['TOPUP_COMPATIBILITY_CHECK_FAILED', 'Could not check top-up compatibility. Please try again.'],
  ])('maps %s from the compatibility check', async (code, userMessage) => {
    mockGet.mockResolvedValue(bffError(code));
    await expect(checkEsimCompatibility({ planId: PLAN_ID })).rejects.toMatchObject({ code, userMessage });
  });

  it('a failed top-up order can be retried', async () => {
    mockPost
      .mockResolvedValueOnce(bffError('ORDER_CREATION_FAILED'))
      .mockResolvedValueOnce(orderEnvelope());

    await expect(submitOrder(topupRequest('esim-a'))).rejects.toBeInstanceOf(BffError);
    const order = await submitOrder(topupRequest('esim-a'));
    expect(order.data.orderId).toBe('ord-topup-001');
  });
});
