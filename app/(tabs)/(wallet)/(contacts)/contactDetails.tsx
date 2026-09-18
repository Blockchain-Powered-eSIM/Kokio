import { View, Image, Pressable, ScrollView } from 'react-native'
import React, { useState, useCallback } from 'react'
import { router, useLocalSearchParams , useFocusEffect } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContactAvatar } from '@/components/wallet/ContactAvatar';
import { useColors } from "@/hooks/useColors";
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/utils/logger';

interface Transaction {
  id: string;
  dateTime: string | Date; // Can adjust based on how you want to store it
  tokenAmount: string;
  name: string;
  amount: string;
  status: "pending" | "completed"; // Union type for valid statuses
  type: "sent" | "received"; // Union type for valid types
  icon: string;
}

const ContactDetails = () => {
  const colors = useColors();
  const { isDark } = useTheme();
  const iconTintColor = isDark ? 'white' : '#000000';
  const { id, alias, avatarColorKey, walletAddress } = useLocalSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    const contact_id = id as string; // Ensure id is treated as string
    try {
      // Fetch the contact from AsyncStorage
      const contactJson = await AsyncStorage.getItem(`contact_${contact_id}`);
      const contact = contactJson ? JSON.parse(contactJson) : null;

      if (!contact) {
        logger.error('CONTACT_NOT_FOUND', { contact_id });
        setTransactions([]); // Set empty array if contact not found
        return;
      }

      // Extract and set the transactions array
      const contactTransactions: Transaction[] = contact.transactions || [];
      setTransactions(contactTransactions);

      logger.debug('CONTACT_TRANSACTIONS_FETCHED', { contactTransactions });
    } catch (error) {
      logger.error('CONTACT_TRANSACTIONS_FETCH_FAILED', { error });
      setTransactions([]); // Set empty array in case of error
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  )

  return (
    <ThemedView darkColor='black' className='flex-1  '>
      <ScrollView className='flex-1 pb-5'>
      <View className='w-auto mt-4   items-center '>
        <ContactAvatar seed={id as string} colorKey={avatarColorKey as string} alias={alias as string} size={120} />
        <ThemedText lightColor="#000000" variant='xxl' className='text-center mt-4'>{alias}</ThemedText>

      </View>
      <View className='w-full h-auto  mt-10 gap-x-2 flex-row  mx-2 '>
        <Pressable onPress={() => router.push({ pathname: '/(tabs)/(wallet)/(contacts)/sendToContact', params: { alias: alias, avatarColorKey: avatarColorKey, id: id } })} className='flex-1  items-center'>
          <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[70%] ml-[-30] rounded-3xl py-5  justify-center items-center'>

            <Image source={require("../../../../assets/images/wallet/sendImg.png")} className='h-[32] w-[32]' />
            <ThemedText lightColor="#000000" variant='sm' className='text-white mt-2' bold>Send</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable className='flex-1  '>
          <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[70%] ml-[-20] rounded-3xl py-5   justify-center items-center'>

            <Image source={require("../../../../assets/images/wallet/recieveImg.png")} className='h-[32] w-[32]' />
            <ThemedText lightColor="#000000" variant='sm' className='text-white mt-2' bold>Recieve</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable onPress={() => router.replace({ pathname: "/(tabs)/(wallet)/(contacts)/editContact", params: { alias: alias, id: id, walletAddress: walletAddress } })} className='flex-1'>
          <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[70%] ml-7  rounded-3xl py-5  justify-center items-center'>
            <MaterialIcons name="edit" size={28} color={iconTintColor} />
            <ThemedText lightColor="#000000" variant='sm' className='text-white mt-2' bold>Edit</ThemedText>
          </ThemedView>
        </Pressable>
      </View>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(tabs)/(wallet)/(contacts)/contactTransactions",
            params: { transactions: JSON.stringify(transactions) }, // Stringify the array
          })
        }
      >
        <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className=' h-auto mx-2  py-3 rounded-3xl mt-[20] '>
          <View className='flex-row justify-between'>
            <ThemedText lightColor="#000000" darkColor={colors.foreground} className=' ml-6'>Transactions</ThemedText>
            {transactions?.length > 0 &&
              <ThemedText lightColor="#000000" darkColor={colors.foreground} className=' mr-5'>See all</ThemedText>}
          </View>
          {transactions && transactions?.length > 0 ?
            <View className='w-full gap-y-6 mt-5 mb-3'>
              {transactions?.map((tr, index) => {
                return (
                  <View key={index} className='flex-row items-center justify-between  mx-5 '>
                    <View className='flex-row items-center'>

                      <Image source={tr.type === 'sent' ? require('../../../../assets/images/contacts/sent.png') : require('../../../../assets/images/contacts/received.png')} className='h-[48px] w-[48px]  ' />
                      <View className='flex-col items-start ml-3 '>
                        <ThemedText lightColor="#000000" variant='xl'>{tr.name}</ThemedText>
                        {tr.type === "received" ? <ThemedText lightColor="#000000" darkColor={colors.foreground} variant='sm'>{tr.type}</ThemedText> :
                          <ThemedText lightColor="#000000" darkColor={colors.primary} variant='sm'>{tr.type}</ThemedText>
                        }
                      </View>
                    </View>
                    <View className='flex-col items-end '>
                      <ThemedText lightColor="#000000" variant='xl'>{tr.amount}</ThemedText>
                      {tr.status === "completed" ? <ThemedText lightColor="#000000" darkColor={colors.foreground} variant='sm'>{tr.status}</ThemedText> :
                        <ThemedText lightColor="#000000" darkColor={colors.primary} variant='sm'>{tr.status}</ThemedText>
                      }
                    </View>
                  </View>
                )
              })}
            </View> :
            <ThemedText lightColor="#000000" darkColor={colors.foreground} className=' mt-5 ml-6 mb-2' >No Transactions to show</ThemedText>}

        </ThemedView>
      </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

export default ContactDetails;
