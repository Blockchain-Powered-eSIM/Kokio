import { RadioButtonProps } from "react-native-radio-buttons-group";

import { RADIO_KEYS } from "@/constants/checkout.constants";
import { Theme } from "@/constants/Colors";

import { ApplePay, CreditCard, ESimWallet } from "./components/radioLabels";

const radioButtonComponents: Record<string, JSX.Element> = {
  [RADIO_KEYS.E_SIM_WALLET]: <ESimWallet />,
  [RADIO_KEYS.CREDIT_CARD]: <CreditCard />,
  [RADIO_KEYS.APPLE_PAY]: <ApplePay />,
};

export const createRadioButtons = (
  selectedId: string | undefined,
  buttonStyles = {}
): RadioButtonProps[] =>
  Object.keys(RADIO_KEYS).map((key) => ({
    id: key,
    label: radioButtonComponents[key],
    value: key,
    borderColor: Theme.colors.mutedForeground,
    color: Theme.colors.secondary,
    containerStyle: [
      buttonStyles,
      selectedId === key && { backgroundColor: Theme.colors.inputBackground },
    ],
    disabled: key !== RADIO_KEYS.E_SIM_WALLET, // NOTE: Only Device wallet is enabled
  }));
