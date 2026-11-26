// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/

import Ionicons from '@expo/vector-icons/Ionicons';
import { type IconProps } from '@expo/vector-icons/build/createIconSet';
import { type ComponentProps } from 'react';
import { type ColorValue } from 'react-native';

type TabBarIconProps = Omit<IconProps<ComponentProps<typeof Ionicons>['name']>, 'color'> & {
  color?: ColorValue;
};

export function TabBarIcon({ style, color, ...rest }: TabBarIconProps) {
  // ColorValue (RN 0.88 strict types) admits null/number; the icon accepts string | NativeColorValue.
  const iconColor = color == null || typeof color === 'number' ? undefined : color;
  return <Ionicons size={28} style={[{ marginBottom: -3 }, style]} color={iconColor} {...rest} />;
}
