import { StyleSheet, Text, TextStyle, View } from "react-native";
import React from "react";



import { cn } from "../../lib/cn";

type TypographyProps = {
    children: React.ReactNode;
    variant?: "xsm" | "xsmb" | "sm" | 'smb' | "normal" | "xl" | "xxl";
    class?: string;
    style?:TextStyle,
    bold?:boolean,
};

const Typography: React.FC<TypographyProps> = ({
    children,
    variant,
    class: className,
    style,
    bold
}) => {
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
                className
            )}
            style={style}
        >
            {children}
        </Text>
    );
};

export default Typography;

const styles = StyleSheet.create({});
