import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import CountryFlag, { type CoverageType } from "@/components/ui/CountryFlag";
import { useColors } from "@/hooks/use-colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import type { ESimDocument } from "@/lib/api/bff/esim";
import { formatBffError } from "@/lib/api/bff/client";
import { esimDisplayName, esimDocToDisplayItem } from "@/features/esim/esim-display";
import { createStyles } from "../checkout-styles";

type EsimMatch = { eSimRef: string; iccid?: string };

// Shows the top-up compatibility check and, when a match exists, the row that
// opens the picker for which eSIM to top up.
export const TopupSection = ({
  isChecking,
  isError,
  error,
  onRetry,
  isCompatible,
  hasCheckErrors,
  vendorMismatches,
  esims,
  buildTopupEsimLabel,
  applyAsTopup,
  compatibleTopUpEsimRef,
  selectedTopupDoc,
  onOpenPicker,
}: {
  isChecking: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  isCompatible: boolean;
  hasCheckErrors: boolean;
  vendorMismatches: EsimMatch[];
  esims: ESimDocument[];
  buildTopupEsimLabel: (eSimRef: string, iccid?: string) => string;
  applyAsTopup: boolean;
  compatibleTopUpEsimRef: string | undefined;
  selectedTopupDoc: ESimDocument | undefined;
  onOpenPicker: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();

  return (
    <>
      {isChecking && (
        <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
          <ActivityIndicator size="small" color={isDark ? colors.foreground : colors.text} />
          <ThemedText style={{ marginLeft: 8, color: isDark ? colors.mutedForeground : colors.text }}>
            Checking top-up compatibility…
          </ThemedText>
        </View>
      )}
      {!isChecking && isError && (
        <View style={styles.discountErrorContainer}>
          <ThemedText style={styles.discountErrorText}>{formatBffError(error)}</ThemedText>
          <TouchableOpacity onPress={onRetry} accessibilityRole="button">
            <ThemedText style={[styles.discountErrorText, { textDecorationLine: 'underline' }]}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      {!isChecking && !isError && !isCompatible && hasCheckErrors && (
        <View style={styles.discountErrorContainer}>
          <ThemedText style={styles.discountErrorText}>
            Couldn&apos;t verify top-up compatibility for your existing eSIM. Please try again.
          </ThemedText>
          <TouchableOpacity onPress={onRetry} accessibilityRole="button">
            <ThemedText style={[styles.discountErrorText, { textDecorationLine: 'underline' }]}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      {!isChecking && !isError && !isCompatible && !hasCheckErrors && vendorMismatches.length > 0 && (
        <View style={styles.discountErrorContainer}>
          <ThemedText style={styles.discountErrorText}>
            {(() => {
              const names = vendorMismatches.map((r) => {
                const doc = esims.find((e) => e.eSimRef === r.eSimRef);
                return doc ? esimDisplayName(doc) : buildTopupEsimLabel(r.eSimRef, r.iccid);
              });
              const isPlural = names.length > 1;
              return `Your existing ${isPlural ? "eSIMs" : "eSIM"} ${names.join(", ")} ${isPlural ? "aren't" : "isn't"} compatible with this plan for top-up. The purchase will be a new eSIM.`;
            })()}
          </ThemedText>
        </View>
      )}
      {!isChecking && isCompatible && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: isDark ? colors.foreground : colors.text, fontSize: 13 }} numberOfLines={1}>
            <ThemedText style={{ fontSize: 13 }} bold>Top Up: </ThemedText>
            Apply this plan as top up, else disable to buy a new one
          </Text>
          <TouchableOpacity
            onPress={onOpenPicker}
            style={[
              styles.topupOptionRow,
              { backgroundColor: applyAsTopup ? colors.primary : colors.inputBackground },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              applyAsTopup && compatibleTopUpEsimRef
                ? `Change top-up eSIM, currently ${buildTopupEsimLabel(compatibleTopUpEsimRef)}`
                : "Choose an eSIM to top up"
            }
          >
            {applyAsTopup && selectedTopupDoc && (() => {
              const display = esimDocToDisplayItem(selectedTopupDoc);
              return (
                <CountryFlag
                  size={24}
                  flagUrl={display.serviceRegionFlag ?? ""}
                  coverageType={display.coverageType as CoverageType}
                  serviceRegionName={display.serviceRegionName}
                />
              );
            })()}
            <ThemedText
              style={[
                styles.topupOptionText,
                { color: applyAsTopup ? colors.primaryForeground : colors.foreground },
              ]}
              numberOfLines={1}
            >
              {applyAsTopup && compatibleTopUpEsimRef ? buildTopupEsimLabel(compatibleTopUpEsimRef) : "Buy a new eSIM"}
            </ThemedText>
            <Ionicons
              name="chevron-down"
              size={16}
              color={applyAsTopup ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};
