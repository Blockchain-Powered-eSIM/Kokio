import 'react-native-get-random-values';
import { View, TextInput, KeyboardAvoidingView, ActivityIndicator , Pressable , Platform } from 'react-native'
import React, { useState, useEffect, useMemo } from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { router , useNavigation, useLocalSearchParams } from 'expo-router';
import { ContactAvatar, pickUniqueAvatarColorKey } from '@/components/wallet/ContactAvatar';
import { useContacts, findContactConflict } from '@/hooks/useContacts';
import { useColors } from "@/hooks/useColors";
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { logger } from '@/utils/logger';

const AddContactScreen = () => {
    const { showMessage } = useToast();
    const [alias, setAlias] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const colors = useColors();
    const { isDark } = useTheme();
    const inputTextColor = isDark ? 'white' : '#000000';
    const { contacts } = useContacts();
    // Computed once against the current contact list, then reused for both
    // the live preview and the saved record - a contact's color is assigned
    // once and never recomputed later.
    const newContactColorKey = useMemo(() => pickUniqueAvatarColorKey(contacts), [contacts]);

    useEffect(() => {
        // This will capture the wallet address when returning from the QR scan
        const unsubscribe = navigation.addListener('focus', () => {
            if (params.walletAddress) {
                setWalletAddress(params.walletAddress as string);
            }
        });

        return unsubscribe;
    }, [navigation, params]);

    const handleScan = async () => {
        router.push({ pathname: "/(tabs)/(wallet)/(contacts)/qrCodeScreen", params: { isEdit: "false" } });
    };

    const handleAdd = async () => {
        if (alias === "" || walletAddress === "") {
            showMessage("Please fill in an alias and address to proceed", "error");
            return;
        }

        const conflict = findContactConflict(contacts, { alias, walletAddress });
        if (conflict === 'alias') {
            showMessage("You already have a contact with this alias", "error");
            return;
        }
        if (conflict === 'address') {
            showMessage("You already have a contact with this wallet address", "error");
            return;
        }

        setIsLoading(true);
        try {
            // Use UUID for a unique identifier
            const contactId = uuidv4();

            const contactObj = {
                id: contactId,
                alias: alias,
                walletAddress: walletAddress,
                avatarColorKey: newContactColorKey,
                createdAt: new Date(),
                updatedAt: new Date(),
                transactions:[]
            }

            // // Store individual contact
            await AsyncStorage.setItem(`contact_${contactId}`, JSON.stringify(contactObj));

            // Maintain an index of all contact IDs
            const existingIds = await AsyncStorage.getItem('contactIds');
            const contactIds = existingIds ? JSON.parse(existingIds) : [];
            contactIds.push(contactId);
            await AsyncStorage.setItem('contactIds', JSON.stringify(contactIds));

            // Optional: Show success message
            showMessage("Contact added successfully", "info");
            router.replace({pathname:'/(tabs)/(wallet)/(contacts)/contactDetails', params:{id:contactObj.id,alias:contactObj.alias,avatarColorKey:contactObj.avatarColorKey,transactions:contactObj.transactions,walletAddress:walletAddress}})
            logger.debug('CONTACT_SAVE_OBJECT', { contactObj });


        } catch (error) {
            logger.error('CONTACT_SAVE_FAILED', { error });
            showMessage("Failed to add contact", "error");
        } finally {
            setIsLoading(false);
            setAlias("");
            setWalletAddress("");
        }
    }
    return (
        <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            enableOnAndroid={true}
            extraScrollHeight={20} // Adjust if needed
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                style={{ flex: 1 }}
            >
                <ThemedView darkColor='black' className='flex-1  justify-center'>
                    <View className='w-auto items-center mt-8'>
                        <ContactAvatar seed={alias} colorKey={newContactColorKey} alias={alias || '?'} size={120} />
                    </View>
                    <View className='flex-1 gap-y-3 mt-[50]'>
                        <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText lightColor="#000000" darkColor={colors.foreground} className=' ml-6'>Alias</ThemedText>
                            <TextInput
                                value={alias}
                                placeholder='Enter a name for this contact'
                                className='text-[15px] font-LexendLight mb-2 ml-6 mt-2 '
                                style={{ color: inputTextColor }}
                                placeholderTextColor={colors.mutedForeground}
                                onChangeText={(text) => setAlias(text)}
                            />
                        </ThemedView>
                        <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText lightColor="#000000" darkColor={colors.foreground} className=' ml-6'>Wallet Address</ThemedText>
                            <TextInput
                                value={walletAddress}
                                placeholder='Enter wallet address or scan QR code'
                                className='text-[15px] w-[80%] font-LexendLight mb-2 ml-6 mt-2 '
                                style={{ color: inputTextColor }}
                                placeholderTextColor={colors.mutedForeground}
                                onChangeText={(text) => setWalletAddress(text)}
                                multiline={true}
                                numberOfLines={2}
                                textAlignVertical="top"
                            />
                            < Pressable onPress={handleScan} className='absolute right-5 bottom-5'>
                                <MaterialIcons name="qr-code-scanner" size={24} color={inputTextColor} />

                            </Pressable>
                        </ThemedView>

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 60, marginBottom: 20 }}>
                            <Pressable
                                onPress={() => router.back()}
                                style={{
                                    flex: 1,
                                    minHeight: 50,
                                    borderRadius: 999,
                                    borderWidth: 1.5,
                                    borderColor: colors.ctaBackground,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel"
                            >
                                <ThemedText lightColor="#000000" style={{ fontSize: 16, fontWeight: "700" }}>Cancel</ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={handleAdd}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    minHeight: 50,
                                    borderRadius: 999,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: colors.ctaBackground,
                                    opacity: isLoading ? 0.5 : 1,
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Add contact"
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={colors.ctaForeground} />
                                ) : (
                                    <ThemedText style={{ fontSize: 16, fontWeight: "700", color: colors.ctaForeground }}>
                                        Add
                                    </ThemedText>
                                )}
                            </Pressable>
                        </View>
                    </View>

                </ThemedView>
            </KeyboardAvoidingView>
        </KeyboardAwareScrollView>
    )
}

export default AddContactScreen;
