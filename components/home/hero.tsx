import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";

import { Theme } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

import { Card, CardFooter } from "../ui/Card";

const createStyles = (colors: Palette) => StyleSheet.create({
  backgroundImageContainer: {
    overflow: "hidden",
    width: "100%",
    position: "relative",
    padding: 0,
  },
  backgroundImage: {
    position: "absolute",
    opacity: 0.5,
    top: -150,
    right: 0,
    width: "100%",
    height: 600,
  },
  card: {
    width: "auto",
    overflow: "hidden",
    marginHorizontal: Theme.spacing.sm,
    marginVertical: Theme.spacing.md,
  },
  flagsBanner: {
    width: "100%",
  },
  cardFooter: {
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.cardForeground,
  },
  subHeader: {
    fontSize: 10,
    fontWeight: "400",
    color: colors.cardForeground,
  },
  heroButton: {
    borderRadius: 40,
    paddingHorizontal: 24,
    paddingVertical: 5,
  },
  heroButtonText: {
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
  },
});

const Hero = () => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const handleShopCTAClick = useCallback(() => {
    router.navigate("/(tabs)/(shop)");
  }, []);

  return (
    <Card style={styles.card}>
      <ImageBackground
        source={require("@/assets/images/hero-background.png")}
        resizeMode="cover"
        style={styles.backgroundImageContainer}
        imageStyle={styles.backgroundImage}
      >
        <Image
          source={require("@/assets/images/flagsBanner.png")}
          style={styles.flagsBanner}
          resizeMode="cover"
        />
      </ImageBackground>
      <CardFooter style={styles.cardFooter}>
        <View>
          <Text style={styles.header}>Plan My Next Adventure</Text>
          <Text style={styles.subHeader}>The world is waiting</Text>
        </View>
        <TouchableOpacity
          style={[styles.heroButton, { backgroundColor: colors.ctaBackground }]}
          onPress={handleShopCTAClick}
          accessibilityRole="button"
          accessibilityLabel="Shop for eSIM plans"
        >
          <Text style={[styles.heroButtonText, { color: colors.ctaForeground }]}>Shop</Text>
        </TouchableOpacity>
      </CardFooter>
    </Card>
  );
};


export default Hero;
