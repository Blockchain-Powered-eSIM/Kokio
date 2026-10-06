import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText'
import { Image, Pressable, View } from 'react-native'
import React from 'react'
import { router } from 'expo-router'
import _ from "lodash";
import { useColors } from "@/hooks/useColors";
import { useContacts } from '@/hooks/useContacts';
import { ContactAvatar } from '@/components/wallet/ContactAvatar';

const ContactsScreen = () => {
        const colors = useColors();
        const { contacts } = useContacts();
    return (
        <ThemedView className='flex-1'>
            <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='mx-2 py-3   rounded-3xl mt-5 w-auto'>
                <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='gap-y-4 justify-start items-center gap-x-1 flex-wrap flex-row mt-7 mb-3'>
                {/* add contact btn  */}
                <Pressable onPress={() => router.push("/(tabs)/(wallet)/(contacts)/addContactScreen")} className='ml-[-10] justify-center mt-[-19] mr-4 '>
                    <View className='ml-8 h-16 items-center justify-center w-16 rounded-full' style={{ backgroundColor: colors.warning }}>
                        <Image source={require("../../../../assets/images/wallet/add_contact.png")} className='h-[32] w-[38]' />
                    </View>
                    <ThemedText lightColor="#000000" className='ml-8 mt-2'>Add new</ThemedText>
                </Pressable>
                {/* other contacts  */}
                {contacts.length > 0 &&
                _.map(contacts, (contact, index) => (
                    <Pressable onPress={()=> router.push({pathname:'/(tabs)/(wallet)/(contacts)/contactDetails',params:{id:contact.id,alias:contact.alias,avatarColorKey:contact.avatarColorKey,transactions:contact?.transactions,walletAddress:contact.walletAddress}})} key={index} className=' items-center justify-between  mx-5 '>
                        <View className='flex-col items-center'>
                            <ContactAvatar seed={contact.id} colorKey={contact.avatarColorKey} alias={contact.alias} size={53} />
                            <View className='flex-col items-start mt-3 '>
                                <ThemedText lightColor="#000000" >{contact.alias}</ThemedText>

                            </View>
                        </View>
                        <View className='flex-col items-end '>
                        </View>
                    </Pressable>
                ))}
            </ThemedView>
            </ThemedView>
        </ThemedView>
    )
}

export default ContactsScreen;
