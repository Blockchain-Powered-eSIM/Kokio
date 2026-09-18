import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { ROUTE_NAMES } from "@/constants/route.constants";

// Header itself carries no top safe-area inset, so every screen in this stack
// needs the SafeAreaView wrapper or its content renders under the status
// bar/notch (this was the "contacts screen going off the top" bug).
function ScreenHeader({ title }: { title: string }) {
    return (
        <SafeAreaView edges={["top"]}>
            <Header title={title} hasBack style={{ justifyContent: "center" }} />
        </SafeAreaView>
    );
}

export default function ContactsStack() {
    return (
        <Stack>
            <Stack.Screen
                name={ROUTE_NAMES.HOME}
                options={{
                    header: () => <ScreenHeader title="Contacts" />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.ADD_CONTACTS_SCREEN}
                options={{
                    header: () => <ScreenHeader title="Add Contact" />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.CONTACT_DETAILS}
                options={{
                    header: () => <ScreenHeader title="Contact Details" />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.EDIT_CONTACT}
                options={{
                    header: () => <ScreenHeader title="Edit Contact" />,
                }}
            />
           <Stack.Screen
                name={ROUTE_NAMES.SEND_TO_CONTACT}
                options={{
                    header: () => <ScreenHeader title="Send" />,
                }}
            />
            <Stack.Screen
                name={ROUTE_NAMES.CONTACT_TRANSACTIONS}
                options={{
                    header: () => <ScreenHeader title="Contact Transactions" />,
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
