import React from "react";
import {
  StyleSheet,
  Image,
  View,
  Text,
  Platform,
  ImageBackground,
} from "react-native";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";

interface WalletProps{
  balance:string,
  walletId:string
}
const shortenId = (address: string|undefined, startLength = 3, endLength = 6) => {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const Wallet = ({balance,walletId}:WalletProps) => {
  return (
    <View style={{ marginVertical: 12 }}>
     
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={["#404040", "#000000"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <ImageBackground
            source={require("@/assets/images/slantedBackground.png")}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <ThemedView style={styles.headerWithLogo}>
            <ThemedText variant="xl" className=" font-Lexend ml-4">eSIM Wallet</ThemedText>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </ThemedView>
          <ThemedView style={styles.balanceContainer}>
            <ThemedText variant="sm" className="text-white mb-1">Total balance</ThemedText>
            <View style={styles.balanceAmountContainer}>
              <ThemedText
               className="text-white text-[40px] mr-1"
               
              
              >
                {balance}
              </ThemedText>
              <ThemedText className="text-white mb-2 ml-1">USD</ThemedText>
            </View>
          </ThemedView>
          <ThemedText variant="sm" className="text-white ml-[250]">{shortenId(walletId)}</ThemedText>
        </LinearGradient>
      </View>
    </View>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  headingText: {
    fontSize: 16,
    color: Colors.dark.accentForeground,
    paddingLeft: 20,
    marginBottom: 12,
  },
  shadowContainer: {
    marginHorizontal: 8,
    borderRadius: 21,
    backgroundColor: "#FFF", // Important for shadow
    ...Platform.select({
      ios: {
        shadowColor: "#FFF",
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
        shadowColor: "#FFF",
      },
    }),
  },
  gradient: {
    borderRadius: 21,
    padding: 24,
    overflow: "hidden",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    marginLeft: 70,
    width: "auto",
  },
  headerWithLogo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  title: {
    paddingLeft: 16,
    fontSize: 22,
    fontWeight: "500",
    color: "white",
  },
  logo: {
    // Add appropriate size for your logo
    width: 32,
    height: 32,
  },
  balanceContainer: {
    backgroundColor: "transparent",
    paddingTop: 24,
    paddingLeft: 16,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  balanceAmount: {
    fontSize: 45,
    fontWeight: "bold",
    flexShrink: 1, // Allow text to shrink if needed
    lineHeight: 44,
  },
  balanceCurrency: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 4,
  },
  address: {
    alignSelf: "flex-end",
    fontSize: 12,
    fontWeight: "600",
  },
});
