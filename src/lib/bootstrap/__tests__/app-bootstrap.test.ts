import { queryClient } from '@/lib/api/query-client';
import { getServiceRegions } from '@/lib/api/bff/catalogue';
import { getServiceRegionsSnapshot, serviceRegionsQuery } from '../app-bootstrap';

jest.mock('@/lib/api/bff/catalogue', () => ({ getServiceRegions: jest.fn() }));

const mockGetServiceRegions = getServiceRegions as jest.MockedFunction<typeof getServiceRegions>;

const US = { code: 'US', name: 'United States' };
const EU = { code: 'EU', name: 'Europe' };

describe('serviceRegionsQuery', () => {
  afterEach(() => queryClient.clear());

  it('returns the lists with lookups by code, and the snapshot reads them back', async () => {
    mockGetServiceRegions.mockResolvedValue({ countries: [US], regions: [EU] } as never);

    expect(getServiceRegionsSnapshot()).toBeUndefined();
    await queryClient.fetchQuery(serviceRegionsQuery);

    expect(getServiceRegionsSnapshot()).toEqual({
      countries: [US],
      regions: [EU],
      countryConfig: { US },
      regionConfig: { EU },
    });
  });

  it('treats missing lists as empty', async () => {
    mockGetServiceRegions.mockResolvedValue({} as never);
    const data = await queryClient.fetchQuery(serviceRegionsQuery);
    expect(data).toEqual({ countries: [], regions: [], countryConfig: {}, regionConfig: {} });
  });
});
