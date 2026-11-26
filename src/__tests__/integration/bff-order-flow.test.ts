// New-eSIM purchase across the BFF clients: pick a plan from the catalogue,
// optionally look up a code, place the order, then read its status.

import api from '@/lib/api/http-client';
import { getCatalogue } from '@/lib/api/bff/catalogue';
import { getCoupon } from '@/lib/api/bff/coupon';
import { getOrderStatus, submitOrder, type CreateOrderRequest } from '@/lib/api/bff/order';
import { BffError } from '@/lib/api/bff/errors';

jest.mock('@/lib/api/http-client', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    post:      jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

const PLAN = { catalogueId: 'us-5gb-30d', actualSellingPrice: 12.99, serviceRegionCode: 'US' };

const COMPLETED = {
  orderId:       'ord-new-001',
  planId:        PLAN.catalogueId,
  orderStatus:   'COMPLETED',
  paymentMethod: 'FIAT',
  esimId:        '0xNewESIM01',
  installationDetails: { qrcode: 'LPA:1$sm.example$ACTIVATION', appleInstallationUrl: 'https://esimsetup.apple.com/x' },
};

function envelope(data: unknown) {
  return { success: true, correlationId: null, message: '', data };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

function newEsimRequest(extra: Partial<CreateOrderRequest> = {}): CreateOrderRequest {
  return { catalogueId: PLAN.catalogueId, isNewESim: true, paymentMethod: 'FIAT', useStoreCredit: false, ...extra };
}

beforeEach(() => jest.clearAllMocks());

describe('new eSIM purchase', () => {
  it('orders the plan picked from the catalogue and reads the installation details', async () => {
    mockGet.mockResolvedValueOnce(envelope({ plans: [PLAN] }));
    const catalogue = await getCatalogue({ serviceRegionCode: 'US' });

    mockPost.mockResolvedValueOnce(envelope({ orderId: 'ord-new-001' }));
    const order = await submitOrder(newEsimRequest({ catalogueId: catalogue.plans[0].catalogueId }));

    mockGet.mockResolvedValueOnce(envelope(COMPLETED));
    const status = await getOrderStatus(order.correlationId);

    expect(mockPost.mock.calls[0][1]).toMatchObject({ catalogueId: 'us-5gb-30d', isNewESim: true });
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('eSimRef');
    expect(status.installationDetails?.qrcode).toBeTruthy();
  });

  it('sends the looked-up code with the order', async () => {
    mockGet.mockResolvedValueOnce(envelope({ code: 'SAVE1234', kind: 'COUPON', coupon: null, referral: null, eligibility: { ok: true } }));
    const lookup = await getCoupon('save1234');

    mockPost.mockResolvedValueOnce(envelope({ orderId: 'ord-new-001' }));
    await submitOrder(newEsimRequest({ coupon: lookup.code, useStoreCredit: true }));

    expect(mockPost.mock.calls[0][1]).toMatchObject({ coupon: 'SAVE1234', useStoreCredit: true });
  });

  it('sends the asset for a device-wallet payment', async () => {
    mockPost.mockResolvedValueOnce(envelope({ orderId: 'ord-new-001' }));
    await submitOrder(newEsimRequest({ paymentMethod: 'DEVICE_WALLET', asset: 'USDC' }));
    expect(mockPost.mock.calls[0][1]).toMatchObject({ paymentMethod: 'DEVICE_WALLET', asset: 'USDC' });
  });
});

describe('order refusals', () => {
  it.each([
    ['FIAT_MINIMUM_NOT_MET', 'The amount to pay by card must be $1.00 or more.'],
    ['PROMO_CODE_EXPIRED', 'This code has expired.'],
    ['ORDER_CREATION_FAILED', 'Order could not be completed. Please try again.'],
  ])('maps %s to its user message', async (code, userMessage) => {
    mockPost.mockResolvedValue(bffError(code));
    await expect(submitOrder(newEsimRequest())).rejects.toMatchObject({ code, userMessage });
  });

  it('a refused order can be placed again', async () => {
    mockPost
      .mockResolvedValueOnce(bffError('ORDER_CREATION_FAILED'))
      .mockResolvedValueOnce(envelope({ orderId: 'ord-new-001' }));

    await expect(submitOrder(newEsimRequest())).rejects.toBeInstanceOf(BffError);
    await expect(submitOrder(newEsimRequest())).resolves.toMatchObject({ data: { orderId: 'ord-new-001' } });
  });
});
