import React, { useCallback } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { logger } from "@/lib/logger";
import { createStyles } from "../settings-styles";

export const AboutContent = () => {
  const styles = useThemedStyles(createStyles);
  const handleLinkPress = useCallback(async (url: string) => {
    try {
      await openBrowserAsync(url);
    } catch (error) {
      logger.error('BROWSER_OPEN_FAILED', { error });
    }
  }, []);

  return (
    <View style={styles.aboutContainer}>
      <ScrollView
        style={styles.aboutContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.aboutText}>
          You are using official Kokio mobile app.
        </ThemedText>
        <ThemedText style={styles.aboutText}>
          A mobile app to purchase eSIM data plans and subscriptions using
          crypto or fiat in over 200 countries.
        </ThemedText>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Based on </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://github.com/Blockchain-Powered-eSIM/Smart-Contract-Suite")}>
            <Text style={styles.aboutLink}>Open Source eSIM Wallet Suite</Text>
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.aboutText}>
          Built with privacy first, friendly and practical design for the digital
          well-being and connectivity freedom of mobile users worldwide.
        </ThemedText>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Our website </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://kokio.app")}>
            <Text style={styles.aboutLink}>kokio.app</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Follow us on socials </Text>
          <View style={styles.socialsRow}>
            <TouchableOpacity
              style={styles.socialIconButton}
              onPress={() => handleLinkPress("https://x.com/kokiodotapp")}
              accessibilityRole="link"
              accessibilityLabel="Follow @kokiodotapp on X"
            >
              <Ionicons name="logo-x" size={16} color={styles.aboutLink.color} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIconButton}
              onPress={() => handleLinkPress("https://instagram.com/kokiodotapp")}
              accessibilityRole="link"
              accessibilityLabel="Follow @kokiodotapp on Instagram"
            >
              <Ionicons name="logo-instagram" size={16} color={styles.aboutLink.color} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
