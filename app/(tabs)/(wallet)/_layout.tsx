import { Stack } from "expo-router";

import { ROUTE_NAMES } from "@/constants/route.constants";

import Header from "@/components/Header";
import { SafeAreaView } from "react-native-safe-area-context";


export default function WalletStack() {
  return (
    <Stack>
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
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.ESIM_WALLET}
        options={({ route }: any) => ({
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header
                title={route?.params?.name ? `${route.params.name} eSIM wallet` : "eSIM wallet"}
                hasBack
                style={{ justifyContent: "center" }}
              />
            </SafeAreaView>
          ),
        })}
      />

      <Stack.Screen
        name={ROUTE_NAMES.CONTACTS}
        options={{headerShown:false}}
      />
      
      </Stack>
  );
}
