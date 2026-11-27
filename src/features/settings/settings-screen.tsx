import React, { useState, useEffect } from "react";
import { FlatList } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useKokio } from "@/hooks/use-kokio";
import { useAuthRelay } from "@/hooks/use-auth-relayer";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from '@/components/header';
import { HeaderBackControl } from '@/components/navigation/stack-header';
import { purgeAccountLocalState } from '@/lib/auth/purge-account-local-state';
import * as SecureStore from 'expo-secure-store';
import { LOCAL_DATA_VERSION_KEY } from '@/lib/storage/keys';
import { clearWelcomeBackSeen } from '@/lib/auth/returning-user-probe';
import { useToast } from '@/providers/toast-context';
import type { TabPressNavigation } from "@/lib/navigation";
import { createStyles } from "./settings-styles";
import { MenuItem } from "./components/menu-item";
import { AboutContent } from "./components/about-content";
import { ContactContent } from "./components/contact-content";
import { ThemeModePicker } from "./components/theme-mode-picker";
import { DeleteAccountModal } from './components/delete-account-modal';

export default function MenuScreen() {
  const { logout, deleteAccount } = useAuthRelay();
  const { clearKokioUser } = useKokio();
  const { showMessage } = useToast();
  const router = useRouter();
  const navigation = useNavigation<TabPressNavigation>();

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
    const unsubscribe = navigation.addListener("tabPress", () => {
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
        // await SecureStore.deleteItemAsync(LOCAL_DATA_VERSION_KEY);
        // Simulates a device coming from an old build
        await SecureStore.setItemAsync(LOCAL_DATA_VERSION_KEY, '2');
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
            <ThemeModePicker />
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
