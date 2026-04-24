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

export function StepUpPromptModal() {
  const { stepUpVisible, stepUpHint, stepUpError, stepUp, dismissStepUp } =
    useAuthRelay();
  const [loading, setLoading] = useState(false);

  const biometricLabel =
    Platform.OS === "ios" ? "Face ID" : "Fingerprint";

  const operationLabel = stepUpHint?.operationName ?? "this action";

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
              <ActivityIndicator color="#FFCC00" />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#242427",
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Lexend-SemiBold",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    color: "#AEAEB2",
    fontFamily: "Lexend-Light",
    textAlign: "center",
    lineHeight: 20,
  },
  operation: {
    fontSize: 13,
    color: "#FFCC00",
    fontFamily: "Lexend",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  error: {
    fontSize: 13,
    color: "#FF3B30",
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
    borderTopColor: "#48484A",
    marginTop: 4,
  },
  loadingText: {
    color: "#AEAEB2",
    fontSize: 14,
    fontFamily: "Lexend-Light",
  },
  buttonRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#48484A",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#48484A",
  },
  cancelText: {
    color: "#AEAEB2",
    fontSize: 16,
    fontFamily: "Lexend-Light",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmText: {
    color: "#FFCC00",
    fontSize: 16,
    fontFamily: "Lexend-SemiBold",
  },
});
