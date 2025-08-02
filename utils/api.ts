import {
    DEFAULT_ETHEREUM_ACCOUNTS,
    TURNKEY_API_URL,
    TURNKEY_PARENT_ORG_ID,
  } from "@/constants/passkey.constants";
  // run on vercel server on production on kokio.app domain
  // see turnkey+api.ts in react-native-demo-wallet
  import { Turnkey } from "@turnkey/sdk-server";
  import { ParamsType } from "./types";
  import { createPasskey } from "@turnkey/react-native-passkey-stamper";
  
  export const turnkeyConfig = {
    apiBaseUrl: TURNKEY_API_URL,
    defaultOrganizationId: TURNKEY_PARENT_ORG_ID,
    apiPublicKey: process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
  };
  
  export async function handleInitOtpAuth({ email }: { email: string }) {
    const turnkey = new Turnkey(turnkeyConfig).apiClient();
  
    let organizationId: string = TURNKEY_PARENT_ORG_ID;
  
    const { organizationIds } = await turnkey.getSubOrgIds({
      filterType: "EMAIL",
      filterValue: email,
    });
  
    if (organizationIds.length > 0) {
      console.log(organizationIds);
      organizationId = organizationIds[0];
    } else {
      // User does not exist
      console.error(
        "User cannot be created with email... user needs to create account with email and passkey"
      );
      return;
    }
  
    const result = await turnkey.initOtpAuth({
      organizationId,
      otpType: "OTP_TYPE_EMAIL",
      contact: email,
    });
  
    return { result, organizationId };
  }
  
  export async function handleOtpAuth(params: ParamsType<"otpAuth">) {
    const turnkey = new Turnkey(turnkeyConfig).apiClient();
  
    const {
      otpId,
      otpCode,
      organizationId,
      targetPublicKey,
      expirationSeconds,
      invalidateExisting,
    } = params;
  
    try {
      const result = await turnkey.otpAuth({
        otpId,
        otpCode,
        organizationId,
        targetPublicKey,
        expirationSeconds,
        invalidateExisting,
      });
  
      return result;
    } catch (error) {
      console.error("error during otpAuth", error);
    }
  }
  
  export async function deleteSubOrganization() {
    const turnkey = new Turnkey(turnkeyConfig).apiClient();
    const getWhoamiResult = await turnkey.getWhoami({
      organizationId: TURNKEY_PARENT_ORG_ID,
    });
    const data = await turnkey.deleteSubOrganization({
      organizationId: getWhoamiResult.organizationId,
      deleteWithoutExport: true,
    });
    console.log("delete sub-org", data);
    return data;
  }
  
  export async function createSubOrganization(
    authenticatorParams: Awaited<ReturnType<typeof createPasskey>>,
    user: {
      username: string;
      email?: string;
    }
  ) {
    const turnkey = new Turnkey(turnkeyConfig).apiClient();
  
    const data = await turnkey.createSubOrganization({
      organizationId: TURNKEY_PARENT_ORG_ID,
      subOrganizationName: `Sub-organization - ${user.username} ${String(
        Date.now()
      )}`,
      rootQuorumThreshold: 1,
      rootUsers: [
        {
          userName: user.username,
          userEmail: user.email ?? "",
          apiKeys: [],
          authenticators: [authenticatorParams],
          oauthProviders: [],
        },
      ],
      wallet: {
        walletName: "ETH wallet",
        accounts: DEFAULT_ETHEREUM_ACCOUNTS,
      },
    });
    return data;
  }
  
  export async function checkIfEmailInUse({
    email,
  }: {
    email: string;
  }): Promise<boolean | string[]> {
    const turnkey = new Turnkey(turnkeyConfig).apiClient();
  
    const { organizationIds } = await turnkey.getSubOrgIds({
      organizationId: TURNKEY_PARENT_ORG_ID,
      filterType: "EMAIL",
      filterValue: email,
    });
  
    if (organizationIds.length > 0) {
      console.log("Existing User sub-organization Ids: ", organizationIds);
      return true;
    } else {
      // User does not exist
      return false;
    }
  }