import CountryFlag from "react-native-country-flag";
import { Image, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import _get from "lodash/get";

import { useColors } from "@/hooks/useColors";
import { rankRegionsForCountries, MAX_NAMED_REGIONS } from "@/helpers/customRegionalName";
import { regionCodeFromName, regionImageForCode } from "@/helpers/regionImage";

const CODE_VS_RESIZE_MODE = {
  NP: "center",
  DEFAULT: "cover",
};

export type CoverageType = "LOCAL" | "REGIONAL" | "GLOBAL" | "CUSTOM_REGIONAL";

interface CountryFlagWrapperProps {
  style?: StyleProp<ViewStyle>;
  size?: number;
  isoCode?: string;
  flagUrl?: string | null;
  // Non-LOCAL plans have no per-country flag. When coverageType is passed
  // (and isn't LOCAL), a region illustration / globe / split image renders
  // instead, matching the same flag-shaped box so layouts don't shift.
  coverageType?: CoverageType;
  serviceRegionCode?: string | null;
  serviceRegionName?: string | null;
  // ISO country codes the plan covers — only known for Custom Regional plans
  // still in the catalogue (coverageCountries). Purchased eSIMs don't carry
  // this, so they fall back to a generic multi-region mark.
  countryCodes?: string[];
}

// A themed box standing in for a flag: same 1.7:1 shape, filled with a
// neutral backdrop so illustrations/icons of any color read clearly.
const RegionBox = ({
  style,
  size,
  backdrop,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  size: number;
  backdrop: string;
  children: React.ReactNode;
}) => (
  <View
    style={[
      {
        height: size,
        width: 1.7 * size,
        overflow: "hidden",
        backgroundColor: backdrop,
        flexDirection: "row",
      },
      style,
    ]}
  >
    {children}
  </View>
);

const RegionHalf = ({ code, backdrop }: { code: string | null; backdrop: string }) => {
  const imagePath = regionImageForCode(code);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: backdrop }}>
      {imagePath ? (
        <Image source={imagePath} style={{ width: "72%", height: "72%" }} resizeMode="contain" />
      ) : null}
    </View>
  );
};

const CountryFlagWrapper = ({
  style = {},
  size = 20,
  isoCode = "",
  flagUrl = "",
  coverageType,
  serviceRegionCode,
  serviceRegionName,
  countryCodes,
}: CountryFlagWrapperProps) => {
  const colors = useColors();
  const resizeMode = _get(CODE_VS_RESIZE_MODE, isoCode) || CODE_VS_RESIZE_MODE.DEFAULT;

  if (coverageType && coverageType !== "LOCAL") {
    const backdrop = "transparent";

    if (coverageType === "GLOBAL") {
      return (
        <RegionBox style={style} size={size} backdrop={backdrop}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{
                fontSize: size * 0.75,
                lineHeight: size * 0.75,
                textAlign: "center",
                textAlignVertical: "center",
                includeFontPadding: false,
              }}
            >
              🌍
            </Text>
          </View>
        </RegionBox>
      );
    }

    if (coverageType === "REGIONAL") {
      const code = serviceRegionCode ?? regionCodeFromName(serviceRegionName);
      const imagePath = regionImageForCode(code);
      return (
        <RegionBox style={style} size={size} backdrop={backdrop}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {imagePath ? (
              <Image source={imagePath} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            ) : (
              <Ionicons name="map-outline" size={size * 0.8} color={colors.text} />
            )}
          </View>
        </RegionBox>
      );
    }

    // CUSTOM_REGIONAL
    const rankedCodes = countryCodes?.length ? rankRegionsForCountries(countryCodes) : [];
    const topCodes = rankedCodes.slice(0, MAX_NAMED_REGIONS);

    if (topCodes.length >= 2) {
      return (
        <RegionBox style={style} size={size} backdrop={backdrop}>
          <RegionHalf code={topCodes[0]} backdrop={backdrop} />
          <RegionHalf code={topCodes[1]} backdrop={backdrop} />
        </RegionBox>
      );
    }
    if (topCodes.length === 1) {
      const imagePath = regionImageForCode(topCodes[0]);
      return (
        <RegionBox style={style} size={size} backdrop={backdrop}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {imagePath ? (
              <Image source={imagePath} style={{ width: "72%", height: "72%" }} resizeMode="contain" />
            ) : (
              <Ionicons name="layers-outline" size={size * 0.55} color={colors.text} />
            )}
          </View>
        </RegionBox>
      );
    }
    // No country-level data to work out which regions — e.g. a purchased
    // eSIM, which only snapshots validity/data, not coverage countries.
    return (
      <RegionBox style={style} size={size} backdrop={backdrop}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="layers-outline" size={size * 0.55} color={colors.text} />
        </View>
      </RegionBox>
    );
  }

  return flagUrl ? (
    <View style={[{ height: size, width: 1.7 * size, overflow: "hidden" }, style]}>
      <Image
        source={{ uri: flagUrl }}
        style={{ height: size, width: 1.7 * size }}
        resizeMode={resizeMode}
      />
    </View>
  ) : (
    <CountryFlag style={[{ backgroundColor: "transparent" }, style]} isoCode={isoCode} size={size} />
  );
};

export default CountryFlagWrapper;
