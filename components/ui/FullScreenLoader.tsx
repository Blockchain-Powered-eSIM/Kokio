import React from "react";
import { ActivityIndicator, StyleSheet, View, TouchableOpacity } from "react-native";
import { Theme } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";

interface FullScreenLoaderProps {
  color?: string;
  containerStyle?: object;
  /** When set, renders an error state (with Retry/Continue actions) instead of the spinner. */
  error?: unknown;
  onRetry?: () => void;
  onContinue?: () => void;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  color,
  containerStyle,
  error,
  onRetry,
  onContinue,
}) => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: Theme.colors.background },
        containerStyle,
      ]}
    >
      {error ? (
        <View style={styles.errorContainer}>
          <ThemedText bold style={styles.errorTitle}>
            Couldn&apos;t start the app
          </ThemedText>
          <ThemedText style={[styles.errorDescription, { color: Theme.colors.foreground }]}>
            Check your connection and try again.
          </ThemedText>
          {onRetry && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Theme.colors.primary }]}
              onPress={onRetry}
            >
              <ThemedText style={[styles.buttonText, { color: Theme.colors.primaryForeground }]}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          )}
          {onContinue && (
            <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
              <ThemedText style={[styles.continueButtonText, { color: Theme.colors.primary }]}>
                Continue Anyway
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ActivityIndicator size="large" color={color ?? Theme.colors.highlight} />
      )}
    </View>
  );
};

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

export default FullScreenLoader;
