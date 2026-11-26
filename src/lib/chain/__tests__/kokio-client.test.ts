// Tests for the SDK setup: which chain is used, which RPC URL it talks to,
// and which keys reach the Kokio constructor.

import { Kokio } from 'kokio-sdk';
import { base, baseSepolia } from 'viem/chains';

const mockConfig: Record<string, unknown> = {};
jest.mock('@/lib/config', () => ({
  get Config() { return mockConfig; },
}));

const mockHttp = jest.fn((url: string) => ({ url }));
jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  http: (url: string) => mockHttp(url),
  createWalletClient: jest.fn((args: unknown) => ({ kind: 'wallet-client', args })),
}));

import { createKokioClient, resolveChain, withSmartAccount } from '../kokio-client';

const MockKokio = Kokio as unknown as jest.Mock;
const SIGNER = '0x0000000000000000000000000000000000000001' as const;

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockConfig)) delete mockConfig[key];
});

describe('resolveChain', () => {
  it.each([
    [base.id, base],
    [baseSepolia.id, baseSepolia],
  ])('returns the chain for id %p', (id, chain) => {
    mockConfig.CHAIN_ID = id;
    expect(resolveChain()).toBe(chain);
  });

  it.each([undefined, 1, 10])('refuses a missing or unsupported chain id (%p)', (id) => {
    mockConfig.CHAIN_ID = id;
    expect(resolveChain()).toBeNull();
  });
});

describe('createKokioClient', () => {
  it('uses the Alchemy endpoint for the chain when an Alchemy key is set', () => {
    mockConfig.ALCHEMY_API_KEY = 'alc-key';
    createKokioClient(base, 'cred-1', SIGNER);
    expect(mockHttp).toHaveBeenCalledWith('https://base-mainnet.g.alchemy.com/v2/alc-key');

    createKokioClient(baseSepolia, 'cred-1', SIGNER);
    expect(mockHttp).toHaveBeenLastCalledWith('https://base-sepolia.g.alchemy.com/v2/alc-key');
  });

  it('falls back to the configured RPC URL, then the chain default', () => {
    mockConfig.CHAIN_RPC_URL = 'https://rpc.example';
    createKokioClient(base, 'cred-1', SIGNER);
    expect(mockHttp).toHaveBeenLastCalledWith('https://rpc.example');

    delete mockConfig.CHAIN_RPC_URL;
    createKokioClient(base, 'cred-1', SIGNER);
    expect(mockHttp).toHaveBeenLastCalledWith(base.rpcUrls.default.http[0]);
  });

  it('passes the credential, relying party and bundler keys to the SDK', () => {
    mockConfig.PIMLICO_API_KEY = 'pim-key';
    mockConfig.GAS_MANAGER_POLICY_ID = 'policy-1';
    createKokioClient(base, 'cred-1', SIGNER);

    const [walletClient, credentialId, rpId, pimlicoKey, policyId] = MockKokio.mock.calls[0];
    expect(walletClient.args).toMatchObject({ chain: base, account: SIGNER });
    expect([credentialId, rpId, pimlicoKey, policyId]).toEqual(['cred-1', 'kokio.app', 'pim-key', 'policy-1']);
  });

  it('passes empty strings when the bundler keys are missing', () => {
    createKokioClient(base, 'cred-1', SIGNER);
    expect(MockKokio.mock.calls[0].slice(3, 5)).toEqual(['', '']);
  });
});

describe('withSmartAccount', () => {
  it('rebuilds the SDK with the same keys and the smart account bound', () => {
    const sdk = {
      viemWalletClient: 'wallet-client',
      credentialId: 'cred-1',
      rpId: 'kokio.app',
      pimlicoAPIKey: 'pim-key',
      gasPolicyId: 'policy-1',
    } as unknown as Kokio;

    withSmartAccount(sdk, 'smart-client' as never, SIGNER);

    expect(MockKokio).toHaveBeenCalledWith(
      'wallet-client', 'cred-1', 'kokio.app', 'pim-key', 'policy-1', 'smart-client', SIGNER,
    );
  });
});
