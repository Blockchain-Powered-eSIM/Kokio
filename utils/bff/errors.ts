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
  TXN_HASH_ALREADY_USED:             'Payment already processed.',
  ORDER_CREATION_FAILED:             'Order could not be completed. Please try again.',
  INVALID_PAYMENT_METHOD:            'Invalid payment method. Please try again.',
  PAYMENT_FAILED:                    'Payment failed. Please try again.',
  MOONPAY_CHARGE_CREATION_FAILED:    'Could not initiate payment. Please try again.',
  STRIPE_CUSTOMER_CREATION_FAILED:   'Could not initiate payment. Please try again.',
  STRIPE_INVOICE_CREATION_FAILED:    'Could not initiate payment. Please try again.',
  STRIPE_INVOICE_FINALIZATION_FAILED: 'Payment could not be finalised. Please try again.',
  ORDER_NOT_CANCELLABLE:             "This order can't be cancelled. A payment may already have been received.",
  STRIPE_INVOICE_VOID_FAILED:        "We couldn't cancel this order right now. Please try again.",
  // eSIM
  ESIM_NOT_FOUND_FOR_DEVICE:        'eSIM not found.',
  NO_ACTIVE_ESIMS_FOR_DEVICE:       'No active eSIMs found.',
  TOPUP_COMPATIBILITY_CHECK_FAILED: 'Could not check top-up compatibility. Please try again.',
  NO_EQUIVALENT_TOPUP_PLAN:         'No compatible top-up plan available.',
  INVALID_ESIM_TOPUP:               'This plan cannot be used for this order type.',
  ACCOUNT_NOT_FOUND:                'Account not found. Please sign in again.',
  // Promo codes, referrals, store credit
  PROMO_CODE_INVALID_FORMAT:  'Enter a valid code.',
  PROMO_CODE_NOT_FOUND:       'Invalid code.',
  PROMO_CODE_NOT_YET_VALID:   'This code is not active yet.',
  PROMO_CODE_EXPIRED:         'This code has expired.',
  PROMO_CODE_REVOKED:         'This code is no longer valid.',
  PROMO_CODE_EXHAUSTED:       'This code has been fully used.',
  PROMO_ACCOUNT_LIMIT_REACHED: "You've already used this code the maximum number of times.",
  PROMO_FIRST_PURCHASE_ONLY:  'This code is only valid on your first purchase.',
  PROMO_CODE_NOT_APPLICABLE:  "This code can't be applied to this order.",
  REFERRAL_NOT_ALLOWED:       "You can't use this referral code.",
  FIAT_MINIMUM_NOT_MET:       'The amount to pay by card must be $1.00 or more.',
  STORE_CREDIT_INSUFFICIENT:  'Your available credit changed. Please review your order and try again.',
  FIRST_ORDER_IN_PROGRESS:    'You already have an order in progress using a first-order code. Complete or cancel it from Orders, or remove the code.',
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

export function isAccountDeletedError(e: unknown): boolean {
  return e instanceof BffError && e.code === 'ACCOUNT_DELETED';
}

// ─── formatBffError ───────────────────────────────────────────────────────────
// Pass the caught value directly; returns a string ready for showMessage().

export function formatBffError(error: unknown): string {
  if (error instanceof BffError) return error.userMessage;
  if (error instanceof Error)    return error.message;
  return 'Something went wrong. Please try again.';
}
