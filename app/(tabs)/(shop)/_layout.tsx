import { Stack, router } from "expo-router";

import _get from "lodash/get";

import { HeaderBackControl, stackScreenOptions, useStackHeaderOptions } from "@/components/navigation/stackHeader";
import { ROUTE_NAMES } from "@/constants/route.constants";
import CheckoutHeader from "@/components/checkoutHeader";
import appBootstrap from "@/utils/appBootstrap";
import { ShopFiltersProvider, useShopFilters } from "@/contexts/ShopFiltersContext";
import { ShopFilterButton, ShopFilterSheet } from "@/components/ShopFilterControl";

export default function ShopStack() {
  return (
    <ShopFiltersProvider>
      <ShopStackNavigator />
    </ShopFiltersProvider>
  );
}

function ShopStackNavigator() {
  const { sheetRef } = useShopFilters();
  return (
    <>
      <StackContent />
      <ShopFilterSheet ref={sheetRef} />
    </>
  );
}

function ShopFilterHeaderButton() {
  const { isActive, openFilterSheet } = useShopFilters();
  return <ShopFilterButton isActive={isActive} onPress={openFilterSheet} />;
}

function StackContent() {
  const headerOptions = useStackHeaderOptions();
  return (
    <Stack
      screenOptions={({ route }) => ({
        ...headerOptions,
        contentStyle:
          route.name === ROUTE_NAMES.CHECKOUT ? { flex: 1 } : undefined,
      })}
    >
      <Stack.Screen name={ROUTE_NAMES.HOME} options={{ title: "Shop" }} />
      <Stack.Screen
        name={ROUTE_NAMES.BY_COUNTRY}
        options={({ route }: any) => {
          const countryConfig = appBootstrap.getCountryConfig;
          const countryLabel =
            _get(countryConfig, [route?.params?.id, "name"]) || "";
          return {
            title: countryLabel,
            headerRight: () => <ShopFilterHeaderButton />,
            // Function-valued `options` isn't merged against the Stack's own
            // `screenOptions`, so the shared back control has to be re-specified
            // here - see the COVERAGE screen below for the same pattern.
            headerLeft: stackScreenOptions.headerLeft,
          };
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.BY_REGION}
        options={({ route }: any) => {
          const regionConfig = appBootstrap.getRegionConfig;
          const regionLabel =
            _get(regionConfig, [route?.params?.id, "name"]) || "";

          return {
            title: regionLabel,
            headerRight: () => <ShopFilterHeaderButton />,
            headerLeft: stackScreenOptions.headerLeft,
          };
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.MULTI_COUNTRY}
        options={{
          title: "Plans for countries",
          headerRight: () => <ShopFilterHeaderButton />,
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.CHECKOUT}
        options={({ route }: any) => {
          const { id, item } = route?.params || {};
          return {
            header: () => <CheckoutHeader id={id} eSimDetails={item} />,
          };
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.COVERAGE}
        options={({ route }: any) => ({
          title: "Network Coverage",
          // From Orders the stack has no meaningful previous screen, so go to the orders tab explicitly.
          headerLeft:
            route?.params?.from === "orders"
              ? ({ tintColor }) => (
                  <HeaderBackControl
                    tintColor={tintColor}
                    onPress={() => router.navigate("/(tabs)/orders")}
                  />
                )
              : stackScreenOptions.headerLeft,
        })}
      />
    </Stack>
  );
}
