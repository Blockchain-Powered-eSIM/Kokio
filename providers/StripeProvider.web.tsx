import React, { ReactNode, ReactElement } from "react";

type Props = {
  children: ReactNode | ReactElement[];
};

export function KokioStripeProvider({ children }: Props) {
  return <>{children}</>;
}
