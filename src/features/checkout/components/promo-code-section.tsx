import React from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useColors } from "@/hooks/use-colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import type { CodeLookupResponse } from "@/lib/api/bff/coupon";
import type { OrderPricing } from "@/lib/api/bff/order";
import { formatCents } from "@/lib/format";
import { createStyles } from "../checkout-styles";

const LIGHT_SUCCESS_TEXT = "#1B8A42";

const describeCodeTerms = (lookup: CodeLookupResponse): string => {
  if (lookup.kind === 'REFERRAL' && lookup.referral) {
    return `${lookup.referral.refereePercent}% off, up to ${formatCents(lookup.referral.refereeCapCents)}`;
  }
  const terms = lookup.coupon?.terms;
  if (!terms) return 'Discount applied at checkout';
  if (terms.amountCents != null) return `${formatCents(terms.amountCents)} off`;
  if (terms.percent != null) {
    return terms.maxDiscountCents != null
      ? `${terms.percent}% off, up to ${formatCents(terms.maxDiscountCents)}`
      : `${terms.percent}% off`;
  }
  if (terms.planId != null) return terms.planActive ? 'Free plan voucher' : 'Plan voucher (plan no longer available)';
  return 'Discount applied at checkout';
};

export const PromoCodeSection = ({
  discountCode,
  isDiscountApplied,
  isCouponLoading,
  coupon,
  couponError,
  discountError,
  quoteInPlay,
  onChangeCode,
  onPaste,
  onApply,
  onRemove,
}: {
  discountCode: string;
  isDiscountApplied: boolean;
  isCouponLoading: boolean;
  coupon: CodeLookupResponse | null;
  couponError: string;
  discountError: string;
  quoteInPlay: OrderPricing | undefined;
  onChangeCode: (text: string) => void;
  onPaste: () => void;
  onApply: () => void;
  onRemove: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();

  return (
    <View style={{ marginTop: 16 }}>
      <ThemedText>Promo code</ThemedText>
      {!isDiscountApplied && (
        <View style={styles.promoInputRow}>
          <Ionicons name="pricetag-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.promoInput, !!discountCode && styles.promoInputTyped]}
            value={discountCode}
            onChangeText={onChangeCode}
            placeholder="Coupon or referral code"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            onSubmitEditing={onApply}
            returnKeyType="done"
          />
          {isCouponLoading && <ActivityIndicator size="small" color={colors.mutedForeground} />}
          {!isCouponLoading && !discountCode && (
            <TouchableOpacity
              onPress={onPaste}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Paste code from clipboard"
            >
              <ThemedText bold style={{ color: colors.primary, fontSize: 14 }}>Paste</ThemedText>
            </TouchableOpacity>
          )}
          {!isCouponLoading && !!discountCode && !couponError && (
            <TouchableOpacity
              onPress={onApply}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Apply code"
            >
              <ThemedText bold style={{ color: colors.primary, fontSize: 14 }}>Apply</ThemedText>
            </TouchableOpacity>
          )}
          {!isCouponLoading && !!discountCode && !!couponError && (
            <TouchableOpacity
              onPress={onRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear code"
            >
              <ThemedText bold style={{ color: colors.destructive, fontSize: 14 }}>Clear</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
      {isDiscountApplied && (
        <View style={[styles.promoAppliedCard, { backgroundColor: colors.successBackground }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <View style={styles.promoAppliedCodeRow}>
            <ThemedText style={styles.promoAppliedCode} numberOfLines={1}>{discountCode}</ThemedText>
            <ThemedText
              style={[styles.promoAppliedAmount, { color: isDark ? colors.success : LIGHT_SUCCESS_TEXT }]}
              numberOfLines={1}
            >
              {quoteInPlay && quoteInPlay.codeDiscountCents > 0
                ? `-${formatCents(quoteInPlay.codeDiscountCents)} off`
                : coupon ? describeCodeTerms(coupon) : 'Applied'}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Remove discount"
          >
            <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}
      {!isDiscountApplied && couponError ? (
        <View style={styles.promoStatusRow}>
          <Ionicons name="alert-circle" size={18} color={colors.destructive} />
          <ThemedText style={[styles.promoStatusText, { color: colors.destructive }]} numberOfLines={2}>
            {couponError}
          </ThemedText>
        </View>
      ) : null}
      {discountError ? (
        <View style={styles.promoStatusRow}>
          <Ionicons name="alert-circle" size={18} color={colors.destructive} />
          <ThemedText style={[styles.promoStatusText, { color: colors.destructive }]} numberOfLines={2}>
            {discountError}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
};
