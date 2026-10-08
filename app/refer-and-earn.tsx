import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.muted,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    spacer: {
      width: 32,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.inactive,
      textAlign: "center",
    },
  });

export default function ReferAndEarnModal() {
  const styles = useThemedStyles(createStyles);
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: bg }]}
      edges={["top", "bottom"]}
    >
      {/* Header — inline since this is a root-stack modal with no layout header */}
      <View style={styles.header}>
        <View style={styles.spacer} />
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close refer and earn"
          hitSlop={8}
        >
          <Ionicons name="close-outline" size={28} color={textColor} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Ionicons name="gift-outline" size={40} color={textColor} />
        <ThemedText style={styles.title}>Coming soon</ThemedText>
        <ThemedText style={styles.subtitle}>
          Refer friends and earn rewards. We&apos;re still building this out.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}
