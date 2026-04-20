import CountryFlag from "react-native-country-flag";
import { Image, View } from "react-native";

import _get from "lodash/get";
const CODE_VS_RESIZE_MODE = {
  NP: "center",
  DEFAULT: "cover",
};
const CountryFlagWrapper = ({
  style = {},
  size = 20,
  isoCode = "",
  flagUrl = "",
}) => {
  const resizeMode =
    _get(CODE_VS_RESIZE_MODE, isoCode) || CODE_VS_RESIZE_MODE.DEFAULT;

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
