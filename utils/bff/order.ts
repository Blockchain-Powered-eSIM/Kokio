import type { components } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type CreateOrderRequest  = components['schemas']['CreateOrderRequest'];
type CreateOrderResponse = components['schemas']['CreateOrderResponse'];

export type InstallationDetails = components['schemas']['InstallationDetails'];

export type { CreateOrderRequest, CreateOrderResponse };

export function createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  return unwrapBffResponse(api.post('/v1/order', body as Record<string, unknown>));
}
