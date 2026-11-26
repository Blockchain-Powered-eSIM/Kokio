import { StyleSheet } from "react-native";
import type { Palette } from "@/theme/colors";

// Shared by the orders screen and its cards.
export const createStyles = (colors: Palette) => StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      paddingTop: 10,
      paddingBottom: 0,
    },
    orderCardWrapper: {
      marginBottom: 4,
    },
    orderMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    orderStatusBadge: {
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    orderStatusText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    emptyText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
      opacity: 0.9,
      textAlign: "center",
      marginTop: 32,
    },
    refreshHint: {
      color: colors.inactive,
      fontSize: 12,
      textAlign: "center",
      marginTop: 24,
      marginBottom: 12,
    },
    detailSection: {
      borderRadius: 12,
      marginHorizontal: 4,
      marginTop: 2,
      marginBottom: 8,
      padding: 14,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    summaryLabel: {
      fontSize: 13,
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: "600",
    },
    usageBarTrack: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: -2,
      marginBottom: 6,
    },
    usageBarFill: {
      height: 8,
      borderRadius: 4,
    },
    actionRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    walletBtn: {
      position: "absolute",
      right: 14,
      bottom: 14,
      width: 46,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtn: {
      width: "48%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    installBtnText: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
    },
    detailsBtnText: {
      fontSize: 14,
      fontWeight: "500",
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginHorizontal: 4,
      marginTop: 4,
      marginBottom: 8,
    },
    pendingCard: {
      borderRadius: 12,
      marginHorizontal: 4,
      marginBottom: 10,
      padding: 14,
    },
    pendingHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    pendingLabel: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 2,
    },
    pendingMeta: {
      fontSize: 12,
    },
    pendingBadge: {
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    pendingBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    pendingHint: {
      marginTop: 10,
      gap: 2,
    },
    pendingHintText: {
      fontSize: 12,
      lineHeight: 17,
    },
    pendingActionsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    pendingActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    pendingActionText: {
      fontSize: 13,
      fontWeight: "500",
    },
  });
