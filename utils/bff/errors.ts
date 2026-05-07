// ─── User-facing message map ──────────────────────────────────────────────────

const BFF_ERROR_MESSAGES: Record<string, string> = {
  // Generic
  INTERNAL_SERVER_ERROR:  'Something went wrong. Please try again.',
  INVALID_PAYLOAD:        'Invalid request.',
  REQUIRED_FIELD:         'Invalid request.',
  INVALID_VALUE:          'Invalid request.',
  REQUIRED_HEADER_FIELD:  'Invalid request.',
  NOT_FOUND:              'Resource not found.',
  // Auth / DPoP
  UNAUTHORIZED:                    'Session expired. Please sign in again.',
  TOKEN_EXPIRED:                   'Session expired, refreshing...',
  STEP_UP_REQUIRED:                'Please confirm with biometrics.',
  FORBIDDEN:                       "You don't have permission to do that.",
  ADMIN_TOKEN_INVALID:             'Unauthorized.',
  DPOP_PROOF_MISSING:              'Authentication error. Please try again.',
  DPOP_PROOF_MALFORMED:            'Authentication error. Please try again.',
  DPOP_PROOF_SIGNATURE_INVALID:    'Authentication error. Please try again.',
  DPOP_PROOF_BINDING_INVALID:      'Authentication error. Please try again.',
  DPOP_PROOF_STALE:                'Authentication error. Please try again.',
  DPOP_PROOF_REPLAYED:             'Authentication error. Please try again.',
  DPOP_PROOF_KEY_MISMATCH:         'Authentication error. Please try again.',
  // Catalogue
  NO_SERVICE_REGIONS_PROVIDED: 'Invalid request.',
  NO_VENDORS_PROVIDED:         'Invalid request.',
  INVALID_VENDORS:             'Invalid request.',
  // Order
  TXN_HASH_ALREADY_USED:        'Payment already processed.',
  INVALID_OR_INSUFFICIENT_TX:   'Payment transaction invalid or insufficient.',
  ORDER_CREATION_FAILED:        'Order could not be completed. Please try again.',
  // eSIM
  ESIM_NOT_FOUND_FOR_DEVICE:        'eSIM not found.',
  NO_ACTIVE_ESIMS_FOR_DEVICE:       'No active eSIMs found.',
  TOPUP_COMPATIBILITY_CHECK_FAILED: 'Could not check top-up compatibility. Please try again.',
  NO_EQUIVALENT_TOPUP_PLAN:         'No compatible top-up plan available.',
  // Coupon
  COUPON_NOT_FOUND:             'Invalid coupon code.',
  COUPON_INSUFFICIENT_BALANCE:  'Coupon has insufficient balance.',
  COUPON_ALREADY_ISSUED_FOR_TX: 'A coupon has already been issued for this transaction.',
  COUPON_CODE_GEN_FAILED:       'Could not generate coupon. Please try again.',
  // Vendor
  VENDOR_ORDER_FAILED: 'Order could not be completed. Please try again.',
  VENDOR_PLANS_FAILED: 'Could not load plans. Please try again.',
  // Admin
  SECRET_ROTATION_FAILED: 'Something went wrong. Please try again.',
  // Health / infrastructure
  APP_DB_UNAVAILABLE:    'Service temporarily unavailable. Please try again.',
  SECRETS_DB_UNAVAILABLE: 'Service temporarily unavailable. Please try again.',
  PREWARM_FAILED:        'Service temporarily unavailable. Please try again.',
  PING_FAILED:           'Service temporarily unavailable. Please try again.',
  JWKS_FETCH_FAILED:     'Service temporarily unavailable. Please try again.',
  JWKS_INVALID_RESPONSE: 'Service temporarily unavailable. Please try again.',
};

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  429: 'Too many attempts. Please wait a minute.',
  502: 'Something went wrong. Please try again.',
  503: 'Service temporarily unavailable. Please try again.',
};

export function resolveBffErrorMessage(code: string, httpStatus?: number): string {
  if (BFF_ERROR_MESSAGES[code]) return BFF_ERROR_MESSAGES[code];
  if (httpStatus && HTTP_STATUS_MESSAGES[httpStatus]) return HTTP_STATUS_MESSAGES[httpStatus];
  return 'Something went wrong. Please try again.';
}

// ─── BffError ─────────────────────────────────────────────────────────────────

export class BffError extends Error {
  readonly code: string;
  readonly httpStatus?: number;
  readonly userMessage: string;
  readonly correlationId?: string | null;

  constructor(code: string, httpStatus?: number, serverMessage?: string, correlationId?: string | null) {
    const userMessage = resolveBffErrorMessage(code, httpStatus);
    super(serverMessage ?? userMessage);
    this.name = 'BffError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.userMessage = userMessage;
    this.correlationId = correlationId;
  }
}

// ─── formatBffError ───────────────────────────────────────────────────────────
// Pass the caught value directly; returns a string ready for showMessage().

export function formatBffError(error: unknown): string {
  if (error instanceof BffError) return error.userMessage;
  if (error instanceof Error)    return error.message;
  return 'Something went wrong. Please try again.';
}
