import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
} from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { Theme } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useKokio } from "@/hooks/useKokio";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// Feature flags for menu item availability
// Set to true to enable the menu item, false to disable (but keep visible)
const MENU_ITEM_ENABLED = {
  PROFILE: false, // Change to true to enable Profile
  NOTIFICATIONS: false, // Change to true to enable Notifications
  PRIVACY: false, // Change to true to enable Privacy
  GENERAL: false, // Change to true to enable General
};

// Disabled menu item styling
const DISABLED_OPACITY = 0.3;

const MenuItem = ({
  title,
  iconLeft,
  iconRight,
  action,
  disabled = false,
}: {
  title: string;
  iconLeft: string;
  iconRight: string;
  action: (() => void) | undefined;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.menuItem, disabled && { opacity: DISABLED_OPACITY }]}
    onPress={() => !disabled && action && action()}
    disabled={disabled}
  >
    <View style={styles.menuItemContent}>
      <Ionicons
        /* @ts-ignore */
        name={iconLeft}
        size={24}
        color={disabled ? Theme.colors.inactive : "white"}
        style={styles.iconLeft}
      />
      <ThemedText
        style={{
          ...styles.menuItemText,
          ...(disabled && { color: Theme.colors.inactive }),
        }}
      >
        {title}
      </ThemedText>
      <Ionicons
        /* @ts-ignore */
        name={iconRight}
        size={24}
        color={disabled ? Theme.colors.inactive : "white"}
        style={styles.iconRight}
      />
    </View>
  </TouchableOpacity>
);

const AboutContent = ({ onClose }: { onClose: () => void }) => {
  const handleLinkPress = useCallback(async () => {
    try {
      await openBrowserAsync(
        "https://github.com/Blockchain-Powered-eSIM/Smart-Contract-Suite"
      );
    } catch (error) {
      console.error("Error opening browser:", error);
    }
  }, []);

  return (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutHeader}>
        <ThemedText style={styles.aboutTitle}>About</ThemedText>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.aboutContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.aboutText}>
          You are using ALPHA V1 of KOKI'O,
        </ThemedText>
        <ThemedText style={styles.aboutText}>
          A mobile app to purchase eSIM data plans and subscriptions using
          crypto or fiat in over 200 countries.
        </ThemedText>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Based on </Text>
          <TouchableOpacity onPress={handleLinkPress}>
            <Text style={styles.aboutLink}>Open Source eSIM Wallet Suite</Text>
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.aboutText}>
          Built with privacy first, friendly and practical design mechanism for
          digital well being of mobile users, for freedom in their connectivity.
        </ThemedText>
      </ScrollView>
    </View>
  );
};

export default function MenuScreen() {
  const { loginWithPasskey, signUpWithPasskey, reauthenticate, logout } =
    useAuthRelay();
  const { clearKokioUser } = useKokio();
  const router = useRouter();

  // State to track whether About screen is visible
  const [showAbout, setShowAbout] = useState(false);

  const menuItems = [
    {
      id: "1",
      title: "Profile",
      iconLeft: "person-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.PROFILE,
    },
    {
      id: "2",
      title: "Notifications",
      iconLeft: "notifications-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.NOTIFICATIONS,
    },
    {
      id: "3",
      title: "Privacy",
      iconLeft: "lock-closed-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.PRIVACY,
    },
    {
      id: "4",
      title: "General",
      iconLeft: "settings-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.GENERAL,
    },
    {
      id: "5",
      title: "About",
      iconLeft: "information-circle-outline",
      iconRight: "chevron-forward-outline",
      action: () => setShowAbout(true),
    },
    {
      id: "6",
      title: "Login with Passkey",
      iconLeft: "log-in-outline",
      iconRight: "chevron-forward-outline",
      action: async () => {
        router.push("/");
        loginWithPasskey();
      },
    },
    {
      id: "7",
      title: "Logout and Clear Data",
      iconLeft: "log-out-outline",
      iconRight: "chevron-forward-outline",
      action: async () => {
        // Clear Kokio SDK + passkey / wallet / eSIM state from SecureStore first,
        // then revoke the refresh token and wipe the auth token store.
        await clearKokioUser();
        await logout();
      },
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {showAbout ? (
          <AboutContent onClose={() => setShowAbout(false)} />
        ) : (
          <FlatList
            data={menuItems}
            renderItem={({ item }) => (
              <MenuItem
                title={item.title}
                iconLeft={item.iconLeft}
                iconRight={item.iconRight}
                action={item.action}
                disabled={item.disabled}
              />
            )}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  list: {
    backgroundColor: "#242427",
    borderRadius: 25,
    maxHeight: "auto",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  menuItem: {
    padding: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  iconLeft: {
    marginRight: 16,
  },
  iconRight: {
    marginLeft: 16,
  },
  aboutContainer: {
    backgroundColor: "#242427",
    borderRadius: 25,
    flex: 1,
    padding: 20,
  },
  aboutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3d",
  },
  aboutTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  aboutContent: {
    flex: 1,
  },
  aboutText: {
    color: "white",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    opacity: 0.9,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  linkText: {
    color: "white",
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  aboutLink: {
    color: "#4A9EFF",
    textDecorationLine: "underline",
    fontSize: 15,
    lineHeight: 24,
  },
});
