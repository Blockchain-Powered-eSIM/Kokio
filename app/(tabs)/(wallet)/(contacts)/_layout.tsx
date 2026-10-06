import { Stack } from "expo-router";
import { HeaderBackControl, useStackHeaderOptions } from "@/components/navigation/stackHeader";
import { ROUTE_NAMES } from "@/constants/route.constants";

// Contacts screens can be entered directly from the Wallet tab, so the back control must render even with no previous screen.
export default function ContactsStack() {
    const headerOptions = useStackHeaderOptions();
    return (
        <Stack screenOptions={{ ...headerOptions, headerLeft: () => <HeaderBackControl /> }}>
            <Stack.Screen name={ROUTE_NAMES.HOME} options={{ title: "Contacts" }} />
            <Stack.Screen name={ROUTE_NAMES.ADD_CONTACTS_SCREEN} options={{ title: "Add Contact" }} />
            <Stack.Screen name={ROUTE_NAMES.CONTACT_DETAILS} options={{ title: "Contact Details" }} />
            <Stack.Screen name={ROUTE_NAMES.EDIT_CONTACT} options={{ title: "Edit Contact" }} />
            <Stack.Screen name={ROUTE_NAMES.SEND_TO_CONTACT} options={{ title: "Send" }} />
            <Stack.Screen name={ROUTE_NAMES.CONTACT_TRANSACTIONS} options={{ title: "Contact Transactions" }} />
            <Stack.Screen name={ROUTE_NAMES.QR_CODE_SCREEN} options={{ headerShown: false }} />
        </Stack>
    );
}
