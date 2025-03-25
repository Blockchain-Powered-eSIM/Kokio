import { Stack } from "expo-router";
import Header from "@/components/Header";
import { ROUTE_NAMES } from "@/constants/route.constants";

export default function ContactsStack() {
    return (
        <Stack>
            <Stack.Screen
                name={ROUTE_NAMES.HOME}
                options={{
                    header: () => <Header title="Contacts" hasBack style={{ justifyContent: "center" }} />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.ADD_CONTACTS_SCREEN}
                options={{
                    header: () => <Header title="Add Contact" hasBack style={{ justifyContent: "center" }} />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.CONTACT_DETAILS}
                options={{
                    header: () => <Header title="Contact Details" hasBack style={{ justifyContent: "center" }} />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.EDIT_CONTACT}
                options={{
                    header: () => <Header title="Edit Contact" hasBack style={{ justifyContent: "center" }} />,
                }}
            />
           <Stack.Screen
                name={ROUTE_NAMES.SEND_TO_CONTACT}
                options={{
                    header: () => <Header title="Send to Contact" hasBack style={{ justifyContent: "center" }} />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.CONTACT_TRANSACTIONS}
                options={{
                    header: () => <Header title="Contact Transactions" hasBack style={{ justifyContent: "center" }} />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.QR_CODE_SCREEN}
                options={{
                    headerShown: false
                }}
            />
        </Stack>
    );
}
