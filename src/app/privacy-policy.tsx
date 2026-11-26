import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { logger } from "@/utils/logger";

const PRIVACY_POLICY_URL = "https://kokio.app/privacy-policy";

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
    webview: {
      flex: 1,
    },
    loaderOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
  });

export default function PrivacyPolicyModal() {
  const styles = useThemedStyles(createStyles);
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: bg }]}
      edges={["top", "bottom"]}
    >
      {/* Header — inline since this is a root-stack modal with no layout header */}
      <View style={styles.header}>
        <View style={styles.spacer} />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close privacy policy"
          hitSlop={8}
        >
          <Ionicons name="close-outline" size={28} color={textColor} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: PRIVACY_POLICY_URL }}
          style={[styles.webview, loading && { opacity: 0 }]}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(event) => logger.error('PRIVACY_POLICY_LOAD_FAILED', { error: event.nativeEvent })}
        />
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
