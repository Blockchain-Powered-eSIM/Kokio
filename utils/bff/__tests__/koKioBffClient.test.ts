/**
 * koKioBffClient tests
 *
 * unwrapBffResponse takes a Promise<unknown> that resolves to a raw BFF
 * envelope (already unwrapped from Axios by the httpService interceptor) and
 * either extracts `.data` or throws BffError. No HTTP layer involved — no
 * mocking required.
 */

import { unwrapBffResponse, BffError, formatBffError } from '../koKioBffClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function successEnvelope<T>(data: T) {
  return Promise.resolve({ success: true, correlationId: 'corr-1', message: 'ok', data });
}

function errorEnvelope(code: string, message = 'server error') {
  return Promise.resolve({ success: false, code, correlationId: 'corr-2', message });
}

// ─── unwrapBffResponse ────────────────────────────────────────────────────────

describe('unwrapBffResponse', () => {
  describe('success envelope', () => {
    it('extracts and returns .data from the envelope', async () => {
      const data = { plans: [{ id: 'p1' }] };
      await expect(unwrapBffResponse(successEnvelope(data))).resolves.toBe(data);
    });

    it('works with primitive data values', async () => {
      await expect(unwrapBffResponse(successEnvelope(42))).resolves.toBe(42);
    });

    it('works with null data', async () => {
      await expect(unwrapBffResponse(successEnvelope(null))).resolves.toBeNull();
    });

    it('works with array data', async () => {
      const arr = [1, 2, 3];
      await expect(unwrapBffResponse(successEnvelope(arr))).resolves.toBe(arr);
    });
  });

  describe('error envelope — throws BffError', () => {
    it('throws BffError when success is false', async () => {
      await expect(unwrapBffResponse(errorEnvelope('NOT_FOUND'))).rejects.toBeInstanceOf(BffError);
    });

    it('thrown BffError carries the envelope code', async () => {
      await expect(
        unwrapBffResponse(errorEnvelope('COUPON_NOT_FOUND')),
      ).rejects.toMatchObject({ code: 'COUPON_NOT_FOUND' });
    });

    it('thrown BffError carries the envelope message as error.message', async () => {
      await expect(
        unwrapBffResponse(errorEnvelope('NOT_FOUND', 'plan not found')),
      ).rejects.toMatchObject({ message: 'plan not found' });
    });

    it('resolves userMessage from the known-code map', async () => {
      await expect(
        unwrapBffResponse(errorEnvelope('TXN_HASH_ALREADY_USED')),
      ).rejects.toMatchObject({ userMessage: 'Payment already processed.' });
    });

    it('uses generic fallback userMessage for unknown error codes', async () => {
      await expect(
        unwrapBffResponse(errorEnvelope('MYSTERY_CODE')),
      ).rejects.toMatchObject({ userMessage: 'Something went wrong. Please try again.' });
    });
  });

  describe('promise rejection propagation', () => {
    it('propagates a network error from the underlying promise', async () => {
      const networkErr = new Error('Network Error');
      await expect(unwrapBffResponse(Promise.reject(networkErr))).rejects.toBe(networkErr);
    });

    it('propagates non-Error rejection values', async () => {
      await expect(unwrapBffResponse(Promise.reject('timeout'))).rejects.toBe('timeout');
    });
  });
});

// ─── Re-exported BffError & formatBffError ────────────────────────────────────
// These are re-exported from errors.ts. Verify they are available from this
// entry-point so callers don't need to import from two places.

describe('re-exports from koKioBffClient', () => {
  it('BffError is exported and constructable', () => {
    const err = new BffError('FORBIDDEN');
    expect(err).toBeInstanceOf(BffError);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('formatBffError is exported and handles BffError', () => {
    const err = new BffError('NOT_FOUND');
    expect(formatBffError(err)).toBe(err.userMessage);
  });

  it('formatBffError is exported and handles generic Error', () => {
    expect(formatBffError(new Error('boom'))).toBe('boom');
  });
});
