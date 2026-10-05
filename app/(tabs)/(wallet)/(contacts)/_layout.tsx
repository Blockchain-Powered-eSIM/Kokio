import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { useColors } from "@/hooks/useColors";

function StackBackButton() {
    const router = useRouter();
    const colors = useColors();
    return (
        <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ paddingHorizontal: 8 }}
        >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
    );
}

export default function ContactsStack() {
    return (
        <Stack screenOptions={{ headerLeft: () => <StackBackButton /> }}>
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
