import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { labelForStatus } from "@/utils/orderStatus";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";

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
  STRIPE_AMOUNT_MISMATCH:    'The card payment settled for less than the order amount.',
  MOONPAY_STRIPE_DISCREPANCY:'MoonPay confirmed your payment, but the matching invoice was not marked as paid.',
  DEPLOYMENT_STALLED:        'Your device wallet deployment stalled.',
  LAZY_HISTORY_DISAGREEMENT: 'Your purchase history was still updating when the order completed.',
  WEBHOOK_INTENT_MISMATCH:   'A confirmed on-chain payment did not match this order.',
  PAID_ON_CHAIN_VENDOR_FAILED:'Your device wallet payment settled, but the eSIM vendor rejected the order.',
  INVOICE_MARKING_FAILED:    'Your eSIM was delivered, but marking the device wallet invoice as paid failed.',
  PROMOTION_CAPTURE_FAILED:  'Your payment was verified, but applying your code or credit failed. Your order is still being fulfilled.',
};

const UNKNOWN_REASON_LABEL = 'This order needs a manual review.';

const styles = StyleSheet.create({
  status: { fontSize: 12, textAlign: "center", marginTop: 8 },
  refBox: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  refLabel: { fontSize: 11, marginBottom: 2 },
  refValue: { fontSize: 12, fontFamily: "monospace" },
});

const OrderFailureModal: React.FC<OrderFailureModalProps> = ({
  visible,
  orderStatus,
  referenceId,
  manualReviewReason,
  onDismiss,
}) => {
  const colors = useColors();

  const { copied, copy } = useCopyFeedback();
  const handleCopy = () => {
    if (referenceId) copy(referenceId);
  };

  const handleGoToOrders = () => {
    onDismiss();
    router.navigate('/(tabs)/orders');
  };

  const reasonText = manualReviewReason ? (REASON_LABELS[manualReviewReason] ?? UNKNOWN_REASON_LABEL) : null;

  return (
    <ConfirmModal
      visible={visible}
      title="Order Under Review"
      body={
        `Your payment was processed but we encountered an issue completing your order.`
        + (reasonText ? `\n\n${reasonText}` : '')
        + `\n\nOur team has been notified and will resolve this. Please contact support with your reference ID below.`
      }
      secondaryLabel="Dismiss"
      primaryLabel="Go to Orders"
      onSecondary={onDismiss}
      onPrimary={handleGoToOrders}
      onRequestClose={onDismiss}
    >
      <Text style={[styles.status, { color: colors.mutedForeground }]}>
        Status: {labelForStatus(orderStatus)}
      </Text>

      {referenceId ? (
        <TouchableOpacity
          style={[styles.refBox, { backgroundColor: colors.itemBackground }]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.refLabel, { color: colors.mutedForeground }]}>
              Reference ID (tap to copy)
            </ThemedText>
            <ThemedText style={styles.refValue} numberOfLines={1}>{referenceId}</ThemedText>
          </View>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? colors.success : colors.mutedForeground}
          />
        </TouchableOpacity>
      ) : null}
    </ConfirmModal>
  );
};

export default OrderFailureModal;
