import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import _get from "lodash/get";

import ActiveESIMsScroll from "@/components/home/active-esim-scroll";
import Wallet from "@/components/home/wallet";
import Hero from "@/components/home/hero";
import { useKokio } from "@/hooks/useKokio";

import { useState } from "react";
import WalletSetupModal from "@/components/ui/WalletSetupModal";

export default function HomeScreen() {
  const { kokio, setupKokio } = useKokio();
  const [showWalletSetup, setShowWalletSetup] = useState(false);

  const purchasedESIMs = _get(kokio, "purchasedESIMs") || [];

  const handleOpenWalletSetup = async () => {
    if (!kokio.sdk) {
      await setupKokio();
    }
    setShowWalletSetup(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <Hero />
        <ActiveESIMsScroll purchasedESIMs={purchasedESIMs} />
        {kokio.userWallet ? (
            <Wallet
              walletId={kokio.userWallet?.address}
              balance="0"
              isWalletAdded
            />
        ) : (
          <Wallet
            isWalletAdded={false}
            onSetupWallet={handleOpenWalletSetup}
          />
        )}
      </ScrollView>
      <WalletSetupModal
        visible={showWalletSetup}
        onClose={() => setShowWalletSetup(false)}
        onContinue={() => setShowWalletSetup(false)}
      />
    </SafeAreaView>
  );
}
