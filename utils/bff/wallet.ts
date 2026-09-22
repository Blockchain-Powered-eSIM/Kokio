/**
 * Device-wallet deployment
 * The backend now owns deployment entirely: POST /account/wallet/deploy asks
 * it to deploy the authenticated device's smart account asynchronously, and
 * GET /account/wallet reports progress. Client-side self-deployment (signing
 * and sending a user operation directly) is deprecated.
 */

import { unwrapBffResponse, unwrapBffResponseWithCorrelation, BffError } from './koKioBffClient';
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

// User-facing progress copy for each deployment step, shared by every screen
// that shows deployment progress (WalletSetupModal, create-wallet.tsx).
export const WALLET_DEPLOYMENT_STEP_LABELS: Record<DeploymentStep, string> = {
  FLUSH: 'Preparing your wallet...',
  ROUTE: 'Preparing your wallet...',
  DEPLOY: 'Deploying your wallet on-chain...',
  COPY: 'Finishing up...',
  BACKFILL: 'Finishing up...',
  POOL: 'Finishing up...',
};

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

export class WalletDeploymentFailedError extends Error {
  readonly lastError: string | null;
  readonly status: DeploymentStatus | null;

  constructor(lastError: string | null, status: DeploymentStatus | null) {
    super(lastError ?? 'Wallet deployment failed. Please try again.');
    this.name = 'WalletDeploymentFailedError';
    this.lastError = lastError;
    this.status = status;
  }
}

export type WalletPollUpdate =
  | { kind: 'step'; currentStep: DeploymentStep | null }
  | { kind: 'retrying'; attempt: number; waitMs: number };

export type PollWalletStateOptions = {
  // Steady-state cadence between polls. Default 7000ms — the endpoint is
  // rate-limited to 10 requests/minute per device, so this stays above the
  // 6-second floor with margin.
  intervalMs?: number;
  // Total budget, including any 429 backoff waits. Default 120000ms — an
  // on-chain deployment can take longer than a simple order-status poll.
  maxDurationMs?: number;
  onUpdate?: (update: WalletPollUpdate) => void;
};

const DEFAULT_POLL_INTERVAL_MS = 7000;
const DEFAULT_POLL_MAX_DURATION_MS = 120000;
const BACKOFF_CAP_MS = 15000;

/**
 * Polls GET /account/wallet until walletState is DEPLOYED, or until the
 * in-flight deployment reaches a terminal failure state.
 *
 * The spec doesn't say what walletState becomes after a failed deployment
 * (see BFF_SPEC_SYNC_TICKETS.md's backend question 1) — if it falls back to
 * NOT_DEPLOYED, deployment goes null and lastError is unreadable. Handled
 * below by treating a NOT_DEPLOYED read mid-poll as a failure with no
 * available reason, rather than crashing or polling forever.
 */
export async function pollWalletState(options: PollWalletStateOptions = {}): Promise<WalletStateResponse> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_POLL_MAX_DURATION_MS;
  const onUpdate = options.onUpdate;

  const deadline = Date.now() + maxDurationMs;
  let backoffMs = intervalMs;
  let retryAttempt = 0;

  while (Date.now() < deadline) {
    let state: WalletStateResponse;
    try {
      state = await getWalletState();
    } catch (err) {
      if (!(err instanceof BffError) || err.httpStatus !== 429) throw err;

      retryAttempt += 1;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const waitMs = Math.min(backoffMs, remaining);
      onUpdate?.({ kind: 'retrying', attempt: retryAttempt, waitMs });
      await new Promise<void>((r) => setTimeout(r, waitMs));
      backoffMs = Math.min(backoffMs * 2, BACKOFF_CAP_MS);
      continue;
    }

    logger.debug('WALLET_POLL_STATE', { state });

    if (state.walletState === 'DEPLOYED') return state;

    if (state.walletState === 'NOT_DEPLOYED') {
      throw new WalletDeploymentFailedError(state.deployment?.lastError ?? null, state.deployment?.status ?? null);
    }

    // walletState === 'DEPLOYING'
    if (state.deployment?.status === 'STALLED' || state.deployment?.status === 'FAILED') {
      throw new WalletDeploymentFailedError(state.deployment.lastError, state.deployment.status);
    }

    onUpdate?.({ kind: 'step', currentStep: state.deployment?.currentStep ?? null });
    backoffMs = intervalMs;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise<void>((r) => setTimeout(r, Math.min(intervalMs, remaining)));
  }

  throw new Error('Wallet deployment timed out. Please try again.');
}
