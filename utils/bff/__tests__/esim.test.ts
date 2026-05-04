/**
 * esim BFF module tests
 *
 * Verifies checkEsimCompatibility: correct endpoint, param forwarding,
 * absence of deviceId, response shape, and BffError propagation.
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
import { checkEsimCompatibility } from '../esim';
import { BffError } from '../errors';

const mockGet = api.get as jest.MockedFunction<typeof api.get>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPATIBLE_RESULT = {
  esimId:        '0xESIM01',
  compatible:    true,
  vendorMismatch: false,
  checkError:    false,
};

const VENDOR_MISMATCH_RESULT = {
  esimId:         '0xESIM02',
  compatible:     false,
  vendorMismatch: true,
  checkError:     false,
};

const CHECK_ERROR_RESULT = {
  esimId:        '0xESIM03',
  compatible:    false,
  vendorMismatch: false,
  checkError:    true,
};

function compatibilityEnvelope(results = [COMPATIBLE_RESULT]) {
  return { success: true, correlationId: null, message: '', data: { results } };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── checkEsimCompatibility ───────────────────────────────────────────────────

describe('checkEsimCompatibility', () => {
  describe('request shape', () => {
    it('calls api.get with /v1/esim/compatibility', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope());
      await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/esim/compatibility',
        expect.any(Object),
      );
    });

    it('forwards planId and esimId as query params', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope());
      await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      const [, params] = mockGet.mock.calls[0];
      expect(params).toMatchObject({ planId: 'plan-1', esimId: '0xESIM01' });
    });

    it('does not include deviceId in the params', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope());
      await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      const [, params] = mockGet.mock.calls[0];
      expect(params).not.toHaveProperty('deviceId');
    });

    it('calls api.get exactly once', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope());
      await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('does not pass skipAuth — authenticated endpoint requires DPoP proof', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope());
      await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      // api.get is called with only (url, params) — no config object with skipAuth
      expect(mockGet.mock.calls[0]).toHaveLength(2);
    });
  });

  describe('response handling', () => {
    it('returns the compatibility response with results array', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope([COMPATIBLE_RESULT]));
      const result = await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      expect(result.results).toHaveLength(1);
    });

    it('result contains compatible eSIM entries', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope([COMPATIBLE_RESULT]));
      const result = await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      expect(result.results[0].compatible).toBe(true);
      expect(result.results[0].esimId).toBe('0xESIM01');
    });

    it('returns vendor mismatch entries correctly', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope([VENDOR_MISMATCH_RESULT]));
      const result = await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM02' });
      expect(result.results[0].vendorMismatch).toBe(true);
      expect(result.results[0].compatible).toBe(false);
    });

    it('returns check-error entries correctly', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope([CHECK_ERROR_RESULT]));
      const result = await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM03' });
      expect(result.results[0].checkError).toBe(true);
    });

    it('handles multiple results in the response', async () => {
      mockGet.mockResolvedValue(
        compatibilityEnvelope([COMPATIBLE_RESULT, VENDOR_MISMATCH_RESULT, CHECK_ERROR_RESULT]),
      );
      const result = await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      expect(result.results).toHaveLength(3);
    });

    it('handles empty results array', async () => {
      mockGet.mockResolvedValue(compatibilityEnvelope([]));
      const result = await checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' });
      expect(result.results).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('throws BffError when success: false', async () => {
      mockGet.mockResolvedValue(bffError('ESIM_NOT_FOUND_FOR_DEVICE'));
      await expect(
        checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' }),
      ).rejects.toBeInstanceOf(BffError);
    });

    it('thrown BffError carries ESIM_NOT_FOUND_FOR_DEVICE code', async () => {
      mockGet.mockResolvedValue(bffError('ESIM_NOT_FOUND_FOR_DEVICE'));
      await expect(
        checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' }),
      ).rejects.toMatchObject({ code: 'ESIM_NOT_FOUND_FOR_DEVICE' });
    });

    it('thrown BffError carries TOPUP_COMPATIBILITY_CHECK_FAILED code', async () => {
      mockGet.mockResolvedValue(bffError('TOPUP_COMPATIBILITY_CHECK_FAILED'));
      await expect(
        checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' }),
      ).rejects.toMatchObject({
        code:        'TOPUP_COMPATIBILITY_CHECK_FAILED',
        userMessage: 'Could not check top-up compatibility. Please try again.',
      });
    });

    it('propagates network-level errors', async () => {
      const err = new Error('Request timeout');
      mockGet.mockRejectedValue(err);
      await expect(
        checkEsimCompatibility({ planId: 'plan-1', esimId: '0xESIM01' }),
      ).rejects.toBe(err);
    });
  });
});
