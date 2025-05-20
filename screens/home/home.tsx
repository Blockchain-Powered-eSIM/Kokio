import { ScrollView } from "react-native";

import ActiveESIMsScroll from "@/components/home/active-esim-scroll";
import Wallet from "@/components/home/wallet";
import Hero from "@/components/home/hero";

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
  },
  // Add more eSIM objects as needed
];

export default function HomeScreen() {
  return (
    <ScrollView>
      <Hero />
      <ActiveESIMsScroll esims={mockEsims} />
      <Wallet />
    </ScrollView>
  );
}
