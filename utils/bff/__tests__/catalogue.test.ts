/**
 * catalogue BFF module tests
 *
 * api is mocked so tests run without a network. Each mock returns the raw BFF
 * envelope (what the httpService interceptor returns after stripping Axios).
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
import {
  getCatalogue,
  getPlans,
  getServiceRegions,
  clearServiceRegionsCache,
} from '../catalogue';
import { BffError } from '../errors';

const mockGet = api.get as jest.MockedFunction<typeof api.get>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAN = {
  catalogueId: 'plan-us-1',
  data: 500,
  sms: 0,
  voice: 0,
  validity: 30,
  isUnlimited: false,
  coverageType: 'country',
  serviceRegionCode: 'US',
  serviceRegionName: 'United States',
  serviceRegionFlag: '🇺🇸',
  actualSellingPrice: 9.99,
  currency: 'USD',
};

function catalogueEnvelope(plans = [PLAN]) {
  return { success: true, correlationId: null, message: '', data: { plans } };
}

function regionsEnvelope() {
  return {
    success: true,
    correlationId: null,
    message: '',
    data: { regions: [{ code: 'US', name: 'United States' }] },
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  clearServiceRegionsCache();
});

// ─── getCatalogue ─────────────────────────────────────────────────────────────

describe('getCatalogue', () => {
  it('calls api.get with /v1/catalogue', async () => {
    mockGet.mockResolvedValue(catalogueEnvelope());
    await getCatalogue({ serviceRegionCode: 'US' });
    expect(mockGet).toHaveBeenCalledWith('/v1/catalogue', { serviceRegionCode: 'US' });
  });

  it('returns the catalogue response with plans array', async () => {
    mockGet.mockResolvedValue(catalogueEnvelope([PLAN]));
    const result = await getCatalogue({ serviceRegionCode: 'US' });
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].catalogueId).toBe('plan-us-1');
  });

  it('forwards all query params to api.get', async () => {
    mockGet.mockResolvedValue(catalogueEnvelope());
    await getCatalogue({ serviceRegionCode: 'EU', vendorIds: ['v1'] } as any);
    const [, params] = mockGet.mock.calls[0];
    expect(params).toMatchObject({ serviceRegionCode: 'EU', vendorIds: ['v1'] });
  });

  it('does not include deviceId in the request params', async () => {
    mockGet.mockResolvedValue(catalogueEnvelope());
    await getCatalogue({ serviceRegionCode: 'US' });
    const [, params] = mockGet.mock.calls[0];
    expect(params).not.toHaveProperty('deviceId');
  });

  it('throws BffError when the BFF responds with success: false', async () => {
    mockGet.mockResolvedValue({
      success: false,
      code: 'VENDOR_PLANS_FAILED',
      correlationId: null,
      message: 'vendor error',
    });
    await expect(getCatalogue({ serviceRegionCode: 'US' })).rejects.toBeInstanceOf(BffError);
  });

  it('propagates network errors', async () => {
    const err = new Error('Network Error');
    mockGet.mockRejectedValue(err);
    await expect(getCatalogue({ serviceRegionCode: 'US' })).rejects.toBe(err);
  });
});

// ─── getPlans (deprecated alias) ──────────────────────────────────────────────

describe('getPlans (deprecated alias)', () => {
  it('is the same function reference as getCatalogue', () => {
    expect(getPlans).toBe(getCatalogue);
  });
});

// ─── getServiceRegions ────────────────────────────────────────────────────────

describe('getServiceRegions', () => {
  it('calls api.get with /v1/catalogue/service-regions', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions();
    expect(mockGet).toHaveBeenCalledWith(
      '/v1/catalogue/service-regions',
      {},
      expect.any(Object),
    );
  });

  it('passes skipAuth: true — no DPoP proof on public endpoint', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions();
    const [, , config] = mockGet.mock.calls[0];
    expect(config).toMatchObject({ skipAuth: true });
  });

  it('does not include deviceId in the request', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions();
    const [, params] = mockGet.mock.calls[0];
    expect(params).not.toHaveProperty('deviceId');
  });

  it('returns the service regions data', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    const result = await getServiceRegions();
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].code).toBe('US');
  });

  it('caches the result and does not re-fetch on a second call', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    const first = await getServiceRegions();
    const second = await getServiceRegions();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // exact same object reference from cache
  });

  it('re-fetches after clearServiceRegionsCache is called', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions();
    clearServiceRegionsCache();
    await getServiceRegions();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('re-fetches after the 5-minute TTL expires', async () => {
    jest.useFakeTimers();
    const now = Date.now();

    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions(); // fills cache, expiresAt = now + 5 min

    // Advance past the TTL
    jest.setSystemTime(now + 5 * 60 * 1_000 + 1);
    await getServiceRegions();

    expect(mockGet).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('does not re-fetch before the TTL expires', async () => {
    jest.useFakeTimers();
    const now = Date.now();

    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions();

    jest.setSystemTime(now + 5 * 60 * 1_000 - 1); // 1ms before expiry
    await getServiceRegions();

    expect(mockGet).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('throws BffError when the BFF responds with success: false', async () => {
    mockGet.mockResolvedValue({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      correlationId: null,
      message: 'db down',
    });
    await expect(getServiceRegions()).rejects.toBeInstanceOf(BffError);
  });
});
