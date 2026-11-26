// Every SecureStore and AsyncStorage key the app uses, in one place.
// Do not change a value: each one names data already saved on users' phones.

// SecureStore (Keychain / Keystore)
export const ACCOUNT_DELETED_KEY = 'kokio.account.deleted';
export const AUTH_TOKENS_KEY = 'kokio.auth.tokens';
export const CREDENTIAL_ID_KEY = 'credentialId';
export const DEVICE_UID_KEY = 'deviceUID';
export const DEVICE_WALLET_ADDRESS_KEY = 'deviceWalletAddress';
export const DPOP_PRIVATE_KEY_KEY = 'kokio.dpop.privateKey';
export const DPOP_PUBLIC_KEY_KEY = 'kokio.dpop.publicKey';
export const ESIM_ID_KEY = 'esimId';
export const LOCAL_DATA_VERSION_KEY = 'kokioLocalDataVersion';
export const PUBLIC_KEY_X_KEY = 'publicKeyX';
export const PUBLIC_KEY_Y_KEY = 'publicKeyY';
export const RAW_SALT_KEY = 'rawSalt';
export const USED_TXN_HASHES_KEY = 'usedTxnHashes';
export const WELCOME_BACK_SEEN_KEY = 'kokioWelcomeBackSeen';

export const userDataKey = (deviceUID: string): string => `userData-${deviceUID}`;
export const userWalletKey = (deviceUID: string): string => `userWallet-${deviceUID}`;

// AsyncStorage
export const CONTACT_IDS_KEY = 'contactIds';
export const CONTACT_KEY_PREFIX = 'contact_';
export const CUSTOM_TOKENS_KEY = 'customTokens';
export const PENDING_ORDERS_STORAGE_KEY = '@kokio_pending_orders';
export const THEME_STORAGE_KEY = '@kokio_theme';

export const contactKey = (contactId: string): string => `${CONTACT_KEY_PREFIX}${contactId}`;
export const purchasedEsimsKey = (deviceUID: string): string => `purchasedESIMs-${deviceUID}`;
export const walletActivityStorageKey = (deviceUID: string): string => `kokio.walletActivity.${deviceUID}`;
