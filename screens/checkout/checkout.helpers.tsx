import { Platform } from "react-native";
import { RadioButtonProps } from "react-native-radio-buttons-group";

import { RADIO_KEYS } from "@/constants/checkout.constants";
import { Theme } from "@/constants/Colors";

import { ApplePay, CreditCard, ESimWallet, ExternalWallet } from "./components/radioLabels";

const radioButtonComponents: Record<string, JSX.Element> = {
  [RADIO_KEYS.E_SIM_WALLET]: <ESimWallet />,
  [RADIO_KEYS.CREDIT_CARD]: <CreditCard />,
  [RADIO_KEYS.APPLE_PAY]: <ApplePay />,
  [RADIO_KEYS.EXTERNAL_WALLET]: <ExternalWallet />,
};

export const createRadioButtons = (
  selectedId: string | undefined,
  buttonStyles = {}
): RadioButtonProps[] =>
  Object.keys(RADIO_KEYS)
    .filter((key) => !(key === RADIO_KEYS.APPLE_PAY && Platform.OS !== "ios"))
    .map((key) => ({
      id: key,
      label: radioButtonComponents[key],
      value: key,
      borderColor: Theme.colors.mutedForeground,
      color: Theme.colors.secondary,
      containerStyle: [
        buttonStyles,
        selectedId === key && { backgroundColor: Theme.colors.inputBackground },
      ],
    }));
