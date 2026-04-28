import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Theme } from "@/constants/Colors";

const EsimItemSkeleton = ({
  containerStyle = {},
}: {
  containerStyle?: Object;
}) => {
  const opacity = useSharedValue(0.3);

  // Create a pulsing animation
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 700 }),
        withTiming(0.3, { duration: 700 })
      ),
      -1, // Infinite repeat
      true // Reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.esimItemContainer, containerStyle]}>
      <View style={styles.flagContainer}>
        <Animated.View style={[styles.flag, styles.skeleton, animatedStyle]} />
      </View>
      <View style={styles.esimItem}>
        <Animated.View
          style={[
            styles.skeletonText,
            animatedStyle,
            // { width: "60%", height: 24 },
            { width: "55%", height: 24, marginRight: 90 }
          ]}
        />
        <View style={styles.detailsContainer}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View
              key={i}
              style={[styles.skeletonDetail, animatedStyle]}
            />
          ))}
        </View>
        <Animated.View
          style={[styles.buyButton, styles.skeleton, animatedStyle]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  esimItemContainer: {
    marginTop: Theme.spacing.lg,
  },
  esimItem: {
    backgroundColor: Theme.colors.skeletonBase,
    borderRadius: 21,
    padding: 16,
    gap: 8,
    width: "100%",
  },
  flagContainer: {
    position: "absolute",
    top: -12,
    right: 40,
    zIndex: 10,
  },
  flag: {
    width: 85,
    height: 50,
    borderRadius: 4,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buyButton: {
    height: 40,
    borderRadius: Theme.borderRadius.large,
    marginTop: Theme.spacing.sm,
  },
  // Skeleton styles
  skeleton: {
    backgroundColor: Theme.colors.skeletonHighlight,
  },
  skeletonText: {
    height: 20,
    backgroundColor: Theme.colors.skeletonHighlight,
    borderRadius: 4,
    marginBottom: 5,
  },
  skeletonDetail: {
    width: 50,
    height: 20,
    backgroundColor: Theme.colors.skeletonHighlight,
    borderRadius: 4,
  },
});

export default EsimItemSkeleton;
