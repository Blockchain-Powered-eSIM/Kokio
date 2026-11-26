import React, { ReactElement } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Config } from "@/appKeys";

type Props = {
  children: ReactElement | ReactElement[];
};

export function KokioStripeProvider({ children }: Props) {
  return (
    <StripeProvider
      publishableKey={Config.STRIPE_PUBLISHABLE_KEY ?? ""}
      merchantIdentifier={Config.STRIPE_MERCHANT_IDENTIFIER ?? ""}
      urlScheme={"kokio"}
    >
      {children}
    </StripeProvider>
  );
}
