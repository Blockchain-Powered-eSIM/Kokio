import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  ScrollView,
  // Switch,
  Text,
  Switch,
  Linking,
} from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useKokio } from "@/hooks/useKokio";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { SafeAreaView } from "react-native-safe-area-context";
import { logger } from "@/utils/logger";

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 20,
    paddingBottom: 0,
  },
  list: {
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
    color: Theme.colors.text,
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
    borderRadius: 25,
    flex: 1,
    padding: 20,
    paddingBottom: 8,
  },
  aboutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.muted,
  },
  aboutTitle: {
    color: Theme.colors.text,
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
    color: Theme.colors.text,
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
    color: Theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  aboutLink: {
    color: Theme.colors.link,
    textDecorationLine: "underline",
    fontSize: 15,
    lineHeight: 24,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  themeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Theme.colors.text,
  },
});

const MENU_ITEM_ENABLED = {
  CONTACT: false, // moved from the bottom Phone tab — enable once contacts feature is ready
  PRIVACY: false, // enable once privacy policy is ready
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
}) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  return (
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
};

const AboutContent = ({ onClose }: { onClose: () => void }) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const handleLinkPress = useCallback(async (url: string) => {
    try {
      await openBrowserAsync(url);
    } catch (error) {
      logger.error('BROWSER_OPEN_FAILED', { error });
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
          You are using KOKI&#39;O Beta v1
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
          <Text style={styles.linkText}>Website: </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://kokio.app")}>
            <Text style={styles.aboutLink}>kokio</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Follow us: </Text>
          <TouchableOpacity onPress={() => handleLinkPress("https://x.com/kokiodotapp")}>
            <Text style={styles.aboutLink}>@kokiodotapp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const ContactContent = ({ onClose }: { onClose: () => void }) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);

  return (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutHeader}>
        <ThemedText style={styles.aboutTitle}>Contact Support</ThemedText>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.aboutContent}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL("mailto:contact@kokio.app")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="mail-outline" size={24} color="white" style={styles.iconLeft} />
            <ThemedText style={styles.menuItemText}>Email Us</ThemedText>
            <ThemedText style={{ color: Theme.colors.muted, fontSize: 13 }}>contact@kokio.app</ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => openBrowserAsync("https://t.me/+Ru38DI2V69IyY2Y9")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="paper-plane-outline" size={24} color="white" style={styles.iconLeft} />
            <ThemedText style={styles.menuItemText}>Telegram</ThemedText>
            <Ionicons name="chevron-forward-outline" size={20} color="white" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function MenuScreen() {
  const { logout } = useAuthRelay();
  const { clearKokioUser } = useKokio();
  const { isDark, toggleTheme } = useTheme();

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const bg = useThemeColor({}, "background");
  const styles = useMemo(createStyles, [isDark]);

  const menuItems = [
    {
      id: "1",
      title: "Contact",
      iconLeft: "call-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.CONTACT,
    },
    {
      id: "3",
      title: "Privacy Policy",
      iconLeft: "lock-closed-outline",
      iconRight: "chevron-forward-outline",
      disabled: !MENU_ITEM_ENABLED.PRIVACY,
    },
    {
      id: "5",
      title: "About",
      iconLeft: "information-circle-outline",
      iconRight: "chevron-forward-outline",
      action: () => setShowAbout(true),
    },
    {
      id: "8",
      title: "Contact Support",
      iconLeft: "headset-outline",
      iconRight: "chevron-forward-outline",
      action: () => setShowContact(true),
    },
    {
      id: "6",
      title: "Logout",
      iconLeft: "log-out-outline",
      iconRight: "chevron-forward-outline",
      action: logout,
    },
    ...(__DEV__ ? [{
      id: "7",
      title: "Logout and Clear Data",
      iconLeft: "trash-outline",
      iconRight: "chevron-forward-outline",
      action: async () => {
        await clearKokioUser();
        await logout();
      },
    }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ThemedView style={styles.container}>
        {showAbout ? (
          <AboutContent onClose={() => setShowAbout(false)} />
        ) : showContact ? (
          <ContactContent onClose={() => setShowContact(false)} />
        ) : (
          <>
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
            { <View style={styles.themeRow}>
              <Ionicons
                name={isDark ? "moon-outline" : "sunny-outline"}
                size={24}
                color={Theme.colors.text}
                style={styles.iconLeft}
              />
              <ThemedText style={styles.themeLabel}>
                {isDark ? "Dark Mode" : "Light Mode"}
              </ThemedText>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: Theme.colors.muted, true: Theme.colors.primary }}
                thumbColor={Theme.colors.text}
              />
            </View> }
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
