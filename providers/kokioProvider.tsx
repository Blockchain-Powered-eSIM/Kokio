import { ReactNode, createContext, useEffect, useReducer, useRef } from "react";
import _pick from "lodash/pick";
import { router } from "expo-router";
import { Kokio } from "kokio-sdk";
import { PASSKEY_CONFIG } from "@/constants/passkey.constants";
import { createWalletClient, http, type Hex } from "viem";
import { baseSepolia, base } from "viem/chains";
import Constants from "expo-constants";
import { AppExtraConfig, Config } from "@/appKeys";
import { logger } from '@/utils/logger';

import { SmartContractAccount } from "@aa-sdk/core";

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Esim } from "@/components/ESIMItem";
import { OrderStatusResponse } from "@/utils/bff/order";
import { getAllEsims, type ESimDocument } from "@/utils/bff/esim";
import { getOrderList, type OrderListItem } from "@/utils/bff/order";
import {
  getWcSignClient,
  setPendingProposal,
} from "@/utils/walletconnect/signClient";
const extra = Constants.expoConfig?.extra as AppExtraConfig;

export interface StoredTransactionData {
  orderId: string;
  correlationId?: string;
  iccid?: string;
  planId?: string;
  orderStatus?: string;
  paymentMethod?: string;
  vendor?: string;
  esimId?: string;
  isNewESim?: boolean;
  stripeInvoiceUrl?: string | null;
  flaggedForManualReview?: boolean;
  installationDetails: {
    qrcode: string;
    appleInstallationUrl: string;
  };
}

export interface StoredPurchasedESIM {
  eSimItem: Esim;
  transactionData: StoredTransactionData;
}

const reduceESimDataForStorage = (
  eSimItem: Esim,
  transactionData: OrderStatusResponse,
  correlationId?: string | null,
): StoredPurchasedESIM => {
  const reducedESimItem = _pick(eSimItem, [
    "catalogueId",
    "data",
    "sms",
    "voice",
    "validity",
    "isUnlimited",
    "coverageType",
    "serviceRegionCode",
    "serviceRegionName",
    "serviceRegionFlag",
    "planType",
    "isTopupAvailable",
    "isAutoStart",
    "isKycRequired",
    "countryWiseNetworkCoverages",
  ]) as Esim;

  const reducedTransactionData: StoredTransactionData = {
    orderId: transactionData.orderId,
    correlationId: correlationId ?? undefined,
    iccid: transactionData.iccid,
    planId: transactionData.planId,
    orderStatus: transactionData.orderStatus,
    paymentMethod: transactionData.paymentMethod,
    stripeInvoiceUrl: transactionData.stripeInvoiceUrl ?? null,
    flaggedForManualReview: transactionData.flaggedForManualReview ?? false,
    vendor: transactionData.vendor,
    esimId: transactionData.esimId,
    isNewESim: transactionData.isNewESim,
    installationDetails: {
      qrcode: transactionData.installationDetails?.qrcode ?? "",
      appleInstallationUrl: transactionData.installationDetails?.appleInstallationUrl ?? "",
    },
  };

  return {
    eSimItem: reducedESimItem,
    transactionData: reducedTransactionData,
  };
};

type AuthActionType =
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_KOKIO"; payload: Kokio }
  | { type: "SET_DEVICE_UID"; payload: string }
  | { type: "SET_DEVICE_WALLET_ADDRESS"; payload: string }
  | { type: "SET_RAW_SALT"; payload: string }
  | { type: "SET_KOKIO_USER"; payload: UserData }
  | { type: "SET_KOKIO_PASSKEY"; payload: UserPasskey }
  | { type: "SET_USER_WALLET"; payload: SmartContractAccount }
  | { type: "SET_PURCHASED_ESIMS"; payload: StoredPurchasedESIM[] }
  | { type: "CLEAR_KOKIO" }
  | { type: "CLEAR_KOKIO_USER" };

