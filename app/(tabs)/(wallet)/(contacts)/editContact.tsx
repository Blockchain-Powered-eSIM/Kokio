import 'react-native-get-random-values';
import { View, Image, TextInput, KeyboardAvoidingView, ActivityIndicator , Pressable , Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router , useNavigation, useLocalSearchParams } from 'expo-router';
import { ContactAvatar, pickUniqueAvatarColorKey } from '@/components/wallet/ContactAvatar';
import { useContacts, findContactConflict } from '@/hooks/useContacts';
import { useColors } from "@/hooks/useColors";
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { logger } from '@/utils/logger';

const EditContact = () => {
    const colors = useColors();
    const { isDark } = useTheme();
    const inputTextColor = isDark ? 'white' : '#000000';
    const { showMessage } = useToast();
    const [alias, setAlias] = useState("");
    const [walletAddress, setWalletAddress] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const { contacts } = useContacts();
    const existingContact = contacts.find((c) => c.id === params.id);

    useEffect(() => {
        // This will capture the wallet address when returning from the QR scan
        const unsubscribe = navigation.addListener('focus', () => {
            if (params.walletAddress) {
                setWalletAddress(params.walletAddress as string);
            }
            if (params.alias) {
                setAlias(params.alias as string);
            }
        });
        return unsubscribe;
    }, [navigation, params]);

    const handleScan = async () => {
        router.push({ pathname: "/(tabs)/(wallet)/(contacts)/qrCodeScreen", params: { isEdit:"true",id:params.id } });
    };
    const handleSave = async () => {
        if (alias === "" || walletAddress === "") {
          showMessage("Please fill in an alias and address to proceed", "error");
          return;
        }

        const conflict = findContactConflict(contacts, { alias, walletAddress, excludeId: params.id as string });
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
          const contactId = params.id;
          // Fetch the existing contact to preserve createdAt
          const existingContactJson = await AsyncStorage.getItem(`contact_${contactId}`);
          const existingContactRecord = existingContactJson ? JSON.parse(existingContactJson) : null;

          if (!existingContactRecord) {
            throw new Error("Contact not found");
          }

          const editedContactObj = {
            id: contactId,
            alias: alias,
            walletAddress: walletAddress,
            // Preserve the color a contact was originally assigned - only
            // assign a fresh one if this contact predates avatar colors.
            avatarColorKey: existingContactRecord.avatarColorKey ?? pickUniqueAvatarColorKey(contacts),
            createdAt: existingContactRecord.createdAt, // Preserve original createdAt
            updatedAt: new Date(), // Update with current timestamp
            transactions: existingContactRecord.transactions || [], // Preserve existing transactions
          };

          // Store updated contact
          await AsyncStorage.setItem(`contact_${contactId}`, JSON.stringify(editedContactObj));

          // No need to update contactIds since this is an update, not a new contact
          // (The contactId should already exist in contactIds)
          // Optional: Show success message
          showMessage("Contact updated successfully", "info");

          // Navigate to contactDetails with updated info
          router.replace({
            pathname: '/(tabs)/(wallet)/(contacts)/contactDetails',
            params: {
              alias: editedContactObj.alias,
              avatarColorKey: editedContactObj.avatarColorKey,
              walletAddress:walletAddress,
              id:params.id
            },
          });
          logger.debug('CONTACT_UPDATED', { editedContactObj });

        // Reset form fields
        } catch (error) {
          logger.error('CONTACT_UPDATE_FAILED', { error });
          showMessage("Failed to update contact", "error");
        } finally {
          setIsLoading(false);
        }
      };
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
                    <View className='w-auto   items-center mt-8'>
                        <ContactAvatar seed={params.id as string} colorKey={existingContact?.avatarColorKey} alias={alias || '?'} size={120} />
                    </View>
                    <View className='flex-1 gap-y-3 mt-[65]'>
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
                        <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-auto mx-2 flex-row  py-5 rounded-3xl '>
                            <Image source={require('../../../../assets/images/wallet/trashIcon.png')} className='h-[24] w-[24] ml-6'/>
                            <ThemedText lightColor="#000000" className='ml-4'  darkColor={colors.pink}>Delete Contact</ThemedText>
                        </ThemedView>

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 30, marginBottom: 20 }}>
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
                                onPress={handleSave}
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
                                accessibilityLabel="Save contact"
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={colors.ctaForeground} />
                                ) : (
                                    <ThemedText style={{ fontSize: 16, fontWeight: "700", color: colors.ctaForeground }}>
                                        Save
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

export default EditContact;
