import { Stack } from "expo-router";

import { ROUTE_NAMES } from "@/constants/route.constants";

import Header from "@/components/Header";
import { stackScreenOptions, useStackHeaderOptions } from "@/components/navigation/stackHeader";
import { SafeAreaView } from "react-native-safe-area-context";


export default function WalletStack() {
  const headerOptions = useStackHeaderOptions();
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen
        name={ROUTE_NAMES.HOME}
        options={{
            header: () => (
              <SafeAreaView edges={["top"]}>
                <Header
                  title="Wallet"
                  style={{ justifyContent: "center" }}
                />
              </SafeAreaView>
            ),
          }}
        
      />
      <Stack.Screen
        name={ROUTE_NAMES.CREATE_WALLET}
        options={{ title: "" }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.ESIM_WALLET}
        options={({ route }: any) => ({
          title: route?.params?.name ? `${route.params.name} eSIM wallet` : "eSIM wallet",
          headerTitleAlign: "center",
          // A function-valued `options` isn't merged against the Stack's own
          // `screenOptions` - see the Shop stack's COVERAGE screen for the
          // same pattern - so the shared back control has to be re-specified
          // here or this screen falls back to the unthemed native default.
          headerLeft: stackScreenOptions.headerLeft,
        })}
      />

      <Stack.Screen
        name={ROUTE_NAMES.TRANSACTION_DETAILS}
        options={{ title: "Transaction Details" }}
      />

      <Stack.Screen
        name={ROUTE_NAMES.CONTACTS}
        options={{ headerShown: false }}
      />
      
      </Stack>
  );
}
