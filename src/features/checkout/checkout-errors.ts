/** Order errors caused by the entered promo or referral code. */
export const CODE_ERROR_CODES: ReadonlySet<string> = new Set([
  'PROMO_CODE_INVALID_FORMAT',
  'PROMO_CODE_NOT_FOUND',
  'PROMO_CODE_NOT_YET_VALID',
  'PROMO_CODE_EXPIRED',
  'PROMO_CODE_REVOKED',
  'PROMO_CODE_EXHAUSTED',
  'PROMO_ACCOUNT_LIMIT_REACHED',
  'PROMO_FIRST_PURCHASE_ONLY',
  'PROMO_CODE_NOT_APPLICABLE',
  'REFERRAL_NOT_ALLOWED',
]);

/** Order errors that have a user-facing message of their own. */
export const MAPPED_ORDER_ERROR_CODES: ReadonlySet<string> = new Set([
  ...CODE_ERROR_CODES,
  'FIAT_MINIMUM_NOT_MET',
  'STORE_CREDIT_INSUFFICIENT',
  'FIRST_ORDER_IN_PROGRESS',
]);
