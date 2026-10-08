import { Platform } from "react-native";
import { router } from "expo-router";

// `lpa` has the form LPA:1$<smdpAddress>$<matchingId>.
export function openInstallation(lpa: string): void {
  const parts = lpa.split("$");
  const appleInstallationUrl =
    parts[1] && parts[2]
      ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${lpa}`
      : "";
  router.push({
    pathname: "/(tabs)/installation",
    params: {
      qrcode: lpa,
      appleInstallationUrl,
      iccid: "",
      orderId: "",
      // Android has no direct install, so land on the QR tab.
      ...(Platform.OS === "android" ? { tab: "QR" } : {}),
    },
  });
}
