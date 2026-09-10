import { useRef, useState, useCallback } from "react";
import {
  Linking,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import _head from "lodash/head";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";

import _get from "lodash/get";
import _split from "lodash/split";
import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { logger } from "@/utils/logger";

type TabType = "Direct" | "QR" | "Manual";

// Lightning bolt's natural yellow — kept fixed across light/dark theme, not tinted by theme tokens.
const FLASH_COLOR = "#FFC107";

const warningStyles = StyleSheet.create({
  warningCard: {
    borderRadius: 12,
    padding: 16,
    position: "relative",
    marginBottom: 16,
    marginTop: 16,
  },
  warningIconTopRight: {
    position: "absolute",
    top: -12,
    right: 14,
    zIndex: 1,
  },
  warningContent: {
    flex: 1,
    paddingRight: 32,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarOuterContainer: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  tabBarContainer: {
    borderRadius: Theme.borderRadius.medium,
    flexDirection: "row",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    minHeight: 30,
    position: "relative",
  },
  tabSpeedIcons: {
    position: "absolute",
    top: -4,
    right: 4,
    flexDirection: "row",
    zIndex: 2,
  },
  tabButtonText: {
    textAlign: "center",
    fontWeight: "500",
    zIndex: 1,
  },
  tabIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Theme.borderRadius.medium,
    zIndex: 0,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  installSection: {
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: "center",
    padding: 20,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 24,
  },
  shareButtonText: {
    fontSize: 16,
    marginRight: 8,
  },
  instructionsContainer: {
    gap: 12,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  manualDetailsCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  manualDetailsHeader: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  manualDetailsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  manualDetailsTextContainer: {
    flex: 1,
  },
  manualDetailsText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  copyButton: {
    padding: 8,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  manualInstructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textCopyContainer: {
    marginBottom: 12,
  },
  missingQrContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
});

const TextWithCopy = ({ label, text }: {label: string, text: string}) => {
  const colors = useColors();
  const handleCopyQRData = async () => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      logger.error('CLIPBOARD_COPY_FAILED', { error });
    }
  };
  return (
    <View style={styles.textCopyContainer}>
      <Text style={[styles.manualDetailsHeader, { color: colors.inactive }]}>{label}</Text>
      <View style={styles.manualDetailsContent}>
        <View style={styles.manualDetailsTextContainer}>
          <Text style={[styles.manualDetailsText, { color: colors.text }]}>{text}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyQRData}>
          <Ionicons name="copy-outline" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EsimInstallation = () => {
  const { isDark } = useTheme();
  const colors = useColors();
  const { qrcode, appleInstallationUrl: rawAppleUrl } = useLocalSearchParams();
  const appleInstallationUrl = Array.isArray(rawAppleUrl) ? rawAppleUrl[0] : (rawAppleUrl ?? "");
  const router = useRouter();
  const rawQrData = Array.isArray(qrcode) ? _head(qrcode) : qrcode;
  const hasQrData = !!rawQrData;
  const qrData = rawQrData || "";

  const qrDataSplit = _split(qrData, "$");
  const activationAddress = _get(qrDataSplit, [1]);
  const activationCode = _get(qrDataSplit, [2]);
  const [activeTab, setActiveTab] = useState<TabType>("Direct");

  if (!hasQrData) {
    return (
      <View style={[styles.container, styles.missingQrContainer, { backgroundColor: colors.background }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Installation details unavailable
        </ThemedText>
        <Text style={[styles.sectionDescription, { color: colors.inactive, textAlign: "center", marginBottom: 0 }]}>
          We couldn&apos;t find the installation QR code for this eSIM. Please go back and try again from Orders.
        </Text>
        <TouchableOpacity
          style={[styles.shareButton, { borderColor: colors.muted }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={[styles.shareButtonText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const QRScene = () => {
    const qrViewRef = useRef(null);

    const handleShareQR = async () => {
      try {
        if (!qrViewRef.current) {
          logger.warn('QR_VIEW_REF_UNAVAILABLE');
          return;
        }

        const uri = await captureRef(qrViewRef.current, {
          format: "png",
          quality: 0.8,
          result: "tmpfile",
          fileName: "Install-eSIM-QR-Code.png",
        });

        Share.open({
          url: `file://${uri}`,
          type: "image/png",
        }).catch((err) => {
          if (err) logger.warn('QR_SHARE_API_FAILED', { err });
        });
      } catch (error) {
        logger.error('QR_SHARE_FAILED', { error });
      }
    };

    return (
      <ScrollView style={styles.content}>
        <WarningCards />
        {/* Install eSIM Section */}
        <View style={[styles.installSection, { backgroundColor: colors.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>QR Installation</ThemedText>
          <Text style={[styles.sectionDescription, { color: colors.inactive }]}>
            Scan the QR code by printing out or displaying the code on another
            device to install your eSIM.
          </Text>

          {/* QR Code */}
          <ViewShot style={[styles.qrContainer, { backgroundColor: colors.surface }]} ref={qrViewRef}>
            <QRCode
              value={qrData}
              size={200}
              color={colors.text}
              backgroundColor={colors.surface}
            />
          </ViewShot>

          {/* Share Button */}
          <TouchableOpacity style={[styles.shareButton, { borderColor: colors.muted }]} onPress={handleShareQR}>
            <Text style={[styles.shareButtonText, { color: colors.text }]}>Share QR code</Text>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionText, { color: colors.inactive }]}>
              {
                "1. Go to Settings > Cellular/Mobile Data > Add eSIM or Set up Cellular/Mobile Service > Use QR Code on your device."
              }
            </Text>
            <Text style={[styles.instructionText, { color: colors.inactive }]}>
              {" 2. Scan the QR code or take a screenshot."}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const WarningCards = () => (
    <>
      <View style={[warningStyles.warningCard, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons
          name="comment-alert"
          size={32}
          color={colors.primary}
          style={warningStyles.warningIconTopRight}
        />
        <View style={warningStyles.warningContent}>
          <Text style={[warningStyles.warningTitle, { color: colors.text }]}>
            Most eSIMs can only be installed once.
          </Text>
          <Text style={[warningStyles.warningDescription, { color: colors.inactive }]}>
            If you remove the eSIM from your device, you cannot install it again.
          </Text>
        </View>
      </View>
  
      <View style={[warningStyles.warningCard, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons
          name="comment-alert"
          size={32}
          color={colors.primary}
          style={warningStyles.warningIconTopRight}
        />
        <View style={warningStyles.warningContent}>
          <Text style={[warningStyles.warningTitle, { color: colors.text }]}>
            Make sure your device has a stable internet connection before installing.
          </Text>
          <Text style={[warningStyles.warningDescription, { color: colors.inactive }]}>
            Note that the eSIM installation process must not be interrupted.
          </Text>
        </View>
      </View>
    </>
  );

  const ManualScene = () => (
    <ScrollView style={styles.content}>
      <WarningCards />
      <View style={[styles.installSection, { backgroundColor: colors.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Manual Installation</ThemedText>
        <Text style={[styles.sectionDescription, { color: colors.inactive }]}>
          Enter the details manually if you cannot scan the QR code.
        </Text>

        {/* Manual Installation Details */}
        <View style={[styles.manualDetailsCard, { backgroundColor: colors.surfaceElevated }]}>
          <TextWithCopy
            label="SM-DP+ ADDRESS & ACTIVATION CODE"
            text={qrData}
          />

          {activationAddress && (
            <TextWithCopy label="SM-DP+ ADDRESS" text={activationAddress} />
          )}
          {activationCode && (
            <TextWithCopy label="ACTIVATION CODE" text={activationCode} />
          )}

          <View style={[styles.divider, { backgroundColor: colors.muted }]} />

          <Text style={[styles.manualInstructionText, { color: colors.inactive }]}>
            Copy this information and enter details manually to install your
            eSIM. *Make sure your device has a stable internet connection before
            installing.
          </Text>
        </View>

        {/* Manual Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={[styles.instructionText, { color: colors.inactive }]}>
            {"Steps: Go to Settings > Network & internet and select the plus sign (&quot;+&quot;) next to your SIM — if this is not available, select SIMs/Mobile network.\n\nSelect Download a SIM instead? > Next.\n\nSelect Use a different network if you need to confirm your network.\n\nSelect Need help? > Enter it manually.\n\nEnter the SM-DP+ address and activation code for your new eSIM.\n\nSelect Continue > Download/Activate.\n\nSelect Settings/Done when you see the Download Finished screen."}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const DirectScene = () => {
    const handleDirectInstall = useCallback(async () => {
      try {
        await Linking.openURL(appleInstallationUrl);
      } catch (err) {
        logger.error('ESIM_APPLE_INSTALL_FAILED', { err });
      }
    }, []);
  
    const isEnabled = Platform.OS === "ios" && !!appleInstallationUrl;
  
    return (
      <ScrollView style={styles.content}>
        <WarningCards />
        <View style={[styles.installSection, { backgroundColor: colors.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Direct Installation
          </ThemedText>
  
          <Text style={[styles.instructionText, { color: colors.inactive }]}>
            {isEnabled
              ? "Tap Install eSIM to begin. Do not close the app — installation may take a few minutes. Select Allow/OK when prompted."
              : "Select Install eSIM and wait — do not close the app, installation may take a few minutes. Select Allow/OK, when prompted."}
          </Text>
  
          <TouchableOpacity
            style={[
              styles.shareButton,
              {
                borderColor: isEnabled ? colors.primary : colors.muted,
                opacity:     isEnabled ? 1 : 0.5,
              },
            ]}
            disabled={!isEnabled}
            onPress={isEnabled ? handleDirectInstall : undefined}
            accessibilityRole="button"
            accessibilityLabel={isEnabled ? "Install eSIM on this iPhone" : "Direct installation (coming soon)"}
            accessibilityState={{ disabled: !isEnabled }}
          >
            <Text
              style={[
                styles.shareButtonText,
                { color: isEnabled ? colors.text : colors.inactive },
              ]}
            >
              {isEnabled ? "Install eSIM" : "Coming soon"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const tabSpeedIconCount: Partial<Record<TabType, number>> = {
    Direct: 2,
    QR: 1,
  };

  const renderTabBar = () => {
    const tabs: TabType[] = ["Direct", "QR", "Manual"];

    return (
      <View style={styles.tabBarOuterContainer}>
        <View style={[styles.tabBarContainer, {
          backgroundColor: isDark ? colors.muted : colors.input,
        }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              {activeTab === tab && <View style={[styles.tabIndicator, {
                backgroundColor: isDark ? colors.secondaryBackground : colors.card,
              }]} />}
              {!!tabSpeedIconCount[tab] && (
                <View style={styles.tabSpeedIcons}>
                  {Array.from({ length: tabSpeedIconCount[tab] as number }).map((_, index) => (
                    <Ionicons
                      key={index}
                      name="flash"
                      size={12}
                      color={FLASH_COLOR}
                    />
                  ))}
                </View>
              )}
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color:
                      activeTab === tab
                        ? colors.text
                        : colors.inactive,
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Direct":
        return <DirectScene />;
      case "QR":
        return <QRScene />;
      case "Manual":
        return <ManualScene />;
      default:
        return <QRScene />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderTabBar()}
      {renderContent()}
    </View>
  );
};

export default EsimInstallation;
