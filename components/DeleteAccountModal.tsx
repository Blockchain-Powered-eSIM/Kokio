/**
 * DeleteAccountModal — type-to-confirm gate for DELETE /v1/account.
 *
 * The three consequences:
 *   1. Irreversible. No recovery path exists for anyone, including the operator.
 *   2. Paid eSIMs KEEP WORKING until expiry.
 *   3. On-chain records are immutable and cannot be deleted by anyone.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { StepUpCancelledError } from '@/utils/auth/errors';
import { logger } from '@/utils/logger';

const CONFIRM_WORD = 'DELETE';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

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
      fontFamily: 'Lexend-Light',
      fontWeight: '300',
      color: Theme.colors.text,
      marginBottom: 14,
    },
    bullets: { marginBottom: 18 },
    bullet: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: 'Lexend-Light',
      fontWeight: '300',
      color: Theme.colors.foreground,
      marginBottom: 8,
    },
    prompt: {
      fontSize: 13,
      fontFamily: 'Lexend-Light',
      color: Theme.colors.foreground,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: Theme.colors.foreground,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: Theme.colors.text,
      fontFamily: 'Lexend-Light',
      fontSize: 16,
      letterSpacing: 2,
    },
    error: {
      color: Theme.colors.destructive,
      fontFamily: 'Lexend-Light',
      fontSize: 13,
      marginTop: 10,
    },
    actions: { flexDirection: 'row', marginTop: 24, gap: 12 },
    btn: {
      flex: 1,
      height: 52,
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
    btnDanger: { backgroundColor: Theme.colors.destructive },
    btnDangerText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Lexend-Light',
      color: '#FFFFFF',
    },
    btnDisabled: { opacity: 0.45 },
  });

export const DeleteAccountModal: React.FC<Props> = ({ visible, onCancel, onConfirm }) => {
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const armed = input.trim().toUpperCase() === CONFIRM_WORD && !busy;

  const handleConfirm = useCallback(async () => {
    if (!armed) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      // User dismissed the passkey prompt — not an error state, just abort.
      if (err instanceof StepUpCancelledError) {
        setBusy(false);
        return;
      }
      logger.error('ACCOUNT_DELETE_FAILED', { err });
      setError('Deletion failed. Your account has not been changed. Please try again.');
      setBusy(false);
    }
  }, [armed, onConfirm]);

  const handleCancel = useCallback(() => {
    if (busy) return;
    setInput('');
    setError('');
    onCancel();
  }, [busy, onCancel]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <BlurView
        intensity={60}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.scrim}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Delete account</ThemedText>

          <ThemedText style={styles.body}>
            This permanently deletes your account. It cannot be undone — not by you, and
            not by us. There is no recovery.
          </ThemedText>

          <View style={styles.bullets}>
            <ThemedText style={styles.bullet}>
              • Your eSIMs keep working. Any plan you have already paid for stays active on
              your device until it expires. Deleting your account does not cancel or refund it.
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • You lose access to your order history, eSIM details, and wallet in this app.
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • On-chain records are permanent. Transactions already published to the
              blockchain cannot be deleted by anyone.
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • You will need to remove your passkey yourself. We will show you how in the
              next step.
            </ThemedText>
          </View>

          <ThemedText style={styles.prompt}>Type {CONFIRM_WORD} to confirm.</ThemedText>

          <TextInput
            value={input}
            onChangeText={setInput}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={Theme.colors.foreground}
            style={styles.input}
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm account deletion`}
          />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <View style={styles.actions}>
            <Pressable
              onPress={handleCancel}
              disabled={busy}
              style={[styles.btn, styles.btnGhost, busy && styles.btnDisabled]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.btnGhostText}>Cancel</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!armed}
              style={[styles.btn, styles.btnDanger, !armed && styles.btnDisabled]}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.btnDangerText}>Delete account</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
