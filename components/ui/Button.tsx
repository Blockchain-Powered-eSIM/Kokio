import { Theme } from "@/constants/Colors";
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { logger } from '@/utils/logger';

type PrimaryButtonProps = {
  children: React.ReactNode;
};

const createStyles = () => StyleSheet.create({
  buttonOuterContainer: {
    borderRadius: 40,
    margin: 4,
    overflow: "hidden",
  },
  buttonInnerContainer: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  buttonText: {
    color: Theme.colors.cardForeground,
    fontSize: 16,
    fontWeight: 300,
    textAlign: "center",
  },
});

function Button({ children }: PrimaryButtonProps) {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  function pressHandler() {
    logger.debug('BUTTON_PRESSED');
  }
  return (
    <View style={styles.buttonOuterContainer}>
      <Pressable
        style={styles.buttonInnerContainer}
        onPress={pressHandler}
        android_ripple={{ color: Theme.colors.primaryForeground }}
      >
        <Text style={styles.buttonText}>{children}</Text>
      </Pressable>
    </View>
  );
}


export default Button;
