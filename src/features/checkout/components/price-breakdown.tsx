import React from "react";
import { ActivityIndicator, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/use-colors";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import type { OrderPricing } from "@/lib/api/bff/order";
import { formatCents } from "@/lib/format";
import { FIAT_MINIMUM_CENTS } from "@/lib/constants/checkout";
import { createStyles } from "../checkout-styles";

export const PriceBreakdown = ({
  isLoading,
  errorMessage,
  quote,
  wasCreditTrimmed,
  isFiatFloorViolated,
}: {
  isLoading: boolean;
  errorMessage: string;
  quote: OrderPricing | undefined;
  wasCreditTrimmed: boolean;
  isFiatFloorViolated: boolean;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <View style={styles.breakdownContainer}>
      {isLoading && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.foreground} />
          <ThemedText style={{ marginLeft: 8, color: colors.mutedForeground, fontSize: 14 }}>
            Calculating your total…
          </ThemedText>
        </View>
      )}
      {!isLoading && !!errorMessage && (
        <ThemedText style={styles.discountErrorText}>{errorMessage}</ThemedText>
      )}
      {!isLoading && quote && (
        <>
          <View style={styles.breakdownRow}>
            <ThemedText>Plan price</ThemedText>
            <ThemedText>{formatCents(quote.listPriceCents)}</ThemedText>
          </View>
          {quote.codeDiscountCents > 0 && (
            <View style={styles.breakdownRow}>
              <ThemedText>{quote.codeKind === 'REFERRAL' ? 'Referral discount' : 'Coupon discount'}</ThemedText>
              <ThemedText>{`-${formatCents(quote.codeDiscountCents)}`}</ThemedText>
            </View>
          )}
          {quote.creditAppliedCents > 0 && (
            <View style={styles.breakdownRow}>
              <ThemedText>Kokio credits</ThemedText>
              <ThemedText>{`-${formatCents(quote.creditAppliedCents)}`}</ThemedText>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
            <ThemedText bold>Amount to pay</ThemedText>
            <ThemedText bold>{formatCents(quote.railAmountCents)}</ThemedText>
          </View>
          {wasCreditTrimmed && (
            <ThemedText style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Credits were reduced so the card payment stays at {formatCents(FIAT_MINIMUM_CENTS)}.
            </ThemedText>
          )}
          {isFiatFloorViolated && (
            <ThemedText style={styles.discountErrorText}>
              The amount to pay by card must be {formatCents(FIAT_MINIMUM_CENTS)} or more.
            </ThemedText>
          )}
        </>
      )}
    </View>
  );
};