export interface UserPasskey {
  credentialId: string;
  x: Hex;
  y: Hex;
}

interface UserData {
  userName: string;
  email: string;
  organizationId: string;
  id: string;
  wallets: { address: string }[];
}
interface KokioState {
  error: string;
  sdk?: Kokio;
  deviceUID: string;
  deviceWalletAddress: string;
  rawSalt: string;
  userData?: UserData;
  userPasskey?: UserPasskey;
  userWallet?: SmartContractAccount;
  purchasedESIMs: StoredPurchasedESIM[];
}

const initialState: KokioState = {
  error: "",
  sdk: undefined,
  deviceUID: "",
  deviceWalletAddress: "",
  rawSalt: "",
  userData: undefined,
  userPasskey: undefined,
  userWallet: undefined,
  purchasedESIMs: [],
};

function kokioReducer(kokio: KokioState, action: AuthActionType): KokioState {
  switch (action.type) {
    case "ERROR":
      return { ...kokio, error: action.payload };
    case "CLEAR_ERROR":
      return { ...kokio, error: "" };
    case "SET_KOKIO":
      return { ...kokio, sdk: action.payload };
    case "SET_DEVICE_UID":
      return { ...kokio, deviceUID: action.payload };
    case "SET_DEVICE_WALLET_ADDRESS":
      return { ...kokio, deviceWalletAddress: action.payload };
    case "SET_RAW_SALT":
      return { ...kokio, rawSalt: action.payload };
    case "SET_KOKIO_USER":
      return { ...kokio, userData: action.payload };
    case "SET_KOKIO_PASSKEY":
      return { ...kokio, userPasskey: action.payload };
    case "SET_USER_WALLET":
      return { ...kokio, userWallet: action.payload };
    case "SET_PURCHASED_ESIMS":
      return { ...kokio, purchasedESIMs: action.payload };
    case "CLEAR_KOKIO":
      return {
        ...kokio,
        sdk: undefined,
      };
    case "CLEAR_KOKIO_USER":
      return {
        ...kokio,
        deviceUID: "",
        deviceWalletAddress: "",
        rawSalt: "",
        userPasskey: undefined,
        userData: undefined,
        userWallet: undefined,
        purchasedESIMs: [],
      };
    default:
      return kokio;
  }
}

export interface KokioProviderType {
  kokio: KokioState;
  clearError: () => void;
  setupKokio: () => void;
  setupKokioDeviceUID: (deviceUID: string) => Promise<void>;
  setupKokioUserWallet: (
    deviceUID: string,
    wallet: SmartContractAccount
  ) => Promise<void>;
  savePurchasedESIM: (
    deviceUID: string,
    eSimItem: Esim,
    transactionData: OrderStatusResponse,
    correlationId?: string | null,
  ) => Promise<void>;
  upsertOrderRecord: (
    deviceUID: string,
    eSimItem: Esim,
    correlationId: string,
    orderStatus?: string,
  ) => Promise<void>;
  setupKokioRegistration: (deviceWalletAddress: string, deviceUniqueIdentifier: string, credentialId: string, publicKeyX: Hex, publicKeyY: Hex, rawSalt: string) => Promise<void>;
  setupKokioRecovery: (deviceWalletAddress: string, credentialId: string) => Promise<void>;
  clearKokio: () => void;
  clearKokioUser: () => Promise<void>;
}

export const KokioContext = createContext<KokioProviderType>({
  kokio: initialState,
  clearError: () => {},
  setupKokio: async () => Promise.resolve(),
  setupKokioDeviceUID: async () => Promise.resolve(),
  setupKokioUserWallet: async () => Promise.resolve(),
  savePurchasedESIM: async () => Promise.resolve(),
  upsertOrderRecord: async () => Promise.resolve(),
  setupKokioRegistration: async (_a, _b, _c, _d, _e, _f) => Promise.resolve(),
  setupKokioRecovery: async (_a, _b) => Promise.resolve(),
  clearKokio: () => {},
  clearKokioUser: async () => Promise.resolve(),
});

