import React from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { createStyles } from "../settings-styles";

export const ContactContent = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutContent}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL("mailto:contact@kokio.app")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="mail-outline" size={24} color="white" style={styles.iconLeft} />
            <ThemedText style={styles.menuItemText}>Email Us</ThemedText>
            <ThemedText style={styles.aboutLink}>contact@kokio.app</ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => openBrowserAsync("https://t.me/+Ru38DI2V69IyY2Y9")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="paper-plane-outline" size={24} color="white" style={styles.iconLeft} />
            <ThemedText style={styles.menuItemText}>Telegram</ThemedText>
            <Ionicons name="chevron-forward-outline" size={20} color={styles.closeButton.color} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
