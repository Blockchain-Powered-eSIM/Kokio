import api from '@/services/httpService';

export async function checkBffHealth(): Promise<boolean> {
  try {
    // skipAuth: public endpoint - no DPoP proof needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await api.get('/v1/health/ready', {}, { skipAuth: true, timeout: 3_000 } as any);
    return true;
  } catch {
    return false;
  }
}
