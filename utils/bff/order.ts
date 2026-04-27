import type { components } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type CreateOrderRequest  = components['schemas']['CreateOrderRequest'];
type CreateOrderResponse = components['schemas']['CreateOrderResponse'];

export type { CreateOrderRequest, CreateOrderResponse };
export type { InstallationDetails } from './generated/koKioBff';

export function createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  return unwrapBffResponse(api.post('/v1/order', body as Record<string, unknown>));
}
