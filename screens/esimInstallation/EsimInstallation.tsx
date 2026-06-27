import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import _head from "lodash/head";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams } from "expo-router";

import _get from "lodash/get";
import _split from "lodash/split";
import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

type TabType = "Direct" | "QR" | "Manual";

const TextWithCopy = ({ label, text }: {label: string, text: string}) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const handleCopyQRData = async () => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };
  return (
    <View style={styles.textCopyContainer}>
      <Text style={[styles.manualDetailsHeader, { color: Theme.colors.inactive }]}>{label}</Text>
      <View style={styles.manualDetailsContent}>
        <View style={styles.manualDetailsTextContainer}>
          <Text style={[styles.manualDetailsText, { color: Theme.colors.text }]}>{text}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyQRData}>
          <Ionicons name="copy-outline" size={16} color={Theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = () => StyleSheet.create({
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
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    minHeight: 30,
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
});

const EsimInstallation = () => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const { qrcode } = useLocalSearchParams();
  const qrData =
    (Array.isArray(qrcode) ? _head(qrcode) : qrcode) ||
    "LPA:1$activation.airalo.com$sample-qr-data";

  const qrDataSplit = _split(qrData, "$");
  const activationAddress = _get(qrDataSplit, [1]);
  const activationCode = _get(qrDataSplit, [2]);
  const [activeTab, setActiveTab] = useState<TabType>("QR");

  const QRScene = () => {
    const qrViewRef = useRef(null);

    const handleShareQR = async () => {
      try {
        if (!qrViewRef.current) {
          console.log("QR view ref is not available");
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
          err && console.log("react-native-share API failed", err);
        });
      } catch (error) {
        console.error("QR Share failed with error", error);
      }
    };

    return (
      <ScrollView style={styles.content}>
        {/* Warning Cards */}
        <View style={[styles.warningCard, { backgroundColor: Theme.colors.surface }]}>
          <MaterialCommunityIcons
            name="comment-alert"
            size={32}
            color={Theme.colors.primary}
            style={styles.warningIconTopRight}
          />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: Theme.colors.text }]}>
              Most eSIMs can only be installed once.
            </Text>
            <Text style={[styles.warningDescription, { color: Theme.colors.inactive }]}>
              If you remove the eSIM from your device, you cannot install it
              again.
            </Text>
          </View>
        </View>

        <View style={[styles.warningCard, { backgroundColor: Theme.colors.surface }]}>
          <MaterialCommunityIcons
            name="comment-alert"
            size={32}
            color={Theme.colors.primary}
            style={styles.warningIconTopRight}
          />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: Theme.colors.text }]}>
              Make sure your device has a stable internet connection before
              installing
            </Text>
          </View>
        </View>

        {/* Install eSIM Section */}
        <View style={[styles.installSection, { backgroundColor: Theme.colors.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: Theme.colors.text }]}>Install eSIM</ThemedText>
          <Text style={[styles.sectionDescription, { color: Theme.colors.inactive }]}>
            Scan the QR code by printing out or displaying the code on another
            device to install your eSIM.
          </Text>

          {/* QR Code */}
          <ViewShot style={[styles.qrContainer, { backgroundColor: Theme.colors.surface }]} ref={qrViewRef}>
            <QRCode
              value={qrData}
              size={200}
              color={Theme.colors.text}
              backgroundColor={Theme.colors.surface}
            />
          </ViewShot>

          {/* Share Button */}
          <TouchableOpacity style={[styles.shareButton, { borderColor: Theme.colors.muted }]} onPress={handleShareQR}>
            <Text style={[styles.shareButtonText, { color: Theme.colors.text }]}>Share QR code</Text>
            <Ionicons name="share-outline" size={20} color={Theme.colors.text} />
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionText, { color: Theme.colors.inactive }]}>
              {
                "1. Go to Settings > Cellular/Mobile Data > Add eSIM or Set up Cellular/Mobile Service > Use QR Code on your device."
              }
            </Text>
            <Text style={[styles.instructionText, { color: Theme.colors.inactive }]}>
              {" 2. Scan the QR code or take a screenshot."}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const ManualScene = () => (
    <ScrollView style={styles.content}>
      <View style={[styles.installSection, { backgroundColor: Theme.colors.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: Theme.colors.text }]}>Manual Installation</ThemedText>
        <Text style={[styles.sectionDescription, { color: Theme.colors.inactive }]}>
          Enter the details manually if you cannot scan the QR code.
        </Text>

        {/* Manual Installation Details */}
        <View style={[styles.manualDetailsCard, { backgroundColor: Theme.colors.surfaceElevated }]}>
          <TextWithCopy
            label="SM-DP+ ADDRESS & ACTIVATION CODE"
            text={qrData}
          />

          {Platform.OS === "ios" && activationAddress && (
            <TextWithCopy label="SM-DP+ ADDRESS" text={activationAddress} />
          )}
          {Platform.OS === "ios" && activationCode && (
            <TextWithCopy label="ACTIVATION CODE" text={activationCode} />
          )}

          <View style={[styles.divider, { backgroundColor: Theme.colors.muted }]} />

          <Text style={[styles.manualInstructionText, { color: Theme.colors.inactive }]}>
            Copy this information and enter details manually to install your
            eSIM. *Make sure your device has a stable internet connection before
            installing.
          </Text>
        </View>

        {/* Manual Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={[styles.instructionText, { color: Theme.colors.inactive }]}>
            Steps: Go to Settings {">"} Network & internet and select the plus
            sign (&quot;+&quot;) next to your SIM — if this is not available, select
            SIMs/Mobile network. Select Download a SIM instead? {">"} Next.
            Select Use a different network if you need to confirm your network.
            Select Need help? {">"} Enter it manually. Enter the SM-DP+ address
            and activation code for your new eSIM. Select Continue {">"}{" "}
            Download/Activate. Select Settings/Done when you see the Download
            Finished screen.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const DirectScene = () => (
    <ScrollView style={styles.content}>
      <View style={[styles.installSection, { backgroundColor: Theme.colors.surface }]}>
        <ThemedText style={[styles.sectionTitle, { color: Theme.colors.text }]}>Direct Installation</ThemedText>
        <Text style={[styles.sectionDescription, { color: Theme.colors.inactive }]}>
          *Note that the eSIM installation process must not be interrupted and
          make sure your device has a stable internet connection before
          installing.
        </Text>

        <Text style={[styles.instructionText, { color: Theme.colors.inactive }]}>
          Select Install eSIM and wait — do not close the app, installation may
          take a few minutes. Select Allow/OK, when prompted.
        </Text>

        <TouchableOpacity style={[styles.shareButton, { borderColor: Theme.colors.muted }]}>
          <Text style={[styles.shareButtonText, { color: Theme.colors.text }]}>Coming soon</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTabBar = () => {
    const tabs: TabType[] = ["Direct", "QR", "Manual"];

    return (
      <View style={styles.tabBarOuterContainer}>
        <View style={[styles.tabBarContainer, {
          backgroundColor: isDark ? Theme.colors.muted : Theme.colors.input,
        }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              {activeTab === tab && <View style={[styles.tabIndicator, {
                backgroundColor: isDark ? Theme.colors.secondaryBackground : Theme.colors.card,
              }]} />}
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color:
                      activeTab === tab
                        ? Theme.colors.text
                        : Theme.colors.inactive,
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
    <View style={[styles.container, { backgroundColor: Theme.colors.background }]}>
      {renderTabBar()}
      {renderContent()}
    </View>
  );
};

export default React.memo(EsimInstallation);