interface KokioProviderProps {
  children: ReactNode;
}

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);

  const saveValueForDeviceUID = async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserData = async (key: string, value: UserData) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserWallet = async (
    key: string,
    value: SmartContractAccount
  ) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const getValueForDeviceUID = async (key: string) => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      const parsedResult: string = JSON.parse(result);
      return parsedResult;
    }
  };

  const getValueForUserData = async (key: string) => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      const parsedResult: UserData = JSON.parse(result);
      return parsedResult;
    }
  };

  const getValueForUserWallet = async (
    key: string
  ): Promise<SmartContractAccount | void> => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      const parsedResult: SmartContractAccount = JSON.parse(result);
      return parsedResult;
    }
  };

  const saveValueForPurchasedESIMs = async (
    key: string,
    value: StoredPurchasedESIM[]
  ) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('ESIM_STORAGE_SAVE_FAILED', { error });
    }
  };

  const getValueForPurchasedESIMs = async (
    key: string
  ): Promise<StoredPurchasedESIM[] | void> => {
    try {
      const result = await AsyncStorage.getItem(key);
      if (result) {
        const parsedResult: StoredPurchasedESIM[] = JSON.parse(result);
        return parsedResult;
      }
    } catch (error) {
      logger.error('ESIM_STORAGE_READ_FAILED', { error });
    }
  };

  const deleteValueForPurchasedESIMs = async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('ESIM_STORAGE_DELETE_FAILED', { error });
    }
  };

  const deleteValueForUser = async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  };

  const syncPurchasedEsimsWithBff = async (deviceUID: string): Promise<void> => {
    try {
      const [liveEsims, orderListResult] = await Promise.all([
        getAllEsims(),
        getOrderList(1, 25).catch(() => null),
      ]);

      const esimMap = new Map<string, ESimDocument>(liveEsims.map(e => [e.esimId, e]));
      const bffOrders: OrderListItem[] = orderListResult?.orders ?? [];
      const bffOrderMap = new Map<string, OrderListItem>(bffOrders.map(o => [o.idempotencyKey, o]));

      const existingESIMs = (await getValueForPurchasedESIMs(`purchasedESIMs-${deviceUID}`)) ?? [];

      // Update locally stored orders with fresh BFF data
      const updatedLocal = existingESIMs.map(stored => {
        const bff = stored.transactionData.correlationId
          ? bffOrderMap.get(stored.transactionData.correlationId)
          : undefined;
        const live = stored.transactionData.esimId
          ? esimMap.get(stored.transactionData.esimId)
          : undefined;
        return {
          ...stored,
          transactionData: {
            ...stored.transactionData,
            iccid: live?.iccid ?? bff?.iccid ?? stored.transactionData.iccid,
            orderStatus: live?.activationStatus ?? bff?.orderStatus ?? stored.transactionData.orderStatus,
            esimId: bff?.esimId ?? stored.transactionData.esimId,
            stripeInvoiceUrl: bff?.stripeInvoiceUrl ?? stored.transactionData.stripeInvoiceUrl,
            flaggedForManualReview: bff?.flaggedForManualReview ?? stored.transactionData.flaggedForManualReview,
            installationDetails: live?.installationDetails
              ? { qrcode: live.installationDetails.qrcode, appleInstallationUrl: live.installationDetails.appleInstallationUrl }
              : stored.transactionData.installationDetails,
          },
        };
      });

      // Reinstall recovery: find BFF orders not present locally
      const localKeys = new Set(existingESIMs.map(e => e.transactionData.correlationId).filter(Boolean));
      const orphanedOrders = bffOrders.filter(
        o => !localKeys.has(o.idempotencyKey) && (o.orderStatus === 'COMPLETED' || o.orderStatus === 'ESIM_PROVISIONED_PENDING_CHAIN'),
      );

      let recovered: StoredPurchasedESIM[] = [];
      if (orphanedOrders.length > 0) {
        recovered = orphanedOrders.map(o => {
          const live = o.esimId ? esimMap.get(o.esimId) : undefined;
          // Stub eSimItem — plan display details (data, validity, flag) are not available
          // from OrderListItem. These orders will show their status + ICCID correctly;
          // plan details will be restored if the user reinstalls from a device that has
          // local storage, or when the BFF exposes plan detail in a future endpoint.
          //@ts-expect-error actualSellingPrice is missing from the declaration here. TODO: Should be ideally fixed
          const eSimItem: Esim = {
            catalogueId: o.planId,
            data: 0,
            sms: null,
            voice: null,
            validity: 0,
            isUnlimited: false,
            coverageType: 'LOCAL',
            serviceRegionCode: '',
            serviceRegionName: o.planId,
            serviceRegionFlag: '',
          };
          return {
            eSimItem,
            transactionData: {
              orderId: o.orderId,
              correlationId: o.idempotencyKey,
              iccid: live?.iccid ?? o.iccid ?? undefined,
              planId: o.planId,
              orderStatus: o.orderStatus,
              paymentMethod: o.paymentMethod,
              vendor: o.vendor ?? undefined,
              esimId: o.esimId ?? undefined,
              isNewESim: o.isNewESim ?? undefined,
              stripeInvoiceUrl: o.stripeInvoiceUrl,
              flaggedForManualReview: o.flaggedForManualReview,
              installationDetails: live?.installationDetails
                ? { qrcode: live.installationDetails.qrcode, appleInstallationUrl: live.installationDetails.appleInstallationUrl }
                : { qrcode: '', appleInstallationUrl: '' },
            },
          };
        });
      }

      const merged = [...updatedLocal, ...recovered];
      await saveValueForPurchasedESIMs(`purchasedESIMs-${deviceUID}`, merged);
      dispatch({ type: "SET_PURCHASED_ESIMS", payload: merged });
      await AsyncStorage.setItem(`esimLastSync-${deviceUID}`, new Date().toISOString());
    } catch {
      // non-critical — sync failure should not surface to the user
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const storedWalletAddress = await SecureStore.getItemAsync("deviceWalletAddress");
      if (storedWalletAddress) {
        dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: storedWalletAddress });
      }

      const deviceUID = await getValueForDeviceUID("deviceUID");

      // Guard: deviceUID without deviceWalletAddress means orphaned state
      // (e.g. old Turnkey installation, or a crashed registration). Purge it
      // so the modal correctly routes to sign-up instead of a broken login attempt.
      if (deviceUID && !storedWalletAddress) {
        await SecureStore.deleteItemAsync("deviceUID");
        await SecureStore.deleteItemAsync("credentialId");
        logger.debug('KOKIO_PURGED_ORPHAN_DEVICE_UID');
      }

      if (deviceUID && storedWalletAddress) {
        dispatch({
          type: "SET_DEVICE_UID",
          payload: deviceUID,
        });

        const userData = await getValueForUserData(`userData-${deviceUID}`);
        if (userData) {
          dispatch({
            type: "SET_KOKIO_USER",
            payload: {
              userName: userData.userName,
              email: userData.email,
              organizationId: userData.organizationId,
              id: userData.id,
              wallets: userData.wallets,
            },
          });
        }
        const credentialId = await SecureStore.getItemAsync('credentialId');
        const publicKeyX = await SecureStore.getItemAsync('publicKeyX');
        const publicKeyY = await SecureStore.getItemAsync('publicKeyY');
        logger.debug('[KOKIO] SecureStore Hydration', {
          hasDeviceWalletAddress: !!storedWalletAddress,
          hasCredentialId: !!credentialId,
          hasPublicKeyX: !!publicKeyX,
          hasPublicKeyY: !!publicKeyY,
          hasRawSalt: !!(await SecureStore.getItemAsync('rawSalt')),
          hasDeviceUID: !!deviceUID,
        });
        if (credentialId && publicKeyX && publicKeyY) {
          dispatch({ type: "SET_KOKIO_PASSKEY", payload: { credentialId, x: publicKeyX as Hex, y: publicKeyY as Hex } });
        }
        const rawSalt = await SecureStore.getItemAsync('rawSalt');
        if (rawSalt) {
          dispatch({ type: "SET_RAW_SALT", payload: rawSalt });
        }
        const userWallet = await getValueForUserWallet(
          `userWallet-${deviceUID}`
        );
        if (userWallet) {
          dispatch({
            type: "SET_USER_WALLET",
            payload: userWallet,
          });
        }
        const purchasedESIMs = await getValueForPurchasedESIMs(
          `purchasedESIMs-${deviceUID}`
        );
        if (purchasedESIMs) {
          dispatch({
            type: "SET_PURCHASED_ESIMS",
            payload: purchasedESIMs,
          });
        }

        // Fire-and-forget: local data already dispatched above; sync runs in background
        syncPurchasedEsimsWithBff(deviceUID);
      }
    };
    fetchUserData();
  //  TODO: Visit once order list is available via BFF
  //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kokio.sdk && kokio.deviceUID && kokio.userPasskey) {
      setupKokio();
    }
    // setupKokio is a function, not a dependency to watch for changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kokio.deviceUID, kokio.userPasskey, kokio.sdk]);

  const wcInitialized = useRef(false);

  useEffect(() => {
    if (!kokio.sdk || !kokio.userWallet || wcInitialized.current) return;
    wcInitialized.current = true;

    const walletAddress = (kokio.userWallet as any).address ?? "";

    getWcSignClient().then((client) => {
      client.on("session_proposal", (proposal) => {
        setPendingProposal(proposal);
        router.push("/wc-session" as any);
      });

      client.on("session_request", async (event) => {
        const { topic, params, id } = event;
        const { request } = params;
        try {
          // TODO PAY-011: route eth_sendTransaction / eth_signTypedData_v4
          // through kokio-sdk signer + Pimlico bundler once SDK exposes signing API.
          void walletAddress;
          throw new Error(`Method not yet implemented: ${request.method}`);
        } catch (err) {
          await client.respond({
            topic,
            response: {
              id,
              jsonrpc: "2.0",
              error: { code: 4001, message: (err as Error).message },
            },
          });
        }
      });

      client.on("session_delete", ({ topic }) => {
        logger.debug('WC_SESSION_DELETED', { topic });
      });
    }).catch((err) => {
      wcInitialized.current = false;
      logger.error('WC_INIT_FAILED', { err });
    });
  }, [kokio.sdk, kokio.userWallet]);

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioDeviceUID = async (deviceUID: string) => {
    await saveValueForDeviceUID("deviceUID", deviceUID);

    dispatch({
      type: "SET_DEVICE_UID",
      payload: deviceUID,
    });
  };

  const setupKokioRegistration = async (
    deviceWalletAddress: string,
    deviceUniqueIdentifier: string,
    credentialId: string,
    publicKeyX: Hex,
    publicKeyY: Hex,
    rawSalt: string,
  ) => {
    await saveValueForDeviceUID("deviceUID", deviceUniqueIdentifier);
    await SecureStore.setItemAsync("deviceWalletAddress", deviceWalletAddress);
    await SecureStore.setItemAsync("credentialId", credentialId);
    await SecureStore.setItemAsync("publicKeyX", publicKeyX);
    await SecureStore.setItemAsync("publicKeyY", publicKeyY);
    await SecureStore.setItemAsync("rawSalt", rawSalt);

    const userData: UserData = {
      id: deviceUniqueIdentifier,
      userName: "",
      email: "",
      organizationId: "",
      wallets: [{ address: deviceWalletAddress }],
    };
    await saveValueForUserData(`userData-${deviceUniqueIdentifier}`, userData);

    dispatch({ type: "SET_DEVICE_UID", payload: deviceUniqueIdentifier });
    dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: deviceWalletAddress });
    dispatch({ type: "SET_RAW_SALT", payload: rawSalt });
    dispatch({ type: "SET_KOKIO_USER", payload: userData });
    dispatch({ type: "SET_KOKIO_PASSKEY", payload: { credentialId, x: publicKeyX, y: publicKeyY } });
  };

  const setupKokioUserWallet = async (
    deviceUID: string,
    wallet: SmartContractAccount
  ) => {
    await saveValueForUserWallet(`userWallet-${deviceUID}`, wallet);

    dispatch({
      type: "SET_USER_WALLET",
      payload: wallet,
    });
  };

  const savePurchasedESIM = async (
    deviceUID: string,
    eSimItem: Esim,
    transactionData: OrderStatusResponse,
    correlationId?: string | null,
  ) => {
    logger.debug('ESIM_ORDER_RESPONSE', { transactionData });

    const existingESIMs = await getValueForPurchasedESIMs(`purchasedESIMs-${deviceUID}`);
    const currentESIMs = existingESIMs || [];

    const reducedPurchasedESIM = reduceESimDataForStorage(eSimItem, transactionData, correlationId);
    logger.debug('ESIM_STORED_RECORD', { reducedPurchasedESIM });

    const existingIdx = correlationId
      ? currentESIMs.findIndex(e => e.transactionData.correlationId === correlationId)
      : -1;

    const updatedESIMs = existingIdx >= 0
      ? currentESIMs.map((e, i) => i === existingIdx ? reducedPurchasedESIM : e)
      : [...currentESIMs, reducedPurchasedESIM];

    await saveValueForPurchasedESIMs(`purchasedESIMs-${deviceUID}`, updatedESIMs);
    dispatch({ type: "SET_PURCHASED_ESIMS", payload: updatedESIMs });
  };

  const upsertOrderRecord = async (
    deviceUID: string,
    eSimItem: Esim,
    correlationId: string,
    orderStatus?: string,
  ) => {
    const existingESIMs = await getValueForPurchasedESIMs(`purchasedESIMs-${deviceUID}`);
    const currentESIMs = existingESIMs || [];

    const existingIdx = currentESIMs.findIndex(e => e.transactionData.correlationId === correlationId);

    let updatedESIMs: StoredPurchasedESIM[];
    if (existingIdx >= 0) {
      updatedESIMs = currentESIMs.map((e, i) =>
        i === existingIdx
          ? { ...e, transactionData: { ...e.transactionData, orderStatus: orderStatus ?? e.transactionData.orderStatus } }
          : e
      );
    } else {
      const reducedESimItem = _pick(eSimItem, [
        "catalogueId", "data", "sms", "voice", "validity", "isUnlimited",
        "coverageType", "serviceRegionCode", "serviceRegionName", "serviceRegionFlag",
        "planType", "isTopupAvailable", "isAutoStart", "isKycRequired",
        "countryWiseNetworkCoverages",
      ]) as Esim;
      const newRecord: StoredPurchasedESIM = {
        eSimItem: reducedESimItem,
        transactionData: {
          orderId: '',
          correlationId,
          orderStatus: orderStatus ?? 'PAYMENT_PENDING',
          installationDetails: { qrcode: '', appleInstallationUrl: '' },
        },
      };
      updatedESIMs = [...currentESIMs, newRecord];
    }

    await saveValueForPurchasedESIMs(`purchasedESIMs-${deviceUID}`, updatedESIMs);
    dispatch({ type: "SET_PURCHASED_ESIMS", payload: updatedESIMs });
  };

  const setupKokio = async () => {
    // Prefer state (populated at mount or registration); fall back to SecureStore
    // for the case where setupKokio() is called before hydration completes.
    const credentialId =
      kokio.userPasskey?.credentialId ??
      await SecureStore.getItemAsync('credentialId') ??
      null;

    if (!credentialId) {
      dispatch({ type: "ERROR", payload: "Credential ID not found" });
      return;
    }

    // The SDK requires client.account to be set — it uses client.account.address as
    // the `signWith` arg in signTypedData (a TODO stub). Real signing happens via
    // Passkey.get() inside _stamp(), so the address value is irrelevant for deployment.
    const resolvedAddress =
      kokio.deviceWalletAddress ||
      await SecureStore.getItemAsync('deviceWalletAddress');

    if (!resolvedAddress) {
      dispatch({ type: "ERROR", payload: "Device wallet address not found" });
      return;
    }

    const signerAddress = resolvedAddress as `0x${string}`;

    const chainId = Config.CHAIN_ID ?? baseSepolia.id;
    const chain = chainId === base.id ? base : baseSepolia;
    const alchemySubdomain = chainId === base.id ? 'base-mainnet' : 'base-sepolia';

    const rpcUrl = extra.alchemyApiKey
      ? `https://${alchemySubdomain}.g.alchemy.com/v2/${extra.alchemyApiKey}`
      : (Config.CHAIN_RPC_URL ?? chain.rpcUrls.default.http[0]);

    const viemClient = createWalletClient({
      chain,
      transport: http(rpcUrl),
      account: signerAddress,
    });

    const kokioSDK = new Kokio(
      viemClient,
      credentialId,
      PASSKEY_CONFIG.RP_ID,
      '',
      extra.pimlicoApiKey ?? '',
      extra.gasManagerPolicyId ?? '',
    );

    dispatch({ type: "SET_KOKIO", payload: kokioSDK });
  };

  const setupKokioRecovery = async (deviceWalletAddress: string, credentialId: string) => {
    await SecureStore.setItemAsync('deviceWalletAddress', deviceWalletAddress);
    await SecureStore.setItemAsync('credentialId', credentialId);
    dispatch({ type: 'SET_DEVICE_WALLET_ADDRESS', payload: deviceWalletAddress });
  };

  const clearKokio = () => {
    dispatch({ type: "CLEAR_KOKIO" });
  };

  const clearKokioUser = async () => {
    dispatch({ type: "CLEAR_KOKIO_USER" });
    // Best-effort deletes — iOS SecureStore throws when a key doesn't exist,
    // so each delete is wrapped individually to ensure all keys are attempted.
    await deleteValueForUser(`userWallet-${kokio.deviceUID}`).catch(() => {});
    await deleteValueForUser(`userData-${kokio.deviceUID}`).catch(() => {});
    await deleteValueForPurchasedESIMs(`purchasedESIMs-${kokio.deviceUID}`).catch(() => {});
    await deleteValueForUser("deviceUID").catch(() => {});
    await SecureStore.deleteItemAsync("deviceWalletAddress").catch(() => {});
    await SecureStore.deleteItemAsync("credentialId").catch(() => {});
    await SecureStore.deleteItemAsync("publicKeyX").catch(() => {});
    await SecureStore.deleteItemAsync("publicKeyY").catch(() => {});
    await SecureStore.deleteItemAsync("rawSalt").catch(() => {});
    clearKokio();
  };

  return (
    <KokioContext.Provider
      value={{
        kokio,
        clearError,
        setupKokio,
        setupKokioDeviceUID,
        setupKokioUserWallet,
        savePurchasedESIM,
        upsertOrderRecord,
        setupKokioRegistration,
        setupKokioRecovery,
        clearKokio,
        clearKokioUser,
      }}
    >
      {children}
    </KokioContext.Provider>
  );
};
