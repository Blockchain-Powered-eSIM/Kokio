import { Stack } from "expo-router";

import _isFunction from "lodash/isFunction";
import _get from "lodash/get";


import { ROUTE_NAMES } from "@/constants/route.constants";

import Header from "@/components/Header";


export default function WalletStack() {
  return (
    <Stack>
      <Stack.Screen
        name={ROUTE_NAMES.HOME}
        options={{
            header: () => (
              <Header title="eSim Wallet" style={{ justifyContent: "center" }} />
            ),
          }}
        
      />
      <Stack.Screen
        name={ROUTE_NAMES.TOKENS}
        options={ {
          
          
            header: () => (
              <Header
                title="Tokens"
                hasBack
                style={{ justifyContent: "center" }}
              />
            ),
          
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.TRANSACTIONS}
        options={ {
          
          
          
            header: () => (
              <Header
                title="Transactions"
                hasBack
                style={{ justifyContent: "center" }}
              />
            ),
          
        }}
      />
      <Stack.Screen
        name={ROUTE_NAMES.TRANSACTIONDETAILS}
        options={ {
          
          
          
            header: () => (
              <Header
                title="Transaction Details"
                hasBack
                style={{ justifyContent: "center" }}
              />
            ),
          
        }}
      />
      
     
      <Stack.Screen
        name={ROUTE_NAMES.CONTACTS}
        options={{headerShown:false}}
      />
      
      </Stack>
  );
}
