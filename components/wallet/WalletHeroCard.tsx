import React from "react";
import {
  StyleSheet,
  Image,
  View,
  Platform,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { BASE_SEPOLIA_TESTNET } from "@/constants/general.constants";
import { shortenAddress } from "@/utils/address";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { logger } from "@/utils/logger";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { DARK_TOKENS, LIGHT_TOKENS } from "@/constants/Colors";

interface WalletHeroCardProps {
  address: string;
  balance?: string;
  isBalanceLoading?: boolean;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  shadowContainer: {
    marginHorizontal: 8,
    borderRadius: 21,
    backgroundColor: colors.text,
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
        shadowColor: colors.text,
      },
    }),
  },
  gradient: {
    borderRadius: 21,
    padding: 24,
    overflow: "hidden",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
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
  testnetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.itemBackground,
  },
  testnetBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.foreground,
  },
  title: {
    paddingLeft: 16,
    fontSize: 22,
    fontWeight: "500",
    color: colors.text,
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
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  addressRow: {
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

export function WalletHeroCard({ address, balance, isBalanceLoading }: WalletHeroCardProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();

  const handleAddressPress = async () => {
    if (!address) return;
    const url = `${BASE_SEPOLIA_TESTNET}/${address}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      logger.error('BROWSER_OPEN_FAILED', { error });
    }
  };

  return (
    <View style={{ marginVertical: 12 }}>
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={[colors.gradientDark, colors.background]}
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
            <View style={styles.testnetBadge}>
              <ThemedText style={styles.testnetBadgeText}>TESTNET</ThemedText>
            </View>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </ThemedView>

          <ThemedView style={styles.balanceContainer}>
            <ThemedText
              variant="sm"
              lightColor={LIGHT_TOKENS.text}
              darkColor={DARK_TOKENS.text}
              style={{ marginBottom: 4 }}
            >
              Total balance
            </ThemedText>
            <View style={styles.balanceAmountContainer}>
              {isBalanceLoading ? (
                <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 4 }} />
              ) : (
                <ThemedText
                  className="text-[40px]"
                  lightColor={LIGHT_TOKENS.text}
                  darkColor={DARK_TOKENS.text}
                  style={{ marginRight: 4 }}
                >
                  {balance === undefined ? "—" : `$${balance}`}
                </ThemedText>
              )}
              <ThemedText
                lightColor={LIGHT_TOKENS.text}
                darkColor={DARK_TOKENS.text}
                style={{ marginBottom: 8, marginLeft: 4 }}
              >
                USD
              </ThemedText>
            </View>
          </ThemedView>

          <View style={styles.addressRow}>
            <ThemedText variant="sm" lightColor={LIGHT_TOKENS.text} darkColor={DARK_TOKENS.text}>
              {shortenAddress(address)}
            </ThemedText>
            <View style={styles.iconContainer}>
              <TouchableOpacity
                onPress={handleAddressPress}
                disabled={!address}
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Open wallet address in block explorer"
              >
                <MaterialIcons
                  name="open-in-new"
                  size={16}
                  color={colors.foreground}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => copy(address)}
                disabled={!address}
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Copy wallet address"
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={copied ? colors.success : colors.foreground}
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

export default WalletHeroCard;
