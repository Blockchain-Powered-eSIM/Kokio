import "@walletconnect/react-native-compat";
import SignClient from "@walletconnect/sign-client";
import { AppExtraConfig, Config } from "@/appKeys";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as AppExtraConfig;

let client: SignClient | null = null;

export async function getSignClient() {
  if (client) return client;

  client = await SignClient.init({
    projectId: extra.reownProjectId as string || "",
    metadata: {
      name: "KOKI'O",
      description: "External wallet checkout",
      url: "https://kokio.app",
      icons: [],
    },
  });

  return client;
}
