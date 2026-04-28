/**
 * Integration: BFF catalogue browsing flow
 *
 * Simulates the sequence a user performs when opening the app and browsing
 * available eSIM plans: load regions → browse by region → change region →
 * verify caching behaviour across the full session.
 *
 * httpService is replaced with jest.fn() doubles so the test controls every
 * BFF response without a real network.
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
} from '@/utils/bff/catalogue';
import { BffError } from '@/utils/bff/errors';

const mockGet = api.get as jest.MockedFunction<typeof api.get>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const REGIONS = [
  { code: 'US', name: 'United States',  type: 'country'  },
  { code: 'EU', name: 'Europe',         type: 'regional' },
  { code: 'GLOBAL', name: 'Global',     type: 'global'   },
];

const US_PLANS = [
  { catalogueId: 'us-1gb-30d', data: 1024, validity: 30, serviceRegionCode: 'US', actualSellingPrice: 5.99  },
  { catalogueId: 'us-5gb-30d', data: 5120, validity: 30, serviceRegionCode: 'US', actualSellingPrice: 12.99 },
];

const EU_PLANS = [
  { catalogueId: 'eu-3gb-30d', data: 3072, validity: 30, serviceRegionCode: 'EU', actualSellingPrice: 9.99 },
];

const GLOBAL_PLANS = [
  { catalogueId: 'gl-1gb-7d',  data: 1024, validity: 7,  serviceRegionCode: 'GLOBAL', actualSellingPrice: 8.99 },
  { catalogueId: 'gl-3gb-30d', data: 3072, validity: 30, serviceRegionCode: 'GLOBAL', actualSellingPrice: 19.99 },
];

function regionsEnvelope(regions = REGIONS) {
  return { success: true, correlationId: null, message: '', data: { regions } };
}

function plansEnvelope(plans: typeof US_PLANS) {
  return { success: true, correlationId: null, message: '', data: { plans } };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  clearServiceRegionsCache();
});

// ─── Full browsing flow ───────────────────────────────────────────────────────

describe('full catalogue browsing flow', () => {
  it('loads service regions then fetches plans for the first region', async () => {
    mockGet
      .mockResolvedValueOnce(regionsEnvelope())
      .mockResolvedValueOnce(plansEnvelope(US_PLANS));

    const regions = await getServiceRegions();
    expect(regions.regions).toHaveLength(3);

    const plans = await getCatalogue({ serviceRegionCode: regions.regions[0].code });
    expect(plans.plans).toHaveLength(2);
    expect(plans.plans[0].serviceRegionCode).toBe('US');

    // One call per operation
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('browsing multiple regions makes one API call per region change', async () => {
    mockGet
      .mockResolvedValueOnce(plansEnvelope(US_PLANS))
      .mockResolvedValueOnce(plansEnvelope(EU_PLANS))
      .mockResolvedValueOnce(plansEnvelope(GLOBAL_PLANS));

    const us = await getCatalogue({ serviceRegionCode: 'US' });
    const eu = await getCatalogue({ serviceRegionCode: 'EU' });
    const gl = await getCatalogue({ serviceRegionCode: 'GLOBAL' });

    expect(us.plans).toHaveLength(2);
    expect(eu.plans).toHaveLength(1);
    expect(gl.plans).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('each region call sends the correct serviceRegionCode param', async () => {
    mockGet
      .mockResolvedValue(plansEnvelope(US_PLANS));

    await getCatalogue({ serviceRegionCode: 'US' });
    await getCatalogue({ serviceRegionCode: 'EU' });

    const [, firstParams]  = mockGet.mock.calls[0];
    const [, secondParams] = mockGet.mock.calls[1];
    expect(firstParams).toMatchObject({ serviceRegionCode: 'US' });
    expect(secondParams).toMatchObject({ serviceRegionCode: 'EU' });
  });

  it('plans from different region calls are independent (no cross-contamination)', async () => {
    mockGet
      .mockResolvedValueOnce(plansEnvelope(US_PLANS))
      .mockResolvedValueOnce(plansEnvelope(EU_PLANS));

    const us = await getCatalogue({ serviceRegionCode: 'US' });
    const eu = await getCatalogue({ serviceRegionCode: 'EU' });

    const usCodes = us.plans.map((p: any) => p.serviceRegionCode);
    const euCodes = eu.plans.map((p: any) => p.serviceRegionCode);
    expect(usCodes.every((c: string) => c === 'US')).toBe(true);
    expect(euCodes.every((c: string) => c === 'EU')).toBe(true);
  });
});

// ─── Service region cache ─────────────────────────────────────────────────────

describe('service region cache behaviour across the browsing session', () => {
  it('regions are fetched once and cached for the entire session', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());

    const first  = await getServiceRegions();
    const second = await getServiceRegions();
    const third  = await getServiceRegions();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);  // same object reference from cache
    expect(third).toBe(first);
  });

  it('invalidating the cache triggers a fresh regions fetch on next call', async () => {
    const updatedRegions = [...REGIONS, { code: 'JP', name: 'Japan', type: 'country' }];
    mockGet
      .mockResolvedValueOnce(regionsEnvelope())
      .mockResolvedValueOnce(regionsEnvelope(updatedRegions));

    await getServiceRegions();
    clearServiceRegionsCache();
    const fresh = await getServiceRegions();

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(fresh.regions).toHaveLength(4);
  });

  it('plans fetch happens even when regions are cached', async () => {
    mockGet
      .mockResolvedValueOnce(regionsEnvelope())   // regions (first call)
      .mockResolvedValueOnce(plansEnvelope(US_PLANS)); // plans

    await getServiceRegions();
    await getServiceRegions(); // served from cache, no API call
    await getCatalogue({ serviceRegionCode: 'US' }); // separate call

    // 1 for regions (cache hit on second) + 1 for plans
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('passes skipAuth: true on the service-regions endpoint', async () => {
    mockGet.mockResolvedValue(regionsEnvelope());
    await getServiceRegions();
    const [, , config] = mockGet.mock.calls[0];
    expect(config).toMatchObject({ skipAuth: true });
  });
});

// ─── Client-side filtering ────────────────────────────────────────────────────

describe('client-side filtering of plans returned from the catalogue', () => {
  it('caller can filter plans by type after fetching', async () => {
    const mixedPlans = [...US_PLANS, ...GLOBAL_PLANS];
    mockGet.mockResolvedValue(plansEnvelope(mixedPlans as any));

    const result = await getCatalogue({ serviceRegionCode: 'US' });
    const usOnly = result.plans.filter((p: any) => p.serviceRegionCode === 'US');
    expect(usOnly).toHaveLength(2);
  });

  it('empty plans array is returned when the region has no plans', async () => {
    mockGet.mockResolvedValue(plansEnvelope([]));
    const result = await getCatalogue({ serviceRegionCode: 'XX' });
    expect(result.plans).toEqual([]);
  });

  it('caller can derive the cheapest plan from a list', async () => {
    mockGet.mockResolvedValue(plansEnvelope(US_PLANS as any));
    const result = await getCatalogue({ serviceRegionCode: 'US' });
    const cheapest = result.plans.reduce((a: any, b: any) =>
      a.actualSellingPrice < b.actualSellingPrice ? a : b
    );
    expect(cheapest.catalogueId).toBe('us-1gb-30d');
  });
});

// ─── Error recovery ───────────────────────────────────────────────────────────

describe('error recovery during catalogue browsing', () => {
  it('failed catalogue call throws BffError, subsequent call succeeds', async () => {
    mockGet
      .mockResolvedValueOnce(bffError('VENDOR_PLANS_FAILED'))
      .mockResolvedValueOnce(plansEnvelope(US_PLANS));

    await expect(getCatalogue({ serviceRegionCode: 'US' })).rejects.toBeInstanceOf(BffError);
    const result = await getCatalogue({ serviceRegionCode: 'US' });
    expect(result.plans).toHaveLength(2);
  });

  it('failed regions fetch throws BffError, cache is not poisoned', async () => {
    mockGet
      .mockResolvedValueOnce(bffError('INTERNAL_SERVER_ERROR'))
      .mockResolvedValueOnce(regionsEnvelope());

    await expect(getServiceRegions()).rejects.toBeInstanceOf(BffError);
    // Cache was never written — next call fetches fresh
    const result = await getServiceRegions();
    expect(result.regions).toHaveLength(3);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('network error propagates and does not break subsequent calls', async () => {
    const networkErr = new Error('Network timeout');
    mockGet
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce(plansEnvelope(EU_PLANS));

    await expect(getCatalogue({ serviceRegionCode: 'EU' })).rejects.toBe(networkErr);
    const result = await getCatalogue({ serviceRegionCode: 'EU' });
    expect(result.plans).toHaveLength(1);
  });
});

// ─── Deprecated alias ─────────────────────────────────────────────────────────

describe('getPlans deprecated alias', () => {
  it('is the same function reference as getCatalogue', () => {
    expect(getPlans).toBe(getCatalogue);
  });
});
