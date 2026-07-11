import React, { useCallback, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View, Text, Dimensions, Platform, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, router } from "expo-router";
import _get from "lodash/get";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

import { Theme } from "@/constants/Colors";
import { ESIM_EXTRA_DETAILS } from "@/constants/checkout.constants";
import CountryFlag from "@/components/ui/CountryFlag";

import DetailItem from "../ui/DetailItem";

const PILL_ROW_HEIGHT = 40;
const HEADER_MIN_HEIGHT = (Platform.OS === "android" ? 150 : 200) + PILL_ROW_HEIGHT;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_ALLOWED_HEIGHT = SCREEN_HEIGHT * 0.6;
const DIVIDER_WIDTH = Dimensions.get("window").width - 32;

const ExpandableContent = ({
  eSimItem = {},
  onNetworkPress,
  onContentSizeChange,
}: {
  eSimItem?: any;
  onNetworkPress: () => void;
  onContentSizeChange?: (w: number, h: number) => void;
}) => {
  const isMultiCountry = eSimItem?.coverageType !== "LOCAL";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
      contentContainerStyle={{ gap: 12 }}
      onContentSizeChange={onContentSizeChange}
    >
      {ESIM_EXTRA_DETAILS.map((item, index) => {
        const value = _get(eSimItem, item.key);

        if (item.hideWhenNullish && (value === null || value === undefined)) {
          return null;
        }

        const isNetworkRow = item.key === "countryWiseNetworkCoverages";

        if (isNetworkRow && isMultiCountry) {
          const coverage: any[] = value || [];
          return (
            <View key={index} style={styles.expandedItem}>
              <DetailItem
                iconType={item.iconType}
                iconName={item.iconName}
                value={item.label}
                highlight={false}
                containerStyles={styles.extraContentLabel}
              />
              <Pressable
                onPress={onNetworkPress}
                style={styles.networkLink}
                hitSlop={8}
              >
                <Text style={styles.networkLinkText}>
                  {coverage.length} {coverage.length === 1 ? "country" : "countries"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={Theme.colors.cardForeground}
                />
              </Pressable>
            </View>
          );
        }

        return (
          <View key={index} style={[!item.isFlexColumn && styles.expandedItem]}>
            <DetailItem
              iconType={item.iconType}
              iconName={item.iconName}
              value={item.label}
              highlight={false}
              containerStyles={styles.extraContentLabel}
            />
            <DetailItem
              value={item.formatter?.(value)}
              highlight={false}
              containerStyles={item.dataContainerStyles}
            />
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
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
    paddingVertical: 12,
  },
  pillHandle: {
    backgroundColor: Theme.colors.handle,
    borderRadius: 10,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  networkLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  networkLinkText: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.cardForeground,
  },
});

const CheckoutHeader = ({ eSimDetails = {} }: any) => {
  const insets = useSafeAreaInsets();

  const computedHeaderHeight = useMemo(() => {
    if (Platform.OS === "android") {
      return HEADER_MIN_HEIGHT + insets.top;
    }
    return HEADER_MIN_HEIGHT;
  }, [insets.top]);

  const eSimItem = React.useMemo(() => {
    if (typeof eSimDetails === "string") {
      try {
        return JSON.parse(eSimDetails);
      } catch {
        return null;
      }
    }
    return eSimDetails;
  }, [eSimDetails]);

  // useSharedValues keeps worklets and styles in sync without React re-renders
  const contentHeight = useSharedValue(0);
  const animatedHeight = useSharedValue(computedHeaderHeight);
  const isExpanded = useSharedValue(false);

  // Derived value instantly updates the max height when contentHeight finishes measuring
  const headerMaxHeight = useDerivedValue(() => {
    return Math.min(
      contentHeight.value + computedHeaderHeight + 40, // 40 for pill + margins
      MAX_ALLOWED_HEIGHT
    );
  });

  const networkCoverage = useMemo(
    () => eSimItem?.countryWiseNetworkCoverages ?? [],
    [eSimItem]
  );

  const handleNetworkPress = () => {
    router.push({
      pathname: "/(tabs)/(shop)/coverage",
      params: { data: JSON.stringify(networkCoverage) },
    });
  };

  const navigation = useNavigation();

  const toggleExpanded = () => {
    "worklet";
    if (isExpanded.value) {
      isExpanded.value = false;
      animatedHeight.value = withTiming(computedHeaderHeight, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
    } else {
      isExpanded.value = true;
      animatedHeight.value = withTiming(headerMaxHeight.value, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
    }
  };
  
  const tapGesture = Gesture.Tap().onEnd(() => {
    "worklet";
    toggleExpanded();
  });
  
  const panGesture = Gesture.Pan().onEnd((event) => {
    "worklet";
    const dy = event.translationY;
    if (Math.abs(dy) > 20) {
      const shouldExpand  = dy > 0 && !isExpanded.value;
      const shouldCollapse = dy < 0 &&  isExpanded.value;
      if (shouldExpand || shouldCollapse) {
        toggleExpanded();
      }
    }
  });

  const combinedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const countryAndFlagWithGoBack = useMemo(
    () => (
      <View style={styles.countryFlagContainer}>
        <View style={styles.mainContent}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="chevron-back-outline"
              size={36}
              color={Theme.colors.background}
              style={{ marginRight: Theme.spacing.sm }}
            />
          </Pressable>
          <Text
            style={[styles.countryText, { color: Theme.colors.cardForeground }]}
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
          value={eSimItem?.isUnlimited ? "Unlimited" : _get(eSimItem, "data")}
          suffix={eSimItem?.isUnlimited ? "" : "GB"}
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

  const animatedPillWidth = useAnimatedStyle(() => ({
    width: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight.value],
      [48, DIVIDER_WIDTH]
    ),
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight.value],
      [0, 1]
    ),
  }));

  const animatedArrowDownStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight.value],
      [1, 0]
    ),
  }));

  const animatedArrowUpStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedHeight.value,
      [computedHeaderHeight, headerMaxHeight.value],
      [0, 1]
    ),
  }));

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, backgroundColor: Theme.colors.card },
          animatedHeaderStyle,
        ]}
      >
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

        <View style={styles.expandIndicatorRow}>
          <Animated.View style={[styles.pillHandle, animatedPillWidth]}>
            <Animated.View style={animatedArrowDownStyle}>
              <Ionicons name="chevron-down" size={12} color={Theme.colors.handleArrow} />
            </Animated.View>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.arrowCenter, animatedArrowUpStyle]}
            >
              <Ionicons name="chevron-up" size={12} color={Theme.colors.handleArrow} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View style={animatedContentStyle}>
          <ExpandableContent
            eSimItem={eSimItem}
            onNetworkPress={handleNetworkPress}
            onContentSizeChange={(_width, height) => {
              contentHeight.value = height;
            }}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

export default React.memo(CheckoutHeader);
