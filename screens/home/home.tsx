/* eslint-disable import/extensions */

import { ScrollView } from "react-native";

import ActiveESIMsScroll from "@/components/home/active-esim-scroll";
import Wallet from "@/components/home/wallet";
import Hero from "@/components/home/hero";

const mockEsims = [
  {
    id: "1",
    country: "Italy",
    isoCode: "it",
    duration: 3,
    data: 1.7,
    minutes: 52,
    sms: 27,
    flagColor: "#008C45",
  },
  {
    id: "2",
    country: "Greece",
    isoCode: "gr",
    duration: 5,
    data: 3,
    minutes: 120,
    sms: 100,
    flagColor: "#008C45",
  },
  {
    id: "3",
    country: "France",
    isoCode: "fr",
    duration: 20,
    data: 5.7,
    minutes: 52,
    sms: 7,
    flagColor: "#008C45",
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
