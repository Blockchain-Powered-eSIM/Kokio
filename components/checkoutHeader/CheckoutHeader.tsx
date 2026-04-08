import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View, Text, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import _get from "lodash/get";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

import { Theme } from "@/constants/Colors";
import { ESIM_EXTRA_DETAILS } from "@/constants/checkout.constants";
import CountryFlag from "@/components/ui/CountryFlag";

import DetailItem from "../ui/DetailItem";

const HEADER_MIN_HEIGHT = Platform.OS === "android" ? 150 : 200;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_ALLOWED_HEIGHT = SCREEN_HEIGHT * 0.6;
const DIVIDER_WIDTH = Dimensions.get("window").width - 32;

const ExpandableContent = ({ eSimItem = {} }: any) => (
  <View style={{ gap: 12 }}>
    {ESIM_EXTRA_DETAILS.map((item, index) => (
      <View key={index} style={[!item.isFlexColumn && styles.expandedItem]}>
        <DetailItem
          iconType={item.iconType}
          iconName={item.iconName}
          value={item.label}
          highlight={false}
          containerStyles={styles.extraContentLabel}
        />
        <DetailItem
          value={item.formatter?.(_get(eSimItem, item.key))}
          containerStyles={item.dataContainerStyles}
        />
      </View>
    ))}
  </View>
);

const CheckoutHeader = ({ eSimDetails = {} }: any) => {
  const insets = useSafeAreaInsets();

  const computedHeaderHeight = useMemo(() => {
    if (Platform.OS === "android") {
      return HEADER_MIN_HEIGHT + insets.top;
    }
    return HEADER_MIN_HEIGHT;
  }, []);

  const eSimItem = React.useMemo(() => {
    if (typeof eSimDetails === "string") {
      try {
        return JSON.parse(eSimDetails);
      } catch (error) {
        return null;
      }
    }
    return eSimDetails;
  }, [eSimDetails]);

  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(computedHeaderHeight);
  const isExpanded = useSharedValue(false);

  const navigation = useNavigation();

  const headerMaxHeight = Math.min(
    contentHeight + computedHeaderHeight + 40, // 40 for pill + margins
    MAX_ALLOWED_HEIGHT
  );

  const panGesture = Gesture.Pan().onEnd((event) => {
    "worklet";
    const dy = event.translationY;
    if (Math.abs(dy) > 20) {
      const shouldExpand = dy > 0 && !isExpanded.value;
      const shouldCollapse = dy < 0 && isExpanded.value;

      if (shouldExpand) {
        isExpanded.value = true;
        animatedHeight.value = withTiming(headerMaxHeight, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      } else if (shouldCollapse) {
        isExpanded.value = false;
        animatedHeight.value = withTiming(computedHeaderHeight, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      }
    }
  });

  const onContentLayout = (event: any) =>
    setContentHeight(_get(event, "nativeEvent.layout.height"));

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const countryAndFlagWithGoBack = useMemo(
    () => (
      <View style={styles.countryFlagContainer}>
        <View style={styles.mainContent}>
          <Ionicons
            name="chevron-back-outline"
            size={36}
            color={Theme.colors.background}
            style={{ marginRight: Theme.spacing.sm }}
            onPress={handleBack}
          />
          <Text
            style={styles.countryText}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {_get(eSimItem, "serviceRegionName")}
          </Text>
        </View>
        {eSimItem?.coverageType === "LOCAL" && eSimItem?.serviceRegionCode && (
          <CountryFlag
            style={styles.flag}
            isoCode={eSimItem?.serviceRegionCode}
            flagUrl={eSimItem?.serviceRegionFlag}
            size={60}
          />
        )}
      </View>
    ),
    [handleBack, eSimItem]
  );

  const detailItems = useMemo(
    () => (
      <View style={styles.detailItemsContainer}>
        <DetailItem
          iconName="calendar-outline"
          value={_get(eSimItem, "validity")}
          suffix="Days"
        />
        <DetailItem
          iconName="cellular-outline"
          value={_get(eSimItem, "data")}
          suffix="GB"
        />
        <DetailItem
          iconName="call-outline"
          value={_get(eSimItem, "voice")}
          suffix="Mins"
        />
        <DetailItem
          iconName="chatbox-outline"
          value={_get(eSimItem, "sms")}
          suffix="SMS"
        />
      </View>
    ),
    [eSimItem]
  );

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  // Only animate width — height is fixed on the pill
  const animatedPillWidth = useAnimatedStyle(() => ({
    width: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight],
      [48, DIVIDER_WIDTH]
    ),
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight],
      [0, 1]
    ),
  }));

  const animatedArrowDownStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight],
      [1, 0]
    ),
  }));

  const animatedArrowUpStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight],
      [0, 1]
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 16 },
          animatedHeaderStyle,
        ]}
      >
        {/* Country + flag + back */}
        <View
          style={{
            marginBottom:
              eSimItem?.coverageType === "LOCAL" && eSimItem?.serviceRegionCode
                ? 4
                : 18,
          }}
        >
          {countryAndFlagWithGoBack}
          {detailItems}
        </View>

        {/* Pill drag handle */}
        <View style={styles.expandIndicatorRow}>
          <Animated.View style={[styles.pillHandle, animatedPillWidth]}>
            <Animated.View style={animatedArrowDownStyle}>
              <Ionicons name="chevron-down" size={12} color="#3C3C43CC" />
            </Animated.View>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.arrowCenter, animatedArrowUpStyle]}
            >
              <Ionicons name="chevron-up" size={12} color="#3C3C43CC" />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Expandable details */}
        <Animated.View style={animatedContentStyle}>
          <View onLayout={onContentLayout}>
            <ExpandableContent eSimItem={eSimItem} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Theme.colors.card,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    overflow: "hidden",
  },
  countryFlagContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 8,
  },
  countryText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#000000",
    flex: 1,
    flexShrink: 1,
  },
  flag: {
    borderRadius: 6,
  },
  detailItemsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  expandedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  extraContentLabel: {
    marginRight: 8,
  },
  expandIndicatorRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Platform.OS === "android" ? 8 : 10,
    marginBottom: Platform.OS === "android" ? 4 : 6,
  },
  pillHandle: {
    backgroundColor: "#3C3C4333",
    borderRadius: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  arrowCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(CheckoutHeader);