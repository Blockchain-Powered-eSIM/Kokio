import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, View, Platform, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { RadioButtonProps, RadioGroup } from "react-native-radio-buttons-group";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as WebBrowser from "expo-web-browser";
import { MoonpayCommerceProvider } from "@heliofi/checkout-react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/contexts/ThemeContext";
import { useKokio } from "@/hooks/useKokio";
import { useCreditBalance, heldCreditCents } from "@/hooks/useCreditHistory";
import { ThemedText } from "@/components/ThemedText";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import { Esim } from "@/components/ESIMItem";
import { TokenPickerSheet } from "@/components/wallet/sheets/TokenPickerSheet";
import type { CreateOrderRequest } from "@/lib/api/bff/order";
import { formatBffError } from "@/lib/api/bff/client";
import { RADIO_KEYS } from "@/lib/constants/app";
import { FIAT_MINIMUM_CENTS } from "@/lib/constants/checkout";
import { logger } from "@/lib/logger";
import { createStyles } from "./checkout-styles";
import { getEsimOrderPayload } from "./esim-order";
import { createRadioButtons } from "./payment-options";
import { useOrderPreview } from "./use-order-preview";
import { usePromoCode } from "./use-promo-code";
import { usePaymentMethod } from "./use-payment-method";
import { useTopupSelection } from "./use-topup-selection";
import type { TopupSelection } from "./use-topup-selection";
import { useCheckoutSubmit } from "./use-checkout-submit";
import UseCreditBalanceToggle from "./components/credit-balance-toggle";
import OrderFailureModal from "./components/order-failure-modal";
import CheckoutSuccessModal from "./components/checkout-success-modal";
import WalletSetupModal from "./components/wallet-setup-modal";
import { EsimTopupPickerSheet } from "./components/esim-topup-picker-sheet";
import { ApplyTopupConfirmModal } from "./components/apply-topup-confirm-modal";
import { ExternalWalletCheckout } from "./components/external-wallet-checkout";
import { PromoCodeSection } from "./components/promo-code-section";
import { PriceBreakdown } from "./components/price-breakdown";
import { TopupSection } from "./components/topup-section";

const toApiPaymentMethod = (selected: string | undefined): CreateOrderRequest['paymentMethod'] =>
  selected === RADIO_KEYS.E_SIM_WALLET
    ? 'DEVICE_WALLET'
    : (selected === RADIO_KEYS.CREDIT_CARD || selected === RADIO_KEYS.APPLE_PAY)
      ? 'FIAT'
      : 'CRYPTO';

