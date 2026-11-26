// Tests for the order client: request shape, idempotency key, status lookups
// and the polling loop that waits for an order to finish.

import api from '@/services/httpService';
import {
  cancelOrder,
  getOrderStatus,
  OrderNotFoundError,
  pollOrderStatus,
  previewOrder,
  submitOrder,
  submitPaymentHash,
  type CreateOrderRequest,
} from '../order';
import { BffError } from '../errors';

jest.mock('@/services/httpService', () => ({
  __esModule: true,
  default: {
    get:       jest.fn(),
    post:      jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'key-123') }));

const mockGet  = api.get  as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

const NEW_ESIM_REQUEST: CreateOrderRequest = {
  catalogueId:    'plan-us-1',
  isNewESim:      true,
  paymentMethod:  'FIAT',
  useStoreCredit: false,
};

const TOPUP_REQUEST: CreateOrderRequest = {
  catalogueId:    'plan-us-1',
  isNewESim:      false,
  eSimRef:        'esim-ref-1',
  paymentMethod:  'DEVICE_WALLET',
  asset:          'USDC',
  useStoreCredit: false,
};

function envelope<T>(data: T) {
  return { success: true, correlationId: 'key-123', message: '', data };
}

function bffError(code: string) {
  return { success: false, code, correlationId: null, message: code };
}

function status(orderStatus: string) {
  return envelope({ orderId: 'ord-1', planId: 'plan-us-1', orderStatus, paymentMethod: 'FIAT' });
}

function rejection(httpStatus: number, code: string) {
  return { status: httpStatus, data: bffError(code) };
}

beforeEach(() => jest.clearAllMocks());

describe('submitOrder', () => {
  it('posts the request body to /order', async () => {
    mockPost.mockResolvedValue(envelope({ orderId: 'ord-1' }));
    await submitOrder(NEW_ESIM_REQUEST);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/order');
    expect(body).toEqual(NEW_ESIM_REQUEST);
  });

  it('sends a fresh idempotency key and returns it with the order', async () => {
    mockPost.mockResolvedValue(envelope({ orderId: 'ord-1' }));
    const result = await submitOrder(TOPUP_REQUEST);
    const [, , config] = mockPost.mock.calls[0];
    expect(config?.headers).toEqual({ 'x-correlation-id': 'key-123' });
    expect(result).toEqual({ data: { orderId: 'ord-1' }, correlationId: 'key-123' });
  });

  it('never sends a deviceId', async () => {
    mockPost.mockResolvedValue(envelope({ orderId: 'ord-1' }));
    await submitOrder(TOPUP_REQUEST);
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('deviceId');
  });

  it('throws BffError with the user message when the BFF refuses the order', async () => {
    mockPost.mockResolvedValue(bffError('FIRST_ORDER_IN_PROGRESS'));
    await expect(submitOrder(NEW_ESIM_REQUEST)).rejects.toMatchObject({
      code: 'FIRST_ORDER_IN_PROGRESS',
      userMessage: expect.stringContaining('first-order code'),
    });
  });

  it('turns a rejected HTTP response into BffError with its status', async () => {
    mockPost.mockRejectedValue(rejection(400, 'FIAT_MINIMUM_NOT_MET'));
    const err = await submitOrder(NEW_ESIM_REQUEST).catch((e) => e);
    expect(err).toBeInstanceOf(BffError);
    expect(err).toMatchObject({ code: 'FIAT_MINIMUM_NOT_MET', httpStatus: 400 });
  });
});

describe('previewOrder', () => {
  it('posts to /order/preview and returns the pricing', async () => {
    const pricing = { listPriceCents: 500, codeDiscountCents: 50, creditAppliedCents: 0, railAmountCents: 450 };
    mockPost.mockResolvedValue(envelope(pricing));
    await expect(previewOrder(NEW_ESIM_REQUEST)).resolves.toEqual(pricing);
    expect(mockPost.mock.calls[0][0]).toBe('/order/preview');
  });
});

describe('getOrderStatus', () => {
  it('reads /order/:key', async () => {
    mockGet.mockResolvedValue(status('COMPLETED'));
    await getOrderStatus('key-123');
    expect(mockGet).toHaveBeenCalledWith('/order/key-123');
  });

  it('maps a 404 to OrderNotFoundError', async () => {
    mockGet.mockRejectedValue(rejection(404, 'ORDER_NOT_FOUND'));
    await expect(getOrderStatus('key-123')).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('keeps ACCOUNT_DELETED as a BffError', async () => {
    mockGet.mockRejectedValue(rejection(404, 'ACCOUNT_DELETED'));
    await expect(getOrderStatus('key-123')).rejects.toMatchObject({ code: 'ACCOUNT_DELETED' });
  });
});

describe('submitPaymentHash and cancelOrder', () => {
  it('posts the user operation hash for the order', async () => {
    mockPost.mockResolvedValue(envelope({ orderId: 'ord-1' }));
    await submitPaymentHash('key-123', '0xhash');
    expect(mockPost).toHaveBeenCalledWith('/order/key-123/payment-submission', { userOperationHash: '0xhash' });
  });

  it('posts to the cancel endpoint for the order', async () => {
    mockPost.mockResolvedValue(envelope({ orderId: 'ord-1' }));
    await cancelOrder('key-123');
    expect(mockPost).toHaveBeenCalledWith('/order/key-123/cancel');
  });
});

describe('pollOrderStatus', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns as soon as the order reaches a terminal status', async () => {
    mockGet
      .mockResolvedValueOnce(status('PAYMENT_PENDING'))
      .mockResolvedValueOnce(status('COMPLETED'));
    const onUpdate = jest.fn();

    const poll = pollOrderStatus('key-123', { intervalMs: 1000, onUpdate });
    await jest.advanceTimersByTimeAsync(1000);

    await expect(poll).resolves.toMatchObject({ orderStatus: 'COMPLETED' });
    expect(onUpdate).toHaveBeenCalledWith({ kind: 'status', orderStatus: 'PAYMENT_PENDING' });
  });

  it('backs off and keeps polling when rate limited', async () => {
    mockGet
      .mockRejectedValueOnce(rejection(429, 'RATE_LIMIT_EXCEEDED'))
      .mockResolvedValueOnce(status('COMPLETED'));
    const onUpdate = jest.fn();

    const poll = pollOrderStatus('key-123', { intervalMs: 1000, onUpdate });
    await jest.advanceTimersByTimeAsync(1000);

    await expect(poll).resolves.toMatchObject({ orderStatus: 'COMPLETED' });
    expect(onUpdate).toHaveBeenCalledWith({ kind: 'retrying', attempt: 1, waitMs: 1000 });
  });

  it('stops on any error other than a rate limit', async () => {
    mockGet.mockRejectedValue(rejection(500, 'INTERNAL_SERVER_ERROR'));
    await expect(pollOrderStatus('key-123')).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });

  it('times out when the order never finishes', async () => {
    mockGet.mockResolvedValue(status('PAYMENT_PENDING'));

    const poll = pollOrderStatus('key-123', { intervalMs: 1000, maxDurationMs: 3000 });
    const assertion = expect(poll).rejects.toThrow('Order confirmation timed out');
    await jest.advanceTimersByTimeAsync(3000);

    await assertion;
  });
});
