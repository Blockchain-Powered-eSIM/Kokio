import { useCallback, useRef, useState } from "react";
import type BottomSheet from "@gorhom/bottom-sheet";
import { useKokio } from "@/hooks/useKokio";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import {
  RADIO_KEYS,
  DEFAULT_DEVICE_WALLET_PAYMENT_ASSET,
  DEVICE_WALLET_PAYMENT_ASSETS,
  DEV_DEVICE_WALLET_PAYMENT_ASSETS,
} from "@/lib/constants/app";
import type { DeviceWalletPaymentAsset } from "@/lib/constants/app";
import { consumePreferredCheckoutPaymentMethod } from "./checkout-intent";

/** Payment method choice, the wallet setup it may need, and the device wallet token to pay with. */
export function usePaymentMethod() {
  const { kokio } = useKokio();
  // The "Buy eSIMs with stable" entry point on the Wallet tab sets this before
  // navigating here; only honor it when the Kokio wallet is already deployed,
  // matching selectPaymentMethod's own gating for this radio option.
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(() => {
    const preferred = consumePreferredCheckoutPaymentMethod();
    if (preferred === RADIO_KEYS.E_SIM_WALLET && !kokio.userWallet) return undefined;
    return preferred ?? undefined;
  });
  const [isPaymentMethodExpanded, setIsPaymentMethodExpanded] = useState(false);
  const [deviceWalletAsset, setDeviceWalletAsset]       = useState<DeviceWalletPaymentAsset>(DEFAULT_DEVICE_WALLET_PAYMENT_ASSET);
  const [showWalletSetupModal, setShowWalletSetupModal] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);

  const deviceWalletTokenSheetRef = useRef<BottomSheet>(null);
  const openDeviceWalletTokenPicker = useCallback(() => {
    deviceWalletTokenSheetRef.current?.snapToIndex(0);
  }, []);

  const { tokens: walletTokens } = useWalletTokens(kokio.deviceWalletAddress);
  const deviceWalletBalance = walletTokens.find((t) => t.symbol === deviceWalletAsset)?.amount;
  const selectableDeviceWalletAssets: readonly string[] = __DEV__
    ? [...DEVICE_WALLET_PAYMENT_ASSETS, ...DEV_DEVICE_WALLET_PAYMENT_ASSETS]
    : DEVICE_WALLET_PAYMENT_ASSETS;
  const deviceWalletPickerTokens = walletTokens.filter((t) =>
    selectableDeviceWalletAssets.includes(t.symbol)
  );

  const closeWalletSetup = useCallback(() => {
    setShowWalletSetupModal(false);
    setPendingPaymentMethod(null);
  }, []);

  const selectPaymentMethod = useCallback(
    (value: string) => {
      // Paying from the device wallet needs one to exist first; deploy it via
      // the modal before allowing selection. Credit card, Apple Pay, and the
      // external-wallet browser flow are all wallet-independent and must
      // never gate on it.
      if (value === RADIO_KEYS.E_SIM_WALLET && !kokio.userWallet) {
        setPendingPaymentMethod(value);
        setShowWalletSetupModal(true);
        return;
      }
      setSelectedPaymentMethod(value);
      setIsPaymentMethodExpanded(false);
    },
    [kokio.userWallet],
  );

  const continueWalletSetup = () => {
    const method = pendingPaymentMethod;
    closeWalletSetup();
    if (method) {
      setSelectedPaymentMethod(method);
      setIsPaymentMethodExpanded(false);
    }
  };

  const selectDeviceWalletAsset = (symbol: string) => {
    setDeviceWalletAsset(symbol as DeviceWalletPaymentAsset);
    deviceWalletTokenSheetRef.current?.close();
  };

  return {
    selectedPaymentMethod,
    isPaymentMethodExpanded,
    expandPaymentMethods: () => setIsPaymentMethodExpanded(true),
    selectPaymentMethod,
    showWalletSetupModal,
    closeWalletSetup,
    continueWalletSetup,
    deviceWalletAsset,
    deviceWalletBalance,
    deviceWalletPickerTokens,
    deviceWalletTokenSheetRef,
    openDeviceWalletTokenPicker,
    selectDeviceWalletAsset,
  };
}