const Checkout = () => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const bg = useThemeColor({}, "background");
  const { item: eSimDetails } = useLocalSearchParams();

  const eSimItem: Esim = React.useMemo(() => {
    if (typeof eSimDetails === "string") {
      try { return JSON.parse(eSimDetails); } catch { return null; }
    }
    return eSimDetails;
  }, [eSimDetails]);

  const { kokio }                         = useKokio();
  const [isESimEnabled, setIsESimEnabled] = useState<boolean>(false);
  const [useStoreCredit, setUseStoreCredit] = useState<boolean>(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const markOrderCompleted = useCallback(() => setOrderCompleted(true), []);

  const promo   = usePromoCode();
  // Refs are pulled out on their own so the lint rule does not treat every
  // other field of the result as a ref read during render.
  const { deviceWalletTokenSheetRef, ...payment } = usePaymentMethod();
  const { topupPickerSheetRef, ...topup } = useTopupSelection(eSimItem?.catalogueId, orderCompleted);
  const { selectedPaymentMethod, deviceWalletAsset } = payment;
  const { applyAsTopup, compatibleTopUpEsimRef } = topup;

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle, colors, deviceWalletAsset, payment.openDeviceWalletTokenPicker),
    // All missing dependencies are of style attributes which are in their on useMemo() call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPaymentMethod, colors, deviceWalletAsset],
  );
  const selectedRadioButton = radioButtons.find((button) => button.id === selectedPaymentMethod);
  const showAllPaymentMethods = !selectedPaymentMethod || payment.isPaymentMethodExpanded;

  const { data: creditBalance, isLoading: isCreditLoading, refetch: refetchCredit } = useCreditBalance();
  const availableCreditCents = creditBalance?.availableCents ?? 0;
  const heldCreditCentsValue = creditBalance ? heldCreditCents(creditBalance) : 0;
  const storeCreditActive    = useStoreCredit && availableCreditCents > 0;

  const appliedCode = promo.appliedCode;
  const isPreviewInPlay = !!selectedPaymentMethod && (!!appliedCode || storeCreditActive);

  const buildOrderRequest = useCallback(
    (selection: TopupSelection): CreateOrderRequest => {
      const paymentMethod = toApiPaymentMethod(selectedPaymentMethod);
      return {
        ...getEsimOrderPayload({
          eSimItem, appliedCode, useStoreCredit: storeCreditActive,
          applyAsTopup: selection.applyAsTopup,
          compatibleTopUpEsimRef: selection.compatibleTopUpEsimRef,
        }),
        paymentMethod,
        ...(paymentMethod === 'DEVICE_WALLET' ? { asset: deviceWalletAsset } : {}),
      };
    },
    [selectedPaymentMethod, eSimItem, appliedCode, storeCreditActive, deviceWalletAsset],
  );

  const previewRequest = useMemo(
    () => (isPreviewInPlay ? buildOrderRequest({ applyAsTopup, compatibleTopUpEsimRef }) : null),
    [isPreviewInPlay, buildOrderRequest, applyAsTopup, compatibleTopUpEsimRef],
  );
  const {
    pricing: quote, error: previewError, isLoading: isPreviewLoading, refresh: refreshPreview,
  } = useOrderPreview(previewRequest);

  const submit = useCheckoutSubmit({
    eSimItem,
    selectedPaymentMethod,
    applyAsTopup,
    compatibleTopUpEsimRef,
    buildOrderRequest,
    buildTopupEsimLabel: topup.buildTopupEsimLabel,
    onOrderCompleted: markOrderCompleted,
    onCodeRejected: promo.rejectCode,
    refetchCredit,
    refreshPreview,
  });
  const { handleCheckout, isCheckoutLoading } = submit;

  const quoteInPlay = isPreviewInPlay ? quote : undefined;
  const payableUsd = quoteInPlay ? quoteInPlay.railAmountCents / 100 : eSimItem.actualSellingPrice;
  const payLabel: string | number = quoteInPlay
    ? payableUsd.toFixed(2)
    : isPreviewInPlay
      ? '...'
      : eSimItem.actualSellingPrice;
  const isFiatFloorViolated =
    !!quoteInPlay &&
    toApiPaymentMethod(selectedPaymentMethod) === 'FIAT' &&
    quoteInPlay.railAmountCents > 0 &&
    quoteInPlay.railAmountCents < FIAT_MINIMUM_CENTS;
  const wasCreditTrimmed =
    !!quoteInPlay &&
    storeCreditActive &&
    quoteInPlay.creditAppliedCents <
      Math.min(availableCreditCents, quoteInPlay.listPriceCents - quoteInPlay.codeDiscountCents);
  const previewErrorMessage = isPreviewInPlay && previewError ? formatBffError(previewError) : '';

  const deviceWalletCharge = payableUsd;
  const deviceWalletBalance = payment.deviceWalletBalance;
  const deviceWalletBalanceNumber = deviceWalletBalance === undefined ? NaN : parseFloat(deviceWalletBalance);
  const isDeviceWalletSelected = selectedPaymentMethod === RADIO_KEYS.E_SIM_WALLET;
  const hasDeviceWalletFunds =
    Number.isFinite(deviceWalletBalanceNumber) && deviceWalletBalanceNumber >= deviceWalletCharge;
  const isDeviceWalletShort =
    isDeviceWalletSelected && Number.isFinite(deviceWalletBalanceNumber) && !hasDeviceWalletFunds;

  const canCheckout = useMemo(
    () =>
      isESimEnabled &&
      !isCheckoutLoading &&
      !!selectedPaymentMethod &&
      (!isDeviceWalletSelected || hasDeviceWalletFunds) &&
      (!isPreviewInPlay || (!!quote && !isPreviewLoading && !previewError && !isFiatFloorViolated)),
    [
      isESimEnabled, isCheckoutLoading, selectedPaymentMethod, isDeviceWalletSelected, hasDeviceWalletFunds,
      isPreviewInPlay, quote, isPreviewLoading, previewError, isFiatFloorViolated,
    ],
  );

  const { setShowTopupConfirm, clearSelection } = topup;
  const handleCheckoutPress = useCallback(() => {
    if (applyAsTopup && compatibleTopUpEsimRef) {
      setShowTopupConfirm(true);
      return;
    }
    handleCheckout();
  }, [applyAsTopup, compatibleTopUpEsimRef, handleCheckout, setShowTopupConfirm]);

  const confirmTopupAndCheckout = useCallback(() => {
    setShowTopupConfirm(false);
    handleCheckout();
  }, [handleCheckout, setShowTopupConfirm]);

  const buyNewInsteadOfTopup = useCallback(() => {
    setShowTopupConfirm(false);
    clearSelection();
    handleCheckout({ applyAsTopup: false });
  }, [handleCheckout, setShowTopupConfirm, clearSelection]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAwareScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="always"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 0}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 16 }}>
          <ThemedText>Payment Method</ThemedText>
          {showAllPaymentMethods ? (
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <RadioGroup
                radioButtons={radioButtons}
                onPress={payment.selectPaymentMethod}
                selectedId={selectedPaymentMethod}
                containerStyle={styles.containerStyle}
              />
            </View>
          ) : (
            <View style={[styles.buttonStyle, styles.selectedPaymentRow, { borderColor: colors.primary, borderWidth: 2 }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1, flexShrink: 1 }}>{selectedRadioButton?.label}</View>
              <TouchableOpacity
                onPress={payment.expandPaymentMethods}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change payment method"
                style={[styles.changePaymentMethodButton, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="chevron-down" size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {selectedPaymentMethod === RADIO_KEYS.EXTERNAL_WALLET_BROWSER && (
          <View style={styles.externalWalletNoticeContainer}>
            <Ionicons name="information-circle-outline" size={14} color={isDark ? colors.mutedForeground : colors.text} />
            <ThemedText
              lightColor={colors.text}
              darkColor={colors.mutedForeground}
              style={styles.externalWalletNoticeText}
            >
              Select a network, pay by any wallet and keep a little extra for network fees, payable in the same token
            </ThemedText>
          </View>
        )}

        {isDeviceWalletShort && (
          <View style={styles.discountErrorContainer}>
            <ThemedText style={styles.discountErrorText}>
              {`Not enough ${deviceWalletAsset} in Kokio Wallet to cover this order.`}
            </ThemedText>
          </View>
        )}

        <PromoCodeSection
          discountCode={promo.discountCode}
          isDiscountApplied={promo.isDiscountApplied}
          isCouponLoading={promo.isCouponLoading}
          coupon={promo.coupon}
          couponError={promo.couponError}
          discountError={promo.discountError}
          quoteInPlay={quoteInPlay}
          onChangeCode={promo.changeCode}
          onPaste={promo.paste}
          onApply={promo.apply}
          onRemove={promo.remove}
        />

        {isPreviewInPlay && (
          <PriceBreakdown
            isLoading={isPreviewLoading}
            errorMessage={previewErrorMessage}
            quote={quoteInPlay}
            wasCreditTrimmed={wasCreditTrimmed}
            isFiatFloorViolated={isFiatFloorViolated}
          />
        )}

        <TopupSection
          isChecking={topup.isCheckingTopup}
          isError={topup.isTopupCheckError}
          error={topup.topupCheckError}
          onRetry={() => topup.refetchTopupCompatibility()}
          isCompatible={topup.isTopupCompatible}
          hasCheckErrors={topup.checkErrors.length > 0}
          vendorMismatches={topup.vendorMismatches}
          esims={topup.esims}
          buildTopupEsimLabel={topup.buildTopupEsimLabel}
          applyAsTopup={applyAsTopup}
          compatibleTopUpEsimRef={compatibleTopUpEsimRef}
          selectedTopupDoc={topup.selectedTopupDoc}
          onOpenPicker={topup.openPicker}
        />
      </KeyboardAwareScrollView>

      <BottomActionBar>
        <UseCreditBalanceToggle
          value={storeCreditActive}
          onValueChange={setUseStoreCredit}
          availableCents={availableCreditCents}
          heldCents={heldCreditCentsValue}
          loading={isCreditLoading}
        />
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Checkbox onChange={setIsESimEnabled} checked={isESimEnabled} />
          <Text style={{ color: isDark ? colors.foreground : colors.text, marginLeft: 8, flex: 1 }}>
            I confirm my device is eSIM compatible and network-enabled.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                await WebBrowser.openBrowserAsync(
                  "https://kokio.app/blogs/esim-guide-for-travellers-2026#does-your-phone-support-esim",
                );
              } catch (error) {
                logger.error('BROWSER_OPEN_FAILED', { error });
              }
            }}
            hitSlop={8}
            style={{ marginLeft: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Learn more about eSIM compatibility"
          >
            <Ionicons name="bulb-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          key={`total-checkout-${canCheckout}`}
          style={!canCheckout && { opacity: 0.5 }}
          onPress={canCheckout ? handleCheckoutPress : undefined}
          disabled={!canCheckout}
          accessibilityRole="button"
          accessibilityLabel={`Pay ${payLabel} USD`}
          accessibilityState={{ disabled: !canCheckout }}
        >
          <DetailItem
            prefix="Pay "
            value={payLabel}
            suffix="USD"
            containerStyles={[styles.checkoutButton, { backgroundColor: colors.payButton }]}
          />
        </TouchableOpacity>
      </BottomActionBar>

      {isCheckoutLoading && !!submit.loadingMessage && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{submit.loadingMessage}</Text>
        </View>
      )}

      <CheckoutSuccessModal
        visible={submit.showSuccessModal}
        loading={isCheckoutLoading}
        variant={submit.topupSuccessInfo ? "topup" : "install"}
        onInstallESIM={submit.handleInstallESIM}
        onDone={submit.handleTopupDone}
        topupFromLabel={submit.topupSuccessInfo?.fromLabel}
        topupToLabel={submit.topupSuccessInfo?.toLabel}
      />

      <OrderFailureModal
        visible={submit.showManualReviewModal}
        orderStatus={submit.failedOrderInfo?.orderStatus ?? ''}
        referenceId={submit.failedOrderInfo?.referenceId ?? null}
        manualReviewReason={submit.failedOrderInfo?.manualReviewReason}
        onDismiss={submit.dismissManualReview}
      />

      <WalletSetupModal
        visible={payment.showWalletSetupModal}
        onClose={payment.closeWalletSetup}
        onContinue={payment.continueWalletSetup}
      />

      <TokenPickerSheet
        ref={deviceWalletTokenSheetRef}
        tokens={payment.deviceWalletPickerTokens}
        selectedSymbol={deviceWalletAsset}
        onSelect={payment.selectDeviceWalletAsset}
      />

      <EsimTopupPickerSheet
        ref={topupPickerSheetRef}
        items={topup.topupPickerItems}
        selectedEsimRef={applyAsTopup ? compatibleTopUpEsimRef : undefined}
        onSelect={topup.selectEsim}
        onBuyNew={topup.buyNew}
      />

      <ApplyTopupConfirmModal
        visible={topup.showTopupConfirm}
        esimLabel={compatibleTopUpEsimRef ? topup.buildTopupEsimLabel(compatibleTopUpEsimRef) : "your eSIM"}
        onConfirm={confirmTopupAndCheckout}
        onBuyNew={buyNewInsteadOfTopup}
      />

      {submit.helioChargeToken && (
        <MoonpayCommerceProvider
          chargeToken={submit.helioChargeToken}
          network={__DEV__ ? "test" : "main"}
          theme="dark"
        >
          <ExternalWalletCheckout
            correlationId={submit.helioCorrelationId}
            pendingOrder={submit.pendingHelioOrder}
            eSimItem={eSimItem}
            kokioDeviceUID={kokio.deviceUID}
            setIsCheckoutLoading={submit.setIsCheckoutLoading}
            setLoadingMessage={submit.setLoadingMessage}
            onComplete={submit.handleHelioComplete}
            onSdkDismiss={submit.resetHelioState}
          />
        </MoonpayCommerceProvider>
      )}
    </View>
  );
};

export default Checkout;
