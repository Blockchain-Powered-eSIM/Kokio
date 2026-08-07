import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.success,
    overflow: "hidden",
  },
  initials: {
    color: colors.text,
    fontWeight: "bold",
  },
});

const Avatar = ({
  imageUri,
  name,
  size = 50,
}: {
  imageUri?: ImageSourcePropType;
  name: string;
  size?: number;
}) => {
  const styles = useThemedStyles(createStyles);
  const twoLetters = name
    ? name.charAt(0).toUpperCase() + (name.charAt(1) || "").toLowerCase()
    : "NA";

  return (
    <View
      style={[
        styles.container,
        { height: size, width: size, borderRadius: size / 2 },
      ]}
    >
      {imageUri ? (
        <Image
          source={imageUri}
          style={{ height: size, width: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size / 2 }]}>
          {twoLetters}
        </Text>
      )}
    </View>
  );
};


export default Avatar;
