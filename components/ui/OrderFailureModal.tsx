import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { labelForStatus } from "@/utils/orderStatus";

interface OrderFailureModalProps {
  visible: boolean;
  orderStatus: string;
  referenceId: string | null;
  manualReviewReason?: string | null;
  onDismiss: () => void;
}

const REASON_LABELS: Record<string, string> = {
  PLAN_DEACTIVATED:          'The selected plan was deactivated before fulfilment.',
  ON_CHAIN_RECORDING_FAILED: 'On-chain recording failed after multiple retries.',
  VENDOR_FULFILMENT_FAILED:  'The eSIM vendor rejected the order.',
  ESIM_DELIVERY_FAILED:      'eSIM delivery or wallet deployment failed.',
  WALLET_REGISTRATION_FAILED:'Device wallet registration failed.',
};

const createStyles = () => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: Theme.colors.contentBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  iconRow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.destructiveBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: Theme.colors.mutedForeground,
  },
  refBox: {
    backgroundColor: Theme.colors.itemBackground,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  refLabel: {
    fontSize: 11,
    color: Theme.colors.mutedForeground,
    marginBottom: 2,
  },
  refValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    width: '100%',
    opacity: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: Theme.colors.muted,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

const OrderFailureModal: React.FC<OrderFailureModalProps> = ({
  visible,
  orderStatus,
  referenceId,
  manualReviewReason,
  onDismiss,
}) => {
  const { isDark } = useTheme();
  // TODO: Fix the theming engine to deprecate this usage pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => createStyles(), [isDark]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!referenceId) return;
    await Clipboard.setStringAsync(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToOrders = () => {
    onDismiss();
    router.navigate('/(tabs)/orders');
  };

  const reasonText = manualReviewReason ? (REASON_LABELS[manualReviewReason] ?? manualReviewReason) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconRow}>
            <MaterialCommunityIcons name="alert-circle" size={28} color={Theme.colors.destructive} />
          </View>

          <ThemedText bold style={styles.title}>Order Under Review</ThemedText>

          <ThemedText style={styles.body}>
            Your payment was processed but we encountered an issue completing your order.
            {reasonText ? `\n\n${reasonText}` : ''}
            {'\n\n'}Our team has been notified and will resolve this. Please contact support with your reference ID below.
          </ThemedText>

          <ThemedText style={[styles.body, { color: Theme.colors.mutedForeground, fontSize: 12 }]}>
            Status: {labelForStatus(orderStatus)}
          </ThemedText>

          {referenceId ? (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.refBox} onPress={handleCopy} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.refLabel}>Reference ID (tap to copy)</ThemedText>
                  <ThemedText style={styles.refValue} numberOfLines={1}>{referenceId}</ThemedText>
                </View>
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={copied ? Theme.colors.success : Theme.colors.mutedForeground}
                />
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onDismiss}>
              <ThemedText style={styles.buttonText}>Dismiss</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleGoToOrders}>
              <ThemedText style={styles.buttonText}>Go to Orders</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OrderFailureModal;
