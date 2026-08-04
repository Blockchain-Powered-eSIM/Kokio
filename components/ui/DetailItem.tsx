import React from "react";
import _isNil from "lodash/isNil";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import _get from "lodash/get";
import { Theme } from "@/constants/Colors";

const ICON_TYPE_VS_RENDERER = {
  ION: Ionicons,
  MCI: MaterialCommunityIcons,
};

const DetailItem = ({
  iconType,
  iconName,
  prefix,
  value,
  suffix,
  highlight = true,
  containerStyles,
}: any) => {
  const IconComponent =
    _get(ICON_TYPE_VS_RENDERER, iconType) || ICON_TYPE_VS_RENDERER.ION;

  if (_isNil(value)) {
    return null;
  }

  return (
    <View style={[styles.detailItem, containerStyles]}>
      {iconName && React.createElement(IconComponent, { name: iconName, size: 20, color: Theme.colors.cardForeground })}
      {prefix && <Text style={[styles.text, { color: Theme.colors.cardForeground }]}>{prefix}</Text>}
      <Text style={[styles.details, { color: Theme.colors.cardForeground }, highlight && { fontWeight: "800" }]}>
        {value ?? ""}
      </Text>
      {suffix && <Text style={[styles.text, { color: Theme.colors.cardForeground }]}>{suffix}</Text>}
    </View>
  );
};

export default DetailItem;

const styles = StyleSheet.create({
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  details: {
    fontSize: 14,
  },
  text: {},
});
