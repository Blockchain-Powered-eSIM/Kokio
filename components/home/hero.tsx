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

import { Card, CardFooter } from "../ui/Card";

const Hero = () => {
  const handleShopCTAClick = useCallback(() => {
    router.navigate("/(shop)");
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
          <Text style={styles.header}>Plan Your Next Adventure</Text>
          <Text style={styles.subHeader}>The world awaits you!</Text>
        </View>
        <TouchableOpacity
          style={styles.heroButton}
          onPress={handleShopCTAClick}
        >
          <Text style={styles.heroButtonText}>Shop</Text>
        </TouchableOpacity>
      </CardFooter>
    </Card>
  );
};

const styles = StyleSheet.create({
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
    color: "#000000",
  },
  subHeader: {
    fontSize: 10,
    fontWeight: "400",
    color: "#000000",
  },
  heroButton: {
    backgroundColor: Theme.colors.text,
    borderRadius: 40,
    paddingHorizontal: 24,
    paddingVertical: 5,
  },
  heroButtonText: {
    color: Theme.colors.background,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default Hero;
