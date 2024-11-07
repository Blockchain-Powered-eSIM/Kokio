import { Stack } from "expo-router";

import _isFunction from "lodash/isFunction";
import _get from "lodash/get";

import Header from "@/components/Header";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { REGION_CONFIG, COUNTRY_CONFIG } from "@/constants/general.constants";
import CheckoutHeader from "@/components/checkoutHeader";

export default function ShopStack() {
  return (
    <Stack>
      <Stack.Screen
        name={ROUTE_NAMES.HOME}
        options={{
          header: () => (
            <Header title="Shop" style={{ justifyContent: "center" }} />
          ),
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.BY_COUNTRY}
        options={({ route, navigation }: any) => {
          const countryLabel = _get(COUNTRY_CONFIG , [route?.params?.id, 'label']) ||'';
          return {
            header: () => (
              <Header
                title={countryLabel}
                hasBack
                style={{ justifyContent: "center" }}
              />
            ),
          };
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.BY_REGION}
        options={({ route, navigation }: any) => {
          const regionLabel = _get(REGION_CONFIG , [route?.params?.id, 'label']) ||'';
          
          return {
            header: () => (
              <Header
                title={regionLabel}
                hasBack
                style={{ justifyContent: "center" }}
              />
            ),
          };
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.CHECKOUT}
        options={({ route }: any) => {
          const id = route?.params?.id;
          return {
            header: () => <CheckoutHeader id={id} />,
          };
        }}
      />
    </Stack>
  );
}
