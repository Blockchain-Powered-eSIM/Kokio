import { Theme } from "@/constants/Colors";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

type PrimaryButtonProps = {
  children: React.ReactNode;
};

function Button({ children }: PrimaryButtonProps) {
  function pressHandler() {
    console.log("Button pressed");
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

const styles = StyleSheet.create({
  // TODO: Add support for light and dark themes
  // ! Dedicated pressed style for iOS not applied
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

export default Button;
