import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";

const createStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayMedium,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "Lexend-SemiBold",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    color: colors.foreground,
    fontFamily: "Lexend-Light",
    textAlign: "center",
    lineHeight: 20,
  },
  operation: {
    fontSize: 13,
    color: colors.highlight,
    fontFamily: "Lexend",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  error: {
    fontSize: 13,
    color: colors.destructive,
    fontFamily: "Lexend-Light",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.muted,
    marginTop: 4,
  },
  loadingText: {
    color: colors.foreground,
    fontSize: 14,
    fontFamily: "Lexend-Light",
  },
  buttonRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.muted,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.muted,
  },
  cancelText: {
    color: colors.foreground,
    fontSize: 16,
    fontFamily: "Lexend-Light",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmText: {
    color: colors.highlight,
    fontSize: 16,
    fontFamily: "Lexend-SemiBold",
  },
});

const OPERATION_LABELS: Record<string, string> = {
  'POST /v1/order':          'Place Order',
  'POST /v1/topup':          'Top Up Wallet',
  'POST /v1/wallet':         'Set Up Wallet',
  'GET /v1/wallet':          'Access Wallet',
  'POST /v1/esim':           'Activate eSIM',
  'POST /v1/auth/stepup':    'Confirm Identity',
};

function friendlyOperation(raw: string | undefined): string {
  if (!raw) return 'this action';
  if (OPERATION_LABELS[raw]) return OPERATION_LABELS[raw];
  const path = raw.split(' ')[1] ?? '';
  if (path.includes('/order'))  return 'Place Order';
  if (path.includes('/topup'))  return 'Top Up Wallet';
  if (path.includes('/wallet')) return 'Wallet Access';
  if (path.includes('/esim'))   return 'Activate eSIM';
  return 'this action';
}

export function StepUpPromptModal() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { stepUpVisible, stepUpHint, stepUpError, stepUp, dismissStepUp } =
    useAuthRelay();
  const [loading, setLoading] = useState(false);

  const biometricLabel =
    Platform.OS === "ios" ? "Face ID" : "Fingerprint";

  const operationLabel = friendlyOperation(stepUpHint?.operationName);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await stepUp();
    } finally {
      setLoading(false);
    }
  }, [stepUp]);

  const handleCancel = useCallback(() => {
    setLoading(false);
    dismissStepUp();
  }, [dismissStepUp]);

  return (
    <Modal
      visible={stepUpVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm Identity</Text>

          <Text style={styles.body}>
            Confirm with {biometricLabel} to continue with:
          </Text>
          <Text style={styles.operation} numberOfLines={1}>
            {operationLabel}
          </Text>

          {!!stepUpError && !loading && (
            <Text style={styles.error}>{stepUpError}</Text>
          )}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.highlight} />
              <Text style={styles.loadingText}>Confirming…</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={handleCancel}
                accessibilityLabel="Cancel identity confirmation"
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmBtn}
                onPress={handleConfirm}
                accessibilityLabel={`Confirm with ${biometricLabel}`}
                accessibilityRole="button"
              >
                <Text style={styles.confirmText}>
                  {stepUpError ? "Retry" : "Confirm"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

