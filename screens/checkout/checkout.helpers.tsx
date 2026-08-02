import type { JSX } from "react";
import { Platform } from "react-native";
import { RadioButtonProps } from "react-native-radio-buttons-group";

import { RADIO_KEYS } from "@/constants/checkout.constants";
import { Theme } from "@/constants/Colors";

import { ApplePay, CreditCard, ESimWallet, ExternalWallet, ExternalWalletBrowser } from "./components/radioLabels";

const radioButtonComponents: Record<string, JSX.Element> = {
  [RADIO_KEYS.E_SIM_WALLET]: <ESimWallet />,
  [RADIO_KEYS.CREDIT_CARD]: <CreditCard />,
  [RADIO_KEYS.APPLE_PAY]: <ApplePay />,
  //@ts-expect-error EXTERNAL_WALLET is intentionally disabled as a radio key for now
  [RADIO_KEYS.EXTERNAL_WALLET]: <ExternalWallet />,
  [RADIO_KEYS.EXTERNAL_WALLET_BROWSER]: <ExternalWalletBrowser />,
};

export const createRadioButtons = (
  selectedId: string | undefined,
  buttonStyles = {}
): RadioButtonProps[] =>
  Object.keys(RADIO_KEYS)
    .filter((key) => !(key === RADIO_KEYS.APPLE_PAY && Platform.OS !== "ios"))
    .map((key) => {
      const isDisabled = key === RADIO_KEYS.E_SIM_WALLET;
      return {
        id: key,
        label: radioButtonComponents[key],
        value: key,
        borderColor: Theme.colors.mutedForeground,
        color: Theme.colors.secondary,
        disabled: isDisabled,
        containerStyle: [
          buttonStyles,
          selectedId === key && { backgroundColor: Theme.colors.inputBackground },
          isDisabled && { opacity: 0.4 },
        ],
      };
    });
