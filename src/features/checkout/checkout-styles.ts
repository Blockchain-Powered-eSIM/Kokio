import { Dimensions, StyleSheet } from "react-native";
import type { Palette } from "@/theme/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const RADIO_WIDTH = SCREEN_WIDTH - 24;

export const createStyles = (colors: Palette) => StyleSheet.create({
  container:              { flex: 1 },
  scrollContent:          { flex: 1, paddingHorizontal: 12 },
  scrollContentContainer: { paddingBottom: 20 },
  checkoutButton: {
    borderRadius: 32, paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
  },
  checkoutButtonText: { fontSize: 16, fontWeight: "600" },
  logoImage:          { width: 24, height: 24, objectFit: "contain" },
  containerStyle:     { flex: 1, alignItems: "flex-start" },
  buttonStyle: {
    flexDirection: "row", justifyContent: "space-between", width: RADIO_WIDTH,
    backgroundColor: colors.inputBackground, paddingVertical: 16, paddingHorizontal: 24,
    marginHorizontal: 0, marginVertical: 2, borderRadius: 12, borderWidth: 1,
  },
  selectedPaymentRow:      { marginTop: 12, alignItems: "center", paddingRight: 16 },
  changePaymentMethodButton: {
    marginLeft: 8, width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  promoInputRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    backgroundColor: colors.inputBackground, borderRadius: 12, paddingHorizontal: 12,
  },
  promoInput: { flex: 1, color: colors.foreground, fontSize: 16, paddingVertical: 10 },
  promoInputTyped: { fontFamily: "monospace", fontWeight: "700" },
  promoStatusRow:          { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  promoStatusText:         { flex: 1, fontSize: 13 },
  promoAppliedCard: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12,
    padding: 12, borderRadius: 12,
  },
  promoAppliedCodeRow:     { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  promoAppliedCode:        { fontSize: 14, fontWeight: "700", fontFamily: "monospace" },
  promoAppliedAmount:      { fontSize: 13, fontWeight: "600" },
  topupOptionRow: {
    flexDirection: "row", alignItems: "center", gap: 10, width: "100%",
    marginTop: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
  },
  topupOptionText:         { fontSize: 14, fontWeight: "600", flex: 1 },
  discountErrorContainer:  { marginTop: 8, padding: 12, backgroundColor: colors.destructiveBackground, borderRadius: 8 },
  discountErrorText:       { color: colors.destructive, fontSize: 14 },
  externalWalletNoticeContainer: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 2,
  },
  externalWalletNoticeText: { fontSize: 12, flexShrink: 1 },
  breakdownContainer:      { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: colors.inputBackground, gap: 6 },
  breakdownRow:            { flexDirection: "row", justifyContent: "space-between" },
  breakdownTotalRow:       { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  loadingOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', gap: 16, zIndex: 10,
  },
  loadingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});
