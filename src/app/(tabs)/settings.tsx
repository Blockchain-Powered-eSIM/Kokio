import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  Linking,
} from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { useRouter, useNavigation } from "expo-router";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useKokio } from "@/hooks/useKokio";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { SafeAreaView } from "react-native-safe-area-context";
import { logger } from "@/utils/logger";
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import Header from '@/components/Header';
import { HeaderBackControl } from '@/components/navigation/stackHeader';
import { purgeAccountLocalState } from '@/utils/auth/purgeAccountLocalState';
import * as SecureStore from 'expo-secure-store';
import { VERSION_KEY } from '@/utils/auth/mainnetCutoverReset';
import { clearWelcomeBackSeen } from '@/utils/auth/returningUserProbe';
import { useToast } from '@/contexts/ToastContext';

const THEME_MODE_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "System", icon: "contrast-outline" },
  { value: "light", label: "Day", icon: "sunny-outline" },
  { value: "dark", label: "Night", icon: "moon-outline" },
];

const createStyles = (colors: Palette) => StyleSheet.create({
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
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  iconLeft: {
    color: colors.icon,
    marginRight: 16,
  },
  iconRight: {
    color: colors.icon,
    marginLeft: 16,
  },
  aboutContainer: {
    borderRadius: 25,
    flex: 1,
    padding: 20,
    paddingBottom: 8,
  },
  closeButton: {
    color: colors.icon,
    paddingTop: 16,
  },
  aboutContent: {
    flex: 1,
  },
  aboutText: {
    color: colors.text,
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
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  aboutLink: {
    color: colors.link,
    textDecorationLine: "underline",
    fontSize: 15,
    lineHeight: 24,
  },
  socialsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  socialIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.itemBackground,
  },
  themeSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 12,
  },
  themeModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeModeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  themeModeOptionLabel: {
    fontSize: 12.5,
    fontWeight: "500",
  },
});

const MenuItem = ({
  title,
  iconLeft,
  iconRight,
  action,
}: {
  title: string;
  iconLeft: string;
  iconRight: string;
  action: (() => void) | undefined;
}) => {
  const styles = useThemedStyles(createStyles);
  return (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => action?.()}
  >
    <View style={styles.menuItemContent}>
      <Ionicons
        /* @ts-ignore */
        name={iconLeft}
        size={24}
        color="white"
        style={styles.iconLeft}
      />
      <ThemedText style={styles.menuItemText}>
        {title}
      </ThemedText>
      <Ionicons
        /* @ts-ignore */
        name={iconRight}
        size={24}
        color="white"
        style={styles.iconRight}
      />
    </View>
  </TouchableOpacity>
  );
};

const AboutContent = () => {
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

const ContactContent = () => {
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

export default function MenuScreen() {
  const { logout, deleteAccount } = useAuthRelay();
  const { clearKokioUser } = useKokio();
  const { showMessage } = useToast();
  const { isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const styles = useThemedStyles(createStyles);
  const bg = useThemeColor({}, "background");
  const colors = useColors();

  // Resets to the main menu whenever the Settings tab icon is pressed —
  // including re-tapping while already here — instead of leaving whatever
  // sub-view (About/Contact/Delete Account) was last opened on screen.
  useEffect(() => {
    // "tabPress" isn't in expo-router's generic NavigationProp event map,
    // but it still fires correctly at runtime for a screen mounted directly
    // under the bottom Tabs navigator.
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      setShowAbout(false);
      setShowContact(false);
      setShowDeleteAccount(false);
    });
    return unsubscribe;
  }, [navigation]);

  const menuItems = [
    {
      id: "2",
      title: "Refer & Earn",
      iconLeft: "gift-outline",
      iconRight: "chevron-forward-outline",
      action: () => router.push("/refer-and-earn"),
    },
    {
      id: "3",
      title: "Privacy Policy",
      iconLeft: "lock-closed-outline",
      iconRight: "chevron-forward-outline",
      action: () => router.push("/privacy-policy"),
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
    {
      id: "9",
      title: "Delete Account",
      iconLeft: "trash-outline",
      iconRight: "chevron-forward-outline",
      destructive: true,
      action: () => setShowDeleteAccount(true),
    },
    ...(__DEV__ ? [{
      id: "7",
      title: "Logout and Clear Data",
      iconLeft: "trash-outline",
      iconRight: "chevron-forward-outline",
      action: async () => {
        await clearKokioUser();
        await purgeAccountLocalState();
        await logout();
      },
    }] : []),
    ...(__DEV__ ? [{
      id: "10",
      title: "Reset Cutover Test State",
      iconLeft: "refresh-outline",
      iconRight: "chevron-forward-outline",
      action: async () => {
        // await SecureStore.deleteItemAsync(VERSION_KEY);
        // Simulates a device coming from an old build
        await SecureStore.setItemAsync(VERSION_KEY, '2');
        await clearWelcomeBackSeen();
        showMessage('Cutover test state cleared. Relaunch the app to see it again.', 'info');
      },
    }] : []),
  ];

  const isSubView = showAbout || showContact;
  const headerTitle = showAbout ? "About" : showContact ? "Contact Support" : "Settings";
  const closeSubView = () => {
    setShowAbout(false);
    setShowContact(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <Header
        title={headerTitle}
        leftElement={isSubView ? <HeaderBackControl onPress={closeSubView} tintColor={colors.text} /> : undefined}
      />
      <ThemedView style={styles.container}>
        {showAbout ? (
          <AboutContent />
        ) : showContact ? (
          <ContactContent />
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
                />
              )}
              keyExtractor={(item) => item.id}
              style={styles.list}
            />
            <DeleteAccountModal
              visible={showDeleteAccount}
              onCancel={() => setShowDeleteAccount(false)}
              onConfirm={async () => {
                await deleteAccount();
                setShowDeleteAccount(false);
              }}
            />
            <View style={styles.themeSection}>
              <ThemedText style={styles.themeLabel}>Display</ThemedText>
              <View style={styles.themeModeRow}>
                {THEME_MODE_OPTIONS.map((option) => {
                  const selected = themeMode === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.themeModeOption,
                        { backgroundColor: selected ? colors.itemBackground : "transparent" },
                      ]}
                      onPress={() => setThemeMode(option.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${option.label} theme`}
                      accessibilityState={{ selected }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={22}
                        color={selected ? colors.primary : (isDark ? colors.mutedForeground : colors.text)}
                      />
                      <ThemedText
                        style={[
                          styles.themeModeOptionLabel,
                          { color: selected ? colors.primary : (isDark ? colors.mutedForeground : colors.text) },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
