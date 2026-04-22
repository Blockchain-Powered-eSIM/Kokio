const ERROR_MESSAGES: Record<string, string> = {
  CREDENTIAL_ALREADY_EXISTS: 'A passkey is already set up on this device. Try signing in.',
  CREDENTIAL_EXISTS:         'A passkey is already set up on this device. Try signing in.',
  DEVICE_WALLET_DERIVATION_FAILED: "We couldn't set up your wallet. Please try again.",
  DERIVATION_FAILED:         "We couldn't set up your wallet. Please try again.",
  REGISTRATION_FAILED:       'Passkey setup failed. Please try again.',
  INVALID_ATTESTATION:       'Passkey setup failed. Please try again.',
  RATE_LIMIT_EXCEEDED:       'Too many attempts. Please wait a minute.',
  TOO_MANY_REQUESTS:         'Too many attempts. Please wait a minute.',
};

const HTTP_MESSAGES: Record<number, string> = {
  429: 'Too many attempts. Please wait a minute.',
  502: "We couldn't set up your wallet. Please try again.",
  503: 'Service temporarily unavailable. Please try again.',
};

export function resolveAuthErrorMessage(code?: string, httpStatus?: number): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (httpStatus && HTTP_MESSAGES[httpStatus]) return HTTP_MESSAGES[httpStatus];
  return 'Something went wrong. Please try again.';
}

export class AuthError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly httpStatus?: number;

  constructor(code: string, httpStatus?: number, serverMessage?: string) {
    const userMessage = resolveAuthErrorMessage(code, httpStatus);
    super(serverMessage ?? userMessage);
    this.name = 'AuthError';
    this.code = code;
    this.userMessage = userMessage;
    this.httpStatus = httpStatus;
  }
}
