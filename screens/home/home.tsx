import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ActiveESIMsScroll from "@/components/home/active-esim-scroll";
import Wallet from "@/components/home/wallet";
import Hero from "@/components/home/hero";
import { useKokio } from "@/hooks/useKokio";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWalletBalance } from "@/hooks/useWalletBalance";

export default function HomeScreen() {
  const { kokio, setupKokio } = useKokio();
  const bg = useThemeColor({}, "background");
  const router = useRouter();
  const { balance, isLoading: isBalanceLoading } = useWalletBalance(kokio.deviceWalletAddress);

  const handleOpenWalletSetup = async () => {
    if (!kokio.sdk) {
      await setupKokio();
    }
    router.push("/(tabs)/(wallet)/create-wallet" as any);
  };

  const handleOpenWallet = () => {
    router.push("/(tabs)/(wallet)" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ backgroundColor: bg }}>
        <Hero />
        <ActiveESIMsScroll />
        <Wallet
          isWalletAdded={!!kokio.userWallet}
          balance={balance}
          isBalanceLoading={isBalanceLoading}
          onSetupWallet={handleOpenWalletSetup}
          onOpenWallet={handleOpenWallet}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
