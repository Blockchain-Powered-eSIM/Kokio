// Tests for the coupon and referral code lookup: input normalisation, format
// checks before any request, and error mapping.

import api from '@/lib/api/http-client';
import { getCoupon, InvalidCouponCodeError } from '../coupon';
import { BffError } from '../errors';

jest.mock('@/lib/api/http-client', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;

const LOOKUP = {
  code: 'ABCD1234',
  kind: 'COUPON',
  coupon: null,
  referral: null,
  eligibility: { ok: true },
};

function envelope(data: unknown = LOOKUP) {
  return { success: true, correlationId: null, message: '', data };
}

beforeEach(() => jest.clearAllMocks());

describe('getCoupon', () => {
  it.each(['abcd1234', '  abcd1234  ', 'AbCd1234'])('normalises %p before the request', async (input) => {
    mockGet.mockResolvedValue(envelope());
    await getCoupon(input);
    expect(mockGet).toHaveBeenCalledWith('/coupon/ABCD1234');
  });

  it.each(['ABCD', 'ABCD1234ABCD1234'])('accepts %p (4 to 16 characters)', async (code) => {
    mockGet.mockResolvedValue(envelope());
    await expect(getCoupon(code)).resolves.toBeDefined();
  });

  it.each(['', 'ABC', 'ABCD1234ABCD12345', 'ABCD-123'])('rejects %p without a request', async (code) => {
    await expect(getCoupon(code)).rejects.toBeInstanceOf(InvalidCouponCodeError);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns the lookup result', async () => {
    mockGet.mockResolvedValue(envelope());
    await expect(getCoupon('ABCD1234')).resolves.toEqual(LOOKUP);
  });

  it('maps an unknown code to BffError with the user message', async () => {
    mockGet.mockResolvedValue({ success: false, code: 'PROMO_CODE_NOT_FOUND', correlationId: null, message: '' });
    const err = await getCoupon('ABCD1234').catch((e) => e);
    expect(err).toBeInstanceOf(BffError);
    expect(err).toMatchObject({ code: 'PROMO_CODE_NOT_FOUND', userMessage: 'Invalid code.' });
  });

  it('passes network errors through', async () => {
    const err = new Error('Network Error');
    mockGet.mockRejectedValue(err);
    await expect(getCoupon('ABCD1234')).rejects.toBe(err);
  });
});
