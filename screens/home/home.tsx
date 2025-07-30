import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Alert,
  Platform,
  Linking,
  View,
  Text,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ActiveESIMsScroll from "@/components/home/active-esim-scroll";
import Wallet from "@/components/home/wallet";
import Hero from "@/components/home/hero";
import LockScreen from "../../components/LockModal";

const mockEsims = [
  {
    catalogueId: "681604659b6fe88ebea13796",
    actualSellingPrice: 4.5,
    data: 1,
    isUnlimited: false,
    serviceRegionCode: "US",
    serviceRegionFlag: "https://flagcdn.com/w320/us.png",
    serviceRegionName: "United States",
    sms: 500,
    validity: 7,
    voice: 100,
    coverageType: "LOCAL",
  },
  {
    catalogueId: "681604659b6fe88ebea137a3",
    actualSellingPrice: 36,
    data: 20,
    isUnlimited: false,
    serviceRegionCode: "FR",
    serviceRegionFlag: "https://flagcdn.com/w320/fr.png",
    serviceRegionName: "France",
    sms: 50,
    validity: 30,
    voice: 200,
    coverageType: "LOCAL",
  },
  {
    catalogueId: "681604659b6fe88ebea137c5",
    actualSellingPrice: 22.5,
    data: 10,
    isUnlimited: false,
    serviceRegionCode: "GB",
    serviceRegionFlag: "https://flagcdn.com/w320/gb.png",
    serviceRegionName: "United Kingdom",
    sms: null,
    validity: 30,
    voice: null,
    coverageType: "LOCAL",
  },
  // Add more eSIM objects as needed
];

export default function HomeScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <Hero />
        <ActiveESIMsScroll esims={mockEsims} />
        <Wallet walletId="0x9bf...b1e2ef7" balance="500" />
      </ScrollView>
    </SafeAreaView>
  );
}
