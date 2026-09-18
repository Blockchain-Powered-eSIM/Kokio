import React from "react";
import { View, Image } from "react-native";

// Kokio's own brand colors, not arbitrary RGB - "random" here means each
// contact gets a different one of these, not a truly random hex value that
// could clash with the app's palette.
export const AVATAR_PALETTE_KEYS = [
  "primary",
  "walletAccent",
  "shopCta",
  "goldenYellow",
  "secondary",
  "highlight",
  "info",
  "link",
  "success",
  "pink",
  "systemBlue",
  "warning",
  "destructive",
] as const;

export type AvatarColorKey = (typeof AVATAR_PALETTE_KEYS)[number];

// Fixed hex values, independent of the light/dark theme tokens (those flip
// hue between themes, e.g. `primary` is teal in light mode but orange in
// dark) - a contact's avatar color must stay the same color when the user
// switches theme, so it can't be sourced from the reactive theme palette.
const AVATAR_COLORS: Record<AvatarColorKey, string> = {
  primary: "#2A8FA0",
  walletAccent: "#FFCC00",
  shopCta: "#FF9500",
  goldenYellow: "#00C7BE",
  secondary: "#E8614A",
  highlight: "#AF52DE",
  info: "#64D2FF",
  link: "#007AFF",
  success: "#34C759",
  pink: "#FF2D55",
  systemBlue: "#5856D6",
  warning: "#A2845E",
  destructive: "#FF3B30",
};

function isAvatarColorKey(value: string): value is AvatarColorKey {
  return (AVATAR_PALETTE_KEYS as readonly string[]).includes(value);
}

function hashToIndex(key: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

/**
 * Picks a color key guaranteed not to render the same as any existing
 * contact's assigned color. `AVATAR_COLORS` entries are already all
 * distinct, so this only falls back to a pseudo-random pick once every key
 * is taken.
 */
export function pickUniqueAvatarColorKey(
  existingContacts: { avatarColorKey?: string }[],
): AvatarColorKey {
  const usedKeys = new Set(
    existingContacts
      .map((c) => c.avatarColorKey)
      .filter((key): key is AvatarColorKey => !!key && isAvatarColorKey(key)),
  );
  const available = AVATAR_PALETTE_KEYS.find((key) => !usedKeys.has(key));
  if (available) return available;
  return AVATAR_PALETTE_KEYS[Math.floor(Math.random() * AVATAR_PALETTE_KEYS.length)];
}

interface ContactAvatarProps {
  /** Stable per-contact key (contact id, or the alias itself) used only when no `colorKey` is stored - covers contacts created before color assignment existed. */
  seed: string;
  /** The contact's actually-assigned color (from `pickUniqueAvatarColorKey`, stored on the contact record). Preferred over `seed` whenever available. */
  colorKey?: string;
  alias: string;
  size?: number;
}

/**
 * A contact's visual identity now that contacts have no picture: the Kokio
 * mark on a colored circle, instead of an uploaded photo.
 */
export function ContactAvatar({ seed, colorKey, alias, size = 42 }: ContactAvatarProps) {
  const resolvedKey =
    colorKey && isAvatarColorKey(colorKey)
      ? colorKey
      : AVATAR_PALETTE_KEYS[hashToIndex(seed || alias || "?", AVATAR_PALETTE_KEYS.length)];
  const backgroundColor = AVATAR_COLORS[resolvedKey];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        borderWidth: 2,
        borderColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={require("@/assets/images/logo.png")}
        style={{ width: size * 0.55, height: size * 0.52 }}
        resizeMode="contain"
      />
    </View>
  );
}

export default ContactAvatar;
