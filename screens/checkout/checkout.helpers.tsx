import type { JSX } from "react";
import { Platform } from "react-native";
import { RadioButtonProps } from "react-native-radio-buttons-group";

import { RADIO_KEYS } from "@/constants/checkout.constants";
import type { DeviceWalletPaymentAsset } from "@/constants/checkout.constants";
import type { Palette } from "@/constants/Colors";

import { ApplePay, CreditCard, ESimWallet, ExternalWallet, ExternalWalletBrowser } from "./components/radioLabels";

export const createRadioButtons = (
  selectedId: string | undefined,
  buttonStyles = {},
  colors: Palette,
  deviceWalletAsset: DeviceWalletPaymentAsset,
  onSelectDeviceWalletAsset: (asset: DeviceWalletPaymentAsset) => void,
): RadioButtonProps[] => {
  const radioButtonComponents: Record<string, JSX.Element> = {
    [RADIO_KEYS.E_SIM_WALLET]: (
      <ESimWallet
        isSelected={selectedId === RADIO_KEYS.E_SIM_WALLET}
        selectedSymbol={deviceWalletAsset}
        onSelectSymbol={onSelectDeviceWalletAsset}
      />
    ),
    [RADIO_KEYS.CREDIT_CARD]: <CreditCard />,
    [RADIO_KEYS.APPLE_PAY]: <ApplePay />,
    //@ts-expect-error EXTERNAL_WALLET is intentionally disabled as a radio key for now
    [RADIO_KEYS.EXTERNAL_WALLET]: <ExternalWallet />,
    [RADIO_KEYS.EXTERNAL_WALLET_BROWSER]: <ExternalWalletBrowser />,
  };

  return Object.keys(RADIO_KEYS)
    .filter((key) => !(key === RADIO_KEYS.APPLE_PAY && Platform.OS !== "ios"))
    .map((key) => ({
      id: key,
      label: radioButtonComponents[key],
      value: key,
      borderColor: colors.mutedForeground,
      color: colors.secondary,
      containerStyle: [
        buttonStyles,
        selectedId === key && { backgroundColor: colors.inputBackground },
      ],
    }));
};
