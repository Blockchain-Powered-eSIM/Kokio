import { TURNKEY_API_URL } from "@/constants/passkey.constants";
import { APIKeysT, PasskeyT } from "./types";
import Constants from "expo-constants";
import { AppExtraConfig, Config } from "@/appKeys";
import { PasskeyStamper, TurnkeyClient } from "@turnkey/sdk-react-native";

const extra = Constants.expoConfig?.extra as AppExtraConfig;
const SERVER_BASE_URL = `${extra.serverBaseUrl}`;

// Helper function to handle POST requests and common error checking
async function post(endpoint: string, body: any) {
  const url = `${SERVER_BASE_URL}${endpoint}`;
  console.log(`POST ${url}`);
  console.log("Request body:", body);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Fetch network error:", e);
    throw new Error("Network request failed");
  }

  console.log("Response status:", response.status);

  let json;
  try {
    json = await response.json();
  } catch {
    console.error("Response was not JSON");
    throw new Error("Invalid JSON response");
  }

  if (!response.ok) {
    console.error("API Error:", json);
    throw new Error(json.error || `Server error (${response.status})`);
  }

  return json;
}

/**
 * Deletes a sub-organization.
 * The sub-org can be deleted by a session or an API key belonging to the sub-org itself
 * Easy to delete as passkey is the session signer
 * This is not done in backend, as backend will have to then store API keys for
 * each sub-org created by the client
 */
export async function deleteSubOrganization(organizationIdToDelete: string) {
  console.log("organizationIdToDelete: ", organizationIdToDelete);
  if (!organizationIdToDelete) {
    throw new Error("Missing organization ID required for secure deletion.");
  }
  const stamper = new PasskeyStamper({
    rpId: Config.EXPO_PUBLIC_RP_ID as string,
  });

  const turnkeyClient = new TurnkeyClient(
    { baseUrl: TURNKEY_API_URL },
    stamper
  );

  const timestampMs = Date.now().toString();

  try {
    await turnkeyClient.deleteSubOrganization({
      type: "ACTIVITY_TYPE_DELETE_SUB_ORGANIZATION",
      timestampMs: timestampMs,
      organizationId: organizationIdToDelete,
      parameters: { deleteWithoutExport: true },
    });
  } catch (e) {
    console.error("Error deleting sub-org: ", e);
  }
}

/**
 * Creates a sub-organization, user, and wallet via the server.
 * Also initiates a session for user's passkey
 */
export async function createSubOrganization(
  user: {
    userId: string;
    username?: string;
    email?: string;
  },
  passkey: PasskeyT,
  apiKeys: APIKeysT
) {
  if (!passkey || !user || !user.userId) {
    throw new Error("Missing required parameters for sub-organization creation.");
  }

  try {
    const data = await post("/api/create-sub-organization", {
      user,
      passkey,
      apiKeys,
    });

    if (!data.ok) {
      throw new Error(data.error || "Server error");
    }

    return data;
  } catch (error) {
    console.error("error during createSubOrganization", error);
    throw error;
  }
}

