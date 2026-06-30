import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import _get from "lodash/get";

import Header from "@/components/Header";
import { ROUTE_NAMES } from "@/constants/route.constants";
import CheckoutHeader from "@/components/checkoutHeader";
import appBootstrap from "@/utils/appBootstrap";

export default function ShopStack() {
  return (
    <Stack
      screenOptions={({ route }) => ({
        contentStyle:
          route.name === ROUTE_NAMES.CHECKOUT ? { flex: 1 } : undefined,
      })}
    >
      <Stack.Screen
        name={ROUTE_NAMES.HOME}
        options={{
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header title="Shop" hasBack />
            </SafeAreaView>
          ),
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.BY_COUNTRY}
        options={({ route }: any) => {
          const countryConfig = appBootstrap.getCountryConfig;
          const countryLabel =
            _get(countryConfig, [route?.params?.id, "name"]) || "";
          return {
            header: () => (
              <SafeAreaView edges={["top"]}>
                <Header
                  title={countryLabel}
                  hasBack
                  style={{ justifyContent: "center" }}
                />
              </SafeAreaView>
            ),
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
            header: () => (
              <SafeAreaView edges={["top"]}>
                <Header
                  title={regionLabel}
                  hasBack
                  style={{ justifyContent: "center" }}
                />
              </SafeAreaView>
            ),
          };
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
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header
                title="Network Coverage"
                hasBack
                style={{ justifyContent: "center" }}
                goBackHandler={
                  route?.params?.from === "orders"
                    ? () => router.navigate("/(tabs)/orders")
                    : undefined
                }
              />
            </SafeAreaView>
          ),
        })}
      />
    </Stack>
  );
}
