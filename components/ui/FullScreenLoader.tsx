import React from "react";
import { ActivityIndicator, StyleSheet, View, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";

interface FullScreenLoaderProps {
  color?: string;
  containerStyle?: object;
  /** When set, renders an error state (with Retry/Continue actions) instead of the spinner. */
  error?: unknown;
  onRetry?: () => void;
  onContinue?: () => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  continueButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  color,
  containerStyle,
  error,
  onRetry,
  onContinue,
}) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        containerStyle,
      ]}
    >
      {error ? (
        <View style={styles.errorContainer}>
          <ThemedText bold style={styles.errorTitle}>
            Couldn&apos;t start the app
          </ThemedText>
          <ThemedText style={[styles.errorDescription, { color: colors.foreground }]}>
            Check your connection and try again.
          </ThemedText>
          {onRetry && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <ThemedText style={[styles.buttonText, { color: colors.primaryForeground }]}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          )}
          {onContinue && (
            <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
              <ThemedText style={[styles.continueButtonText, { color: colors.primary }]}>
                Continue Anyway
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ActivityIndicator size="large" color={color ?? colors.highlight} />
      )}
    </View>
  );
};

export default FullScreenLoader;
