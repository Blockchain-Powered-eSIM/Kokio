/**
 * Device-wallet deployment
 * The backend now owns deployment entirely: POST /account/wallet/deploy asks
 * it to deploy the authenticated device's smart account asynchronously, and
 * GET /account/wallet reports progress. Client-side self-deployment (signing
 * and sending a user operation directly) is deprecated.
 */

import type { Kokio } from 'kokio-sdk';
import { unwrapBffResponse, unwrapBffResponseWithCorrelation } from './koKioBffClient';
import api from '@/services/httpService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export type WalletState = 'NOT_DEPLOYED' | 'DEPLOYING' | 'DEPLOYED';
export type DeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'STALLED' | 'FAILED';
export type DeploymentStep = 'FLUSH' | 'ROUTE' | 'DEPLOY' | 'COPY' | 'BACKFILL' | 'POOL';

export interface WalletDeployment {
  requestId: string;
  status: DeploymentStatus;
  currentStep: DeploymentStep | null;
  lastError: string | null;
}

export interface WalletStateResponse {
  deviceWalletAddress: string;
  walletState: WalletState;
  deployment: WalletDeployment | null;
}

export interface WalletDeployResponse {
  requestId: string;
  walletState: WalletState;
  status: DeploymentStatus;
}

// GET /account/wallet needs only DPoP auth, no step-up — safe to call from an
// automatic effect (kokioProvider's auto-derive) without ever prompting for
// biometrics. GET /account, by contrast, requires step-up and must not be
// used for this.
export function getWalletState(): Promise<WalletStateResponse> {
  return unwrapBffResponse<WalletStateResponse>(api.get('/v1/account/wallet'));
}

// POST /account/wallet/deploy requires step-up — the existing STEP_UP_REQUIRED
// interceptor in services/httpService.ts pauses this call and shows the
// biometric prompt automatically, no extra plumbing needed here. A 409
// WALLET_ALREADY_DEPLOYED means there is nothing left to do; callers should
// treat that BffError as a converge case, not a failure (see useWalletDeployment.ts).
export function requestWalletDeployment(): Promise<{ data: WalletDeployResponse; correlationId: string }> {
  const idempotencyKey = uuidv4();
  return unwrapBffResponseWithCorrelation<WalletDeployResponse>(
    api.post('/v1/account/wallet/deploy', {}, {
      headers: { 'x-correlation-id': idempotencyKey },
    }),
  ).then((r) => ({ ...r, correlationId: idempotencyKey }));
}

export type WalletConfirmationOptions = {
  intervalMs?: number;
  maxDurationMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 20000;
const DEFAULT_POLL_MAX_DURATION_MS = 10 * 60 * 1000;

export async function awaitWalletDeploymentConfirmation(
  registry: Kokio['registry'],
  deviceWalletAddress: `0x${string}`,
  options: WalletConfirmationOptions = {},
): Promise<boolean> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_POLL_MAX_DURATION_MS;
  const deadline = Date.now() + maxDurationMs;

  while (Date.now() < deadline) {
    const [onchainValid, state] = await Promise.all([
      registry?.isDeviceWalletValid(deviceWalletAddress).catch(() => false) ?? Promise.resolve(false),
      getWalletState().catch(() => null),
    ]);

    if (onchainValid || state?.walletState === 'DEPLOYED') return true;

    if (state?.walletState === 'DEPLOYING' &&
      (state.deployment?.status === 'STALLED' || state.deployment?.status === 'FAILED')) {
      logger.error('WALLET_DEPLOYMENT_WATCH_TERMINAL_FAILURE', { state });
      return false;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise<void>((r) => setTimeout(r, Math.min(intervalMs, remaining)));
  }

  return false;
}
