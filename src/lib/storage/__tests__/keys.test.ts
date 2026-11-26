// These values name data already saved on users' phones, and the persisted
// query cache is keyed on the query key roots. Changing one loses that data.

import * as storage from '../keys';
import * as queryKeys from '../../query-keys';

describe('storage keys', () => {
  it('keep their saved names', () => {
    expect({
      ACCOUNT_DELETED_KEY: storage.ACCOUNT_DELETED_KEY,
      AUTH_TOKENS_KEY: storage.AUTH_TOKENS_KEY,
      CREDENTIAL_ID_KEY: storage.CREDENTIAL_ID_KEY,
      DEVICE_UID_KEY: storage.DEVICE_UID_KEY,
      DEVICE_WALLET_ADDRESS_KEY: storage.DEVICE_WALLET_ADDRESS_KEY,
      DPOP_PRIVATE_KEY_KEY: storage.DPOP_PRIVATE_KEY_KEY,
      DPOP_PUBLIC_KEY_KEY: storage.DPOP_PUBLIC_KEY_KEY,
      ESIM_ID_KEY: storage.ESIM_ID_KEY,
      LOCAL_DATA_VERSION_KEY: storage.LOCAL_DATA_VERSION_KEY,
      PUBLIC_KEY_X_KEY: storage.PUBLIC_KEY_X_KEY,
      PUBLIC_KEY_Y_KEY: storage.PUBLIC_KEY_Y_KEY,
      RAW_SALT_KEY: storage.RAW_SALT_KEY,
      USED_TXN_HASHES_KEY: storage.USED_TXN_HASHES_KEY,
      WELCOME_BACK_SEEN_KEY: storage.WELCOME_BACK_SEEN_KEY,
      CONTACT_IDS_KEY: storage.CONTACT_IDS_KEY,
      CUSTOM_TOKENS_KEY: storage.CUSTOM_TOKENS_KEY,
      PENDING_ORDERS_STORAGE_KEY: storage.PENDING_ORDERS_STORAGE_KEY,
      THEME_STORAGE_KEY: storage.THEME_STORAGE_KEY,
    }).toEqual({
      ACCOUNT_DELETED_KEY: 'kokio.account.deleted',
      AUTH_TOKENS_KEY: 'kokio.auth.tokens',
      CREDENTIAL_ID_KEY: 'credentialId',
      DEVICE_UID_KEY: 'deviceUID',
      DEVICE_WALLET_ADDRESS_KEY: 'deviceWalletAddress',
      DPOP_PRIVATE_KEY_KEY: 'kokio.dpop.privateKey',
      DPOP_PUBLIC_KEY_KEY: 'kokio.dpop.publicKey',
      ESIM_ID_KEY: 'esimId',
      LOCAL_DATA_VERSION_KEY: 'kokioLocalDataVersion',
      PUBLIC_KEY_X_KEY: 'publicKeyX',
      PUBLIC_KEY_Y_KEY: 'publicKeyY',
      RAW_SALT_KEY: 'rawSalt',
      USED_TXN_HASHES_KEY: 'usedTxnHashes',
      WELCOME_BACK_SEEN_KEY: 'kokioWelcomeBackSeen',
      CONTACT_IDS_KEY: 'contactIds',
      CUSTOM_TOKENS_KEY: 'customTokens',
      PENDING_ORDERS_STORAGE_KEY: '@kokio_pending_orders',
      THEME_STORAGE_KEY: '@kokio_theme',
    });
  });

  it('build per-device and per-contact keys the same way as before', () => {
    expect(storage.userDataKey('uid-1')).toBe('userData-uid-1');
    expect(storage.userWalletKey('uid-1')).toBe('userWallet-uid-1');
    expect(storage.purchasedEsimsKey('uid-1')).toBe('purchasedESIMs-uid-1');
    expect(storage.walletActivityStorageKey('uid-1')).toBe('kokio.walletActivity.uid-1');
    expect(storage.contactKey('c-1')).toBe('contact_c-1');
  });
});

describe('persisted query keys', () => {
  it('keep their names', () => {
    expect(queryKeys.DEVICE_ESIMS_KEY).toBe('device-esims');
    expect(queryKeys.DEVICE_ORDERS_KEY).toBe('device-orders');
  });
});
