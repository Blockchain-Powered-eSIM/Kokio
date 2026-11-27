import { sendAndConfirmUserOperation } from '../send-user-operation';

const CALL = { to: '0x0000000000000000000000000000000000000001' as const, data: '0x' as const };

function setup(success: boolean) {
  const deviceWallet = { sendUserOperation: jest.fn().mockResolvedValue('0xuserop') };
  const smartAccountClient = {
    waitForUserOperationReceipt: jest.fn().mockResolvedValue({ success, receipt: { transactionHash: '0xtx' } }),
  };
  return { deviceWallet, smartAccountClient } as never as {
    deviceWallet: Parameters<typeof sendAndConfirmUserOperation>[0];
    smartAccountClient: Parameters<typeof sendAndConfirmUserOperation>[1];
  };
}

describe('sendAndConfirmUserOperation', () => {
  it('returns both hashes once the operation is mined successfully', async () => {
    const { deviceWallet, smartAccountClient } = setup(true);
    await expect(sendAndConfirmUserOperation(deviceWallet, smartAccountClient, [CALL])).resolves.toEqual({
      userOpHash: '0xuserop',
      transactionHash: '0xtx',
    });
    expect(smartAccountClient.waitForUserOperationReceipt).toHaveBeenCalledWith({ hash: '0xuserop' });
  });

  it('throws when the mined operation reverted', async () => {
    const { deviceWallet, smartAccountClient } = setup(false);
    await expect(sendAndConfirmUserOperation(deviceWallet, smartAccountClient, [CALL])).rejects.toThrow('reverted');
  });
});
