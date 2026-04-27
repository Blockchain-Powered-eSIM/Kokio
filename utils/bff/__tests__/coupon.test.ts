/**
 * coupon BFF module tests
 *
 * getCoupon normalizes (trim + uppercase) and validates length before calling
 * the API. issueCoupon is a straightforward POST. InvalidCouponCodeError is
 * thrown synchronously — no network involved.
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
import { getCoupon, issueCoupon, InvalidCouponCodeError } from '../coupon';
import { BffError } from '../errors';

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COUPON_DOC = {
  code:            'ABCD1234',
  tokenName:       'USDC',
  network:         'BASE',
  totalAmount:     '100',
  balance:         '50',
  isExhausted:     false,
  createdAt:       '2025-01-01T00:00:00Z',
  updatedAt:       '2025-01-01T00:00:00Z',
  lastRedeemedAt:  null,
  lastRedeemedBy:  null,
  redemptions:     [],
};

const EXHAUSTED_COUPON = { ...COUPON_DOC, balance: '0', isExhausted: true };

function couponEnvelope(doc = COUPON_DOC) {
  return { success: true, correlationId: null, message: '', data: doc };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── InvalidCouponCodeError ───────────────────────────────────────────────────

describe('InvalidCouponCodeError', () => {
  it('is an instance of Error', () => {
    expect(new InvalidCouponCodeError()).toBeInstanceOf(Error);
  });

  it('message mentions the 8-character requirement', () => {
    expect(new InvalidCouponCodeError().message).toContain('8');
  });

  it('can be caught as Error', () => {
    const fn = () => { throw new InvalidCouponCodeError(); };
    expect(fn).toThrow(Error);
  });
});

// ─── getCoupon ────────────────────────────────────────────────────────────────

describe('getCoupon', () => {
  describe('code normalization', () => {
    it('normalizes lowercase code to uppercase before calling the API', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('abcd1234');
      const [url] = mockGet.mock.calls[0];
      expect(url).toBe('/v1/coupon/ABCD1234');
    });

    it('trims leading and trailing whitespace before normalizing', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('  abcd1234  ');
      const [url] = mockGet.mock.calls[0];
      expect(url).toBe('/v1/coupon/ABCD1234');
    });

    it('handles mixed-case input', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('AbCd1234');
      const [url] = mockGet.mock.calls[0];
      expect(url).toBe('/v1/coupon/ABCD1234');
    });

    it('handles already-uppercase input unchanged', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('ABCD1234');
      const [url] = mockGet.mock.calls[0];
      expect(url).toBe('/v1/coupon/ABCD1234');
    });
  });

  describe('length validation — throws InvalidCouponCodeError without calling API', () => {
    it('throws for a 7-character code', async () => {
      expect(() => getCoupon('ABCD123')).toThrow(InvalidCouponCodeError);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('throws for a 9-character code', async () => {
      expect(() => getCoupon('ABCD12345')).toThrow(InvalidCouponCodeError);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('throws for an empty string', async () => {
      expect(() => getCoupon('')).toThrow(InvalidCouponCodeError);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('throws for a single character', async () => {
      expect(() => getCoupon('A')).toThrow(InvalidCouponCodeError);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('throws for a 16-character code', async () => {
      expect(() => getCoupon('ABCD1234ABCD1234')).toThrow(InvalidCouponCodeError);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('accepts exactly 8 characters without throwing', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await expect(getCoupon('ABCD1234')).resolves.toBeDefined();
    });

    it('whitespace is stripped before length check — " ABCD1234 " is valid', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await expect(getCoupon(' ABCD1234 ')).resolves.toBeDefined();
    });
  });

  describe('API call', () => {
    it('calls api.get with the normalized code in the URL path', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('ABCD1234');
      expect(mockGet).toHaveBeenCalledWith('/v1/coupon/ABCD1234');
    });

    it('calls api.get exactly once', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('ABCD1234');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('does not include deviceId in the request', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      await getCoupon('ABCD1234');
      // getCoupon calls api.get(url) with no second params arg — verify no extra args
      const call = mockGet.mock.calls[0];
      if (call.length > 1) {
        expect(call[1]).not.toHaveProperty('deviceId');
      }
    });
  });

  describe('response handling', () => {
    it('returns the coupon document', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      const result = await getCoupon('ABCD1234');
      expect(result).toEqual(COUPON_DOC);
    });

    it('returns an exhausted coupon with isExhausted: true', async () => {
      mockGet.mockResolvedValue(couponEnvelope(EXHAUSTED_COUPON));
      const result = await getCoupon('ABCD1234');
      expect(result.isExhausted).toBe(true);
      expect(result.balance).toBe('0');
    });

    it('result contains tokenName and balance fields', async () => {
      mockGet.mockResolvedValue(couponEnvelope());
      const result = await getCoupon('ABCD1234');
      expect(result.tokenName).toBe('USDC');
      expect(result.balance).toBe('50');
    });
  });

  describe('error handling', () => {
    it('throws BffError when the BFF responds with COUPON_NOT_FOUND', async () => {
      mockGet.mockResolvedValue(bffError('COUPON_NOT_FOUND'));
      await expect(getCoupon('ABCD1234')).rejects.toBeInstanceOf(BffError);
    });

    it('thrown BffError has the COUPON_NOT_FOUND code', async () => {
      mockGet.mockResolvedValue(bffError('COUPON_NOT_FOUND'));
      await expect(getCoupon('ABCD1234')).rejects.toMatchObject({
        code:        'COUPON_NOT_FOUND',
        userMessage: 'Invalid coupon code.',
      });
    });

    it('propagates network-level errors', async () => {
      const err = new Error('Network Error');
      mockGet.mockRejectedValue(err);
      await expect(getCoupon('ABCD1234')).rejects.toBe(err);
    });
  });
});

// ─── issueCoupon ──────────────────────────────────────────────────────────────

describe('issueCoupon', () => {
  const ISSUE_REQUEST = {
    txnHash:   '0xHASH',
    tokenName: 'USDC',
    network:   'BASE',
    amount:    '100',
  };

  it('calls api.post with /v1/coupon', async () => {
    mockPost.mockResolvedValue(couponEnvelope());
    await issueCoupon(ISSUE_REQUEST as any);
    expect(mockPost).toHaveBeenCalledWith('/v1/coupon', expect.any(Object));
  });

  it('forwards the request body', async () => {
    mockPost.mockResolvedValue(couponEnvelope());
    await issueCoupon(ISSUE_REQUEST as any);
    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject(ISSUE_REQUEST);
  });

  it('does not include deviceId in the request body', async () => {
    mockPost.mockResolvedValue(couponEnvelope());
    await issueCoupon(ISSUE_REQUEST as any);
    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('deviceId');
  });

  it('returns the issued coupon document', async () => {
    mockPost.mockResolvedValue(couponEnvelope());
    const result = await issueCoupon(ISSUE_REQUEST as any);
    expect(result).toEqual(COUPON_DOC);
  });

  it('throws BffError on COUPON_CODE_GEN_FAILED', async () => {
    mockPost.mockResolvedValue(bffError('COUPON_CODE_GEN_FAILED'));
    await expect(issueCoupon(ISSUE_REQUEST as any)).rejects.toMatchObject({
      code:        'COUPON_CODE_GEN_FAILED',
      userMessage: 'Could not generate coupon. Please try again.',
    });
  });

  it('throws BffError on COUPON_ALREADY_ISSUED_FOR_TX', async () => {
    mockPost.mockResolvedValue(bffError('COUPON_ALREADY_ISSUED_FOR_TX'));
    await expect(issueCoupon(ISSUE_REQUEST as any)).rejects.toMatchObject({
      code: 'COUPON_ALREADY_ISSUED_FOR_TX',
    });
  });
});
