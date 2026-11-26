import { StyleSheet } from "react-native";
import type { Palette } from "@/theme/colors";

export const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 20,
    paddingBottom: 0,
  },
  list: {
    borderRadius: 25,
    maxHeight: "auto",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  menuItem: {
    padding: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  iconLeft: {
    color: colors.icon,
    marginRight: 16,
  },
  iconRight: {
    color: colors.icon,
    marginLeft: 16,
  },
  aboutContainer: {
    borderRadius: 25,
    flex: 1,
    padding: 20,
    paddingBottom: 8,
  },
  closeButton: {
    color: colors.icon,
    paddingTop: 16,
  },
  aboutContent: {
    flex: 1,
  },
  aboutText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    opacity: 0.9,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  linkText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  aboutLink: {
    color: colors.link,
    textDecorationLine: "underline",
    fontSize: 15,
    lineHeight: 24,
  },
  socialsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  socialIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.itemBackground,
  },
  themeSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 12,
  },
  themeModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeModeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  themeModeOptionLabel: {
    fontSize: 12.5,
    fontWeight: "500",
  },
});
