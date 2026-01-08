import "@walletconnect/react-native-compat";
import SignClient from "@walletconnect/sign-client";

let client: SignClient | null = null;

export const reown_project_id = process.env.REOWN_PROJECT_ID ?? "";
export async function getSignClient() {
  if (client) return client;

  client = await SignClient.init({
    projectId: reown_project_id,
    metadata: {
      name: "KOKI'O",
      description: "External wallet checkout",
      url: "https://kokio.app",
      icons: [],
    },
  });

  return client;
}
