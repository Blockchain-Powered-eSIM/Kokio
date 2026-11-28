import { queryClient } from '@/lib/api/query-client';
import { getServiceRegions } from '@/lib/api/bff/catalogue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICE_REGIONS_STORAGE_KEY } from '@/lib/storage/keys';
import { getServiceRegionsSnapshot, restoreServiceRegions, serviceRegionsQuery } from '../app-bootstrap';

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

describe('restoreServiceRegions', () => {
  afterEach(async () => {
    queryClient.clear();
    await AsyncStorage.clear();
  });

  it('restores the list saved by the last fetch', async () => {
    mockGetServiceRegions.mockResolvedValue({ countries: [US], regions: [EU] } as never);
    await queryClient.fetchQuery(serviceRegionsQuery);
    await new Promise((resolve) => setImmediate(resolve));
    queryClient.clear();

    await expect(restoreServiceRegions()).resolves.toBe(true);
    expect(getServiceRegionsSnapshot()?.countryConfig).toEqual({ US });
  });

  it('returns false with nothing saved or a corrupt entry', async () => {
    await expect(restoreServiceRegions()).resolves.toBe(false);
    await AsyncStorage.setItem(SERVICE_REGIONS_STORAGE_KEY, '{not json');
    await expect(restoreServiceRegions()).resolves.toBe(false);
    expect(getServiceRegionsSnapshot()).toBeUndefined();
  });
});
