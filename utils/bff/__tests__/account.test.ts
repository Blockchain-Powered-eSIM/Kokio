/**
 * account BFF module tests
 *
 * Verifies getAccount: correct endpoint, no params (identity resolved from JWT),
 * response shape, and BffError propagation.
 */

import api from '@/services/httpService';
import { getAccount } from '../account';
import { BffError } from '../errors';

jest.mock('@/services/httpService', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNT_DATA = {
  deviceWalletAddress:    '0xabc123def456abc123def456abc123def456abc1',
  deviceUniqueIdentifier: 'c3a1b2d4-e5f6-7890-abcd-ef1234567890',
  salt:                   '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  pubKeyX:                '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
  pubKeyY:                '0x2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
};

function accountEnvelope(data = ACCOUNT_DATA) {
  return { success: true, correlationId: null, message: 'Success', data };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── getAccount ───────────────────────────────────────────────────────────────

describe('getAccount', () => {
  describe('request shape', () => {
    it('calls api.get with /v1/account', async () => {
      mockGet.mockResolvedValue(accountEnvelope());
      await getAccount();
      expect(mockGet).toHaveBeenCalledWith('/v1/account');
    });

    it('calls api.get exactly once', async () => {
      mockGet.mockResolvedValue(accountEnvelope());
      await getAccount();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('takes no parameters — identity is resolved from the JWT server-side', async () => {
      mockGet.mockResolvedValue(accountEnvelope());
      await getAccount();
      expect(mockGet.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('response handling', () => {
    it('returns the account derivation material', async () => {
      mockGet.mockResolvedValue(accountEnvelope());
      const result = await getAccount();
      expect(result).toEqual(ACCOUNT_DATA);
    });

    it('returns deviceUniqueIdentifier for deviceUID persistence', async () => {
      mockGet.mockResolvedValue(accountEnvelope());
      const result = await getAccount();
      expect(result.deviceUniqueIdentifier).toBe(ACCOUNT_DATA.deviceUniqueIdentifier);
    });
  });

  describe('error handling', () => {
    it('throws BffError when success: false', async () => {
      mockGet.mockResolvedValue(bffError('ACCOUNT_NOT_FOUND'));
      await expect(getAccount()).rejects.toBeInstanceOf(BffError);
    });

    it('thrown BffError carries STEP_UP_REQUIRED code', async () => {
      mockGet.mockResolvedValue(bffError('STEP_UP_REQUIRED'));
      await expect(getAccount()).rejects.toMatchObject({ code: 'STEP_UP_REQUIRED' });
    });

    it('propagates network-level errors', async () => {
      const err = new Error('Request timeout');
      mockGet.mockRejectedValue(err);
      await expect(getAccount()).rejects.toBe(err);
    });
  });
});
