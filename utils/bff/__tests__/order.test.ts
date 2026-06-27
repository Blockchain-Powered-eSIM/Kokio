/**
 * order BFF module tests
 *
 * Verifies that createOrder calls the right endpoint, forwards the request
 * body, excludes deviceId, and correctly propagates BffError from the server.
 */

import api from '@/services/httpService';
import { createOrder, getOrderStatus } from '../order';
import { BffError } from '../errors';

jest.mock('@/services/httpService', () => ({
  __esModule: true,
  default: {
    get:  jest.fn(),
    post: jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

const mockPost = api.post as jest.MockedFunction<typeof api.post>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_REQUEST = {
  catalogueId: 'plan-us-1',
  currency: 'USD',
  isNewESim: true as const,
  isCryptoPayment: true as const,
  payeeAddress: '0xDEADBEEF',
};

const TOPUP_REQUEST = {
  catalogueId: 'plan-us-1',
  currency: 'USD',
  isNewESim: false as const,
  eSimId: '0xESIM01',
  isCryptoPayment: true as const,
  payeeAddress: '0xDEADBEEF',
};

const ORDER_RESPONSE = {
  orderId: 'ord-abc-123',
};

const ORDER_STATUS_RESPONSE = {
  orderId:      'ord-abc-123',
  planId:       'plan-us-1',
  orderStatus:  'COMPLETED' as const,
  paymentMethod: 'CRYPTO' as const,
  esimId:       '0xESIM01',
  iccid:        '8901260123456789012',
  installationDetails: {
    qrcode:               'LPA:1$...',
    appleInstallationUrl: 'https://esimsetup.apple.com/...',
  },
};

function successEnvelope(data = ORDER_RESPONSE) {
  return { success: true, correlationId: null, message: '', data };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── createOrder ──────────────────────────────────────────────────────────────

describe('createOrder', () => {
  describe('request shape', () => {
    it('calls api.post with /v1/order', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      await createOrder(BASE_REQUEST);
      expect(mockPost).toHaveBeenCalledWith('/v1/order', expect.any(Object));
    });

    it('forwards all request body fields to the endpoint', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      await createOrder(BASE_REQUEST);
      const [, body] = mockPost.mock.calls[0];
      expect(body).toMatchObject(BASE_REQUEST);
    });

    it('forwards eSimId when performing a top-up', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      await createOrder(TOPUP_REQUEST as any);
      const [, body] = mockPost.mock.calls[0];
      expect(body).toMatchObject({ isNewESim: false, eSimId: '0xESIM01' });
    });

    it('forwards optional txnHash and tokenName when provided', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      await createOrder({ ...BASE_REQUEST, txnHash: '0xHASH', tokenName: 'USDC', network: 'BASE' } as any);
      const [, body] = mockPost.mock.calls[0];
      expect(body).toMatchObject({ txnHash: '0xHASH', tokenName: 'USDC', network: 'BASE' });
    });

    it('does not include deviceId in the request body', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      await createOrder(BASE_REQUEST);
      const [, body] = mockPost.mock.calls[0];
      expect(body).not.toHaveProperty('deviceId');
    });

    it('calls api.post exactly once per createOrder invocation', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      await createOrder(BASE_REQUEST);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('response handling', () => {
    it('returns the order response', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      const result = await createOrder(BASE_REQUEST);
      expect(result).toEqual(ORDER_RESPONSE);
    });

    it('result contains orderId — status fields come from getOrderStatus', async () => {
      mockPost.mockResolvedValue(successEnvelope());
      const mockGet = api.get as jest.MockedFunction<typeof api.get>;
      mockGet.mockResolvedValueOnce({ success: true, correlationId: null, message: '', data: ORDER_STATUS_RESPONSE });

      const result = await createOrder(BASE_REQUEST);
      expect(result.orderId).toBe('ord-abc-123');

      const status = await getOrderStatus(result.orderId);
      expect(status.esimId).toBe('0xESIM01');
      expect(status.iccid).toBe('8901260123456789012');
      expect(status.installationDetails?.qrcode).toBeTruthy();
      expect(status.installationDetails?.appleInstallationUrl).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('throws BffError when success: false', async () => {
      mockPost.mockResolvedValue(bffError('ORDER_CREATION_FAILED'));
      await expect(createOrder(BASE_REQUEST)).rejects.toBeInstanceOf(BffError);
    });

    it('thrown BffError has the server error code', async () => {
      mockPost.mockResolvedValue(bffError('TXN_HASH_ALREADY_USED'));
      await expect(createOrder(BASE_REQUEST)).rejects.toMatchObject({
        code: 'TXN_HASH_ALREADY_USED',
      });
    });

    it('thrown BffError userMessage resolves from the error map', async () => {
      mockPost.mockResolvedValue(bffError('TXN_HASH_ALREADY_USED'));
      await expect(createOrder(BASE_REQUEST)).rejects.toMatchObject({
        userMessage: 'Payment already processed.',
      });
    });

    it('thrown BffError userMessage resolves for COUPON_INSUFFICIENT_BALANCE', async () => {
      mockPost.mockResolvedValue(bffError('COUPON_INSUFFICIENT_BALANCE'));
      await expect(createOrder(BASE_REQUEST)).rejects.toMatchObject({
        userMessage: 'Coupon has insufficient balance.',
      });
    });

    it('propagates network-level errors', async () => {
      const err = new Error('Network Error');
      mockPost.mockRejectedValue(err);
      await expect(createOrder(BASE_REQUEST)).rejects.toBe(err);
    });
  });
});
