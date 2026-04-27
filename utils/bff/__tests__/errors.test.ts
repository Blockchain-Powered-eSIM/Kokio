import { BffError, resolveBffErrorMessage, formatBffError } from '../errors';

// ─── resolveBffErrorMessage ───────────────────────────────────────────────────

describe('resolveBffErrorMessage', () => {
  it('returns the mapped message for a known BFF error code', () => {
    expect(resolveBffErrorMessage('NOT_FOUND')).toBe('Resource not found.');
  });

  it('returns the mapped message for auth codes', () => {
    expect(resolveBffErrorMessage('UNAUTHORIZED')).toBe('Session expired. Please sign in again.');
  });

  it('returns the mapped message for coupon codes', () => {
    expect(resolveBffErrorMessage('COUPON_NOT_FOUND')).toBe('Invalid coupon code.');
    expect(resolveBffErrorMessage('COUPON_INSUFFICIENT_BALANCE')).toBe('Coupon has insufficient balance.');
  });

  it('returns the mapped message for order codes', () => {
    expect(resolveBffErrorMessage('TXN_HASH_ALREADY_USED')).toBe('Payment already processed.');
    expect(resolveBffErrorMessage('ORDER_CREATION_FAILED')).toBe('Order could not be completed. Please try again.');
  });

  it('returns the mapped message for eSIM codes', () => {
    expect(resolveBffErrorMessage('ESIM_NOT_FOUND_FOR_DEVICE')).toBe('eSIM not found.');
    expect(resolveBffErrorMessage('NO_ACTIVE_ESIMS_FOR_DEVICE')).toBe('No active eSIMs found.');
  });

  it('falls back to HTTP status message when code is unknown but status matches', () => {
    expect(resolveBffErrorMessage('UNKNOWN_CODE', 429)).toBe('Too many attempts. Please wait a minute.');
    expect(resolveBffErrorMessage('UNKNOWN_CODE', 503)).toBe('Service temporarily unavailable. Please try again.');
    expect(resolveBffErrorMessage('UNKNOWN_CODE', 502)).toBe('Something went wrong. Please try again.');
  });

  it('prefers code message over HTTP status message when code is known', () => {
    expect(resolveBffErrorMessage('NOT_FOUND', 429)).toBe('Resource not found.');
  });

  it('returns the generic fallback for a totally unknown code and no status', () => {
    expect(resolveBffErrorMessage('COMPLETELY_UNKNOWN')).toBe('Something went wrong. Please try again.');
  });

  it('returns the generic fallback for an unknown code with an unrecognised HTTP status', () => {
    expect(resolveBffErrorMessage('COMPLETELY_UNKNOWN', 418)).toBe('Something went wrong. Please try again.');
  });
});

// ─── BffError ─────────────────────────────────────────────────────────────────

describe('BffError', () => {
  it('is an instance of Error', () => {
    expect(new BffError('NOT_FOUND')).toBeInstanceOf(Error);
  });

  it('name is "BffError"', () => {
    expect(new BffError('NOT_FOUND').name).toBe('BffError');
  });

  it('stores the passed code verbatim', () => {
    expect(new BffError('TXN_HASH_ALREADY_USED').code).toBe('TXN_HASH_ALREADY_USED');
  });

  it('resolves userMessage from the code map', () => {
    expect(new BffError('NOT_FOUND').userMessage).toBe('Resource not found.');
  });

  it('message defaults to userMessage when no serverMessage is provided', () => {
    const err = new BffError('NOT_FOUND');
    expect(err.message).toBe(err.userMessage);
  });

  it('message uses the serverMessage when provided', () => {
    const err = new BffError('NOT_FOUND', undefined, 'Custom server message');
    expect(err.message).toBe('Custom server message');
    expect(err.userMessage).toBe('Resource not found.'); // userMessage unchanged
  });

  it('stores httpStatus when provided', () => {
    const err = new BffError('UNAUTHORIZED', 401);
    expect(err.httpStatus).toBe(401);
  });

  it('httpStatus is undefined when not provided', () => {
    expect(new BffError('NOT_FOUND').httpStatus).toBeUndefined();
  });

  it('userMessage falls back to generic message for unmapped code', () => {
    expect(new BffError('COMPLETELY_UNKNOWN').userMessage).toBe('Something went wrong. Please try again.');
  });

  it('uses HTTP status message for unmapped code when status is provided', () => {
    expect(new BffError('COMPLETELY_UNKNOWN', 429).userMessage).toBe('Too many attempts. Please wait a minute.');
  });
});

// ─── formatBffError ───────────────────────────────────────────────────────────

describe('formatBffError', () => {
  it('returns userMessage for a BffError', () => {
    const err = new BffError('NOT_FOUND');
    expect(formatBffError(err)).toBe(err.userMessage);
  });

  it('returns message for a generic Error', () => {
    expect(formatBffError(new Error('network timeout'))).toBe('network timeout');
  });

  it('returns generic fallback for a string error', () => {
    expect(formatBffError('some string')).toBe('Something went wrong. Please try again.');
  });

  it('returns generic fallback for null', () => {
    expect(formatBffError(null)).toBe('Something went wrong. Please try again.');
  });

  it('returns generic fallback for undefined', () => {
    expect(formatBffError(undefined)).toBe('Something went wrong. Please try again.');
  });

  it('returns generic fallback for a plain object', () => {
    expect(formatBffError({ code: 'ERR' })).toBe('Something went wrong. Please try again.');
  });
});
