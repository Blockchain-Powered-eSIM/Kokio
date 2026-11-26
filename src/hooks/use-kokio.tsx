import { useContext } from "react";
import { KokioContext } from "@/providers/kokio-state";

export const useKokio = () => {
  const context = useContext(KokioContext);
  if (!context) {
    throw new Error("useKokio must be used within a KokioProvider");
  }
  return context;
};
