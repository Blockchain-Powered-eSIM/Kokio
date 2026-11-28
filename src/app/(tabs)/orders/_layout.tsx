import { Stack } from "expo-router";

import { TopHeader } from "@/components/header";
import { stackScreenOptions, useStackHeaderOptions } from "@/components/navigation/stack-header";
import { ROUTE_NAMES } from "@/lib/constants/routes";

export default function OrdersStack() {
  const headerOptions = useStackHeaderOptions();
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen
        name={ROUTE_NAMES.HOME}
        options={{
          header: () => <TopHeader title="Orders" style={{ justifyContent: "center" }} />,
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.ESIM_WALLET}
        options={({ route }) => {
          const name = (route.params as { name?: string } | undefined)?.name;
          return {
            title: name ? `${name} eSIM wallet` : "eSIM wallet",
            headerTitleAlign: "center",
            // Function-valued options are not merged with screenOptions, so the themed back control is set again here.
            headerLeft: stackScreenOptions.headerLeft,
          };
        }}
      />
    </Stack>
  );
}
