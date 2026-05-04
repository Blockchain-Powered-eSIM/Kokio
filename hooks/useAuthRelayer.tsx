import { useContext } from "react";
import { AuthRelayContext, type AuthRelayProviderType } from "@/providers/authProvider";

export type { AuthRelayProviderType };

export const useAuthRelay = (): AuthRelayProviderType => {
  const context = useContext(AuthRelayContext);
  if (!context) {
    throw new Error("useAuthRelay must be used within an AuthRelayProvider");
  }
  return context;
};
