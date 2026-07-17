/**
 * PasskeyRemovalModal — shown after ACCOUNT_DELETED.
 *
 * Why this exists: the BFF spec states the Auth Server is intentionally NOT informed of account deletion.
 * The passkey therefore remains registered and will keep authenticating successfully.
 * The user can "log in" forever and every authenticated call will return ACCOUNT_DELETED (404).
 * Removing the credential is a step only the user can perform, in their platform password manager.
 */
import React, { useMemo } from 'react';
import { Modal, View, Pressable, Platform, StyleSheet, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/utils/logger';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const STEPS = Platform.select({
  ios: [
    'Open the Settings (or Passwords) app.',
    'Tap Passwords/Passkeys, then authenticate.',
    'Find the entry for kokio.app and delete it.',
  ],
  android: [
    'Open Google Password Manager (or your password manager app).',
    'Find the passkey for kokio.app.',
    'Delete the passkey.',
  ],
  default: ['Open your password manager and delete the passkey for kokio.app.'],
}) as string[];

// Built inside useMemo(…, [isDark]) — Theme.colors.* must resolve at call time,
// not at module load, or the palette freezes on whichever theme was active first.
const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    scrim: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)',
    },
    card: {
      backgroundColor: Theme.colors.modalBackground,
      borderRadius: 25,
      padding: 22,
    },
    title: {
      fontSize: 22,
      fontWeight: '300',
      fontFamily: 'Lexend-Light',
      color: Theme.colors.text,
      marginBottom: 12,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '300',
      fontFamily: 'Lexend-Light',
      color: Theme.colors.text,
      marginBottom: 12,
    },
    steps: { marginVertical: 8 },
    step: {
      fontSize: 13,
      lineHeight: 22,
      fontWeight: '300',
      fontFamily: 'Lexend-Light',
      color: Theme.colors.foreground,
    },
    note: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '300',
      fontFamily: 'Lexend-Light',
      color: Theme.colors.foreground,
      marginTop: 12,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 24,
      gap: 12,
    },
    btn: {
      height: 52,
      minWidth: 120,
      paddingHorizontal: 22,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnGhost: {
      borderWidth: 1,
      borderColor: Theme.colors.foreground,
    },
    btnGhostText: {
      fontSize: 16,
      fontWeight: '300',
      fontFamily: 'Lexend-Light',
      color: Theme.colors.foreground,
    },
    btnPrimary: { backgroundColor: Theme.colors.highlight },
    btnPrimaryText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Lexend-Light',
      color: '#000000',
    },
  });

export const PasskeyRemovalModal: React.FC<Props> = ({ visible, onDismiss }) => {
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const openSettings = () => {
    Linking.openSettings().catch((err) =>
      logger.error('PASSKEY_REMOVAL_OPEN_SETTINGS_FAILED', { err }),
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <BlurView
        intensity={60}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.scrim}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Your account is deleted</ThemedText>

          <ThemedText style={styles.body}>
            Your account and its credentials have been removed from our servers. To completely delete everything 
            from your device, uninstall the Kokio app and delete the associated passkey.
          </ThemedText>

          <ThemedText style={styles.body}>
            Until you remove it, your device will still hold a passkey for Kokio. It no
            longer grants access to anything — the account behind it is gone — but it will
            keep appearing in your password manager.
          </ThemedText>

          <View style={styles.steps}>
            {STEPS.map((step, i) => (
              <ThemedText key={i} style={styles.step}>
                {i + 1}. {step}
              </ThemedText>
            ))}
          </View>

          <ThemedText style={styles.note}>
            Any eSIM you already paid for KEEPS working until it expires. To use Kokio
            again, create a new account — this generates a new passkey and a new wallet.
            The deleted account cannot be restored.
          </ThemedText>

          <View style={styles.actions}>
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={openSettings}
                style={[styles.btn, styles.btnGhost]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.btnGhostText}>Open Settings</ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={onDismiss}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.btnPrimaryText}>Done</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
