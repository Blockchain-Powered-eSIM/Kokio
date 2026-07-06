import React, { useMemo } from "react";
import {
  StyleSheet,
  Image,
  View,
  Text,
  Platform,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { BASE_SEPOLIA_TESTNET } from "@/constants/general.constants";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";

interface WalletProps {
  balance?: string;
  walletId?: string;
  isWalletAdded?: boolean;
  onSetupWallet?: () => void;
}
const shortenId = (
  address: string | undefined,
  startLength = 3,
  endLength = 6
) => {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const createStyles = () => StyleSheet.create({
  headingText: {
    fontSize: 16,
    paddingLeft: 20,
    marginBottom: 8,
  },
  shadowContainer: {
    marginHorizontal: 8,
    borderRadius: 21,
    backgroundColor: Theme.colors.text,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
        shadowColor: Theme.colors.text,
      },
    }),
  },
  gradient: {
    borderRadius: 21,
    padding: 24,
    overflow: "hidden",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    marginLeft: 70,
    width: "auto",
  },
  headerWithLogo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  title: {
    paddingLeft: 16,
    fontSize: 22,
    fontWeight: "500",
    color: Theme.colors.text,
  },
  logo: {
    width: 32,
    height: 32,
  },
  balanceContainer: {
    backgroundColor: "transparent",
    paddingTop: 24,
    paddingLeft: 16,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  balanceAmount: {
    fontSize: 45,
    fontWeight: "bold",
    flexShrink: 1,
    lineHeight: 44,
  },
  balanceCurrency: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 4,
  },
  address: {
    alignSelf: "flex-end",
    fontSize: 12,
    fontWeight: "600",
  },
  walletIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
});

const Wallet = ({ balance, walletId, isWalletAdded, onSetupWallet }: WalletProps) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const handleAddressPress = async () => {
    if (walletId) {
      const url = `${BASE_SEPOLIA_TESTNET}/${walletId}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error("Error opening browser:", error);
      }
    }
  };

  const handleCopyAddress = async () => {
    if (walletId) {
      try {
        await Clipboard.setStringAsync(walletId);
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  return (
    <View style={{ marginVertical: 12 }}>
      <Text style={[styles.headingText, { color: Theme.colors.text }]}>Device Wallet</Text>
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={[Theme.colors.gradientDark, Theme.colors.background]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <ImageBackground
            source={require("@/assets/images/slantedBackground.png")}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <ThemedView style={styles.headerWithLogo}>
            <ThemedText variant="xl" className=" font-Lexend ml-4">
              Device Wallet
            </ThemedText>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </ThemedView>
          {isWalletAdded ? (
            <>
              <ThemedView style={styles.balanceContainer}>
                <ThemedText variant="sm" className="text-white mb-1">
                  Total balance
                </ThemedText>
                <View style={styles.balanceAmountContainer}>
                  <ThemedText className="text-white text-[40px] mr-1">
                    {balance}
                  </ThemedText>
                  <ThemedText className="text-white mb-2 ml-1">USD</ThemedText>
                </View>
              </ThemedView>
              <View style={styles.walletIdContainer}>
                <ThemedText variant="sm" className="text-white">
                  {shortenId(walletId)}
                </ThemedText>
                <View style={styles.iconContainer}>
                  <TouchableOpacity
                    onPress={handleAddressPress}
                    disabled={!walletId}
                    style={styles.iconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Open wallet address in block explorer"
                  >
                    <MaterialIcons
                      name="open-in-new"
                      size={16}
                      color={Theme.colors.foreground}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCopyAddress}
                    disabled={!walletId}
                    style={styles.iconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Copy wallet address"
                  >
                    <Ionicons name="copy-outline" size={16} color={Theme.colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <TouchableOpacity
              onPress={onSetupWallet}
              accessibilityRole="button"
              accessibilityLabel="Create your device wallet"
            >
              <ThemedText className="mt-8 mb-20 ml-4">
                Tap to create your device wallet
              </ThemedText>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </View>
  );
};

export default Wallet;

