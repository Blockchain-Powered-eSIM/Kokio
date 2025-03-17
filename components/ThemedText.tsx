import { Text, type TextProps, StyleSheet, TextStyle } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { cn } from "./../lib/cn";

export type ThemedTextProps = TextProps & {
  children: React.ReactNode;
  variant?: "xsm" | "xsmb" | "sm" | "smb" | "normal" | "xl" | "xxl";
  className?: string;
  style?: TextStyle;
  bold?: boolean;
  light?:boolean
  lightColor?: string;
  darkColor?: string;
};

export function ThemedText({
  children,
  variant,
  className,
  style,
  bold,
  light,
  lightColor,
  darkColor,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      className={cn(
        `
        text-black
        text-base
        font-Lexend
        `,
        variant === "xsm" && "text-xs",
        variant === "xsmb" && "text-xs font-LexendSemiBold",
        variant === "sm" && "text-sm font-Lexend",
        variant === "smb" && "text-sm font-LexendSemiBold",
        variant === "xl" && "text-xl font-LexendSemiBold",
        variant === "xxl" && "text-2xl font-LexendSemiBold",
        bold && "font-LexendSemiBold",
        light && "font-LexendLight",
        className
      )}
      style={[{ color }, style]} 
      {...rest} 
    >
      {children}
    </Text>
  );
}
