import { StyleSheet } from "react-native";
import type { Palette } from "@/theme/colors";

export const createStyles = (colors: Palette) =>
  StyleSheet.create({
    kokioImage: {
      height: 60,
      marginTop: 10,
      resizeMode: "contain",
    },
    authRequiredText: {
      fontSize: 24,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      marginTop: 32,
      paddingTop: 12,
    },
    authSubtext: {
      fontSize: 13,
      marginTop: 12,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      textAlign: "center",
    },
    deletedBody: {
      fontSize: 13,
      marginTop: 12,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      textAlign: "center",
      paddingHorizontal: 12,
      lineHeight: 19,
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    loadingImage: {
      height: 80,
      marginTop: 24,
      marginBottom: 5,
      resizeMode: "contain",
    },
    loadingText: {
      fontSize: 13,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
    },
    cancelText: {
      fontSize: 16,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
    },
    errorText: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: "Lexend-Light",
      textAlign: "center",
      marginTop: 12,
      paddingHorizontal: 24,
    },
    buttonRow: {
      width: "100%",
      marginTop: 32,
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
    },
    loginButtonRow: {
      width: "100%",
      marginTop: 32,
      alignItems: "center",
    },
    loginButton: {
      width: "55%",
      minWidth: 180,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.highlight,
    },
    primaryButton: {
      flex: 1,
      maxWidth: 160,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.highlight,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "Lexend-Light",
      color: "#000000",
    },
    secondaryButton: {
      flex: 1,
      maxWidth: 160,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.foreground,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      color: colors.foreground,
    },
  });
