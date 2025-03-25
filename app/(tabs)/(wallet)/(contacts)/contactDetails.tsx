import { View, Text, Image, Pressable, ScrollView } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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

const contactDetails = () => {
  const { id, monogramUrl, firstName, lastName, walletAddress } = useLocalSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    const contact_id = id as string; // Ensure id is treated as string
    try {
      // Fetch the contact from AsyncStorage
      const contactJson = await AsyncStorage.getItem(`contact_${contact_id}`);
      const contact = contactJson ? JSON.parse(contactJson) : null;

      if (!contact) {
        console.error(`Contact with ID ${contact_id} not found`);
        setTransactions([]); // Set empty array if contact not found
        return;
      }

      // Extract and set the transactions array
      const contactTransactions: Transaction[] = contact.transactions || [];
      setTransactions(contactTransactions);

      console.log("Fetched transactions:", contactTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]); // Set empty array in case of error
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  )


  return (
    
    <ThemedView darkColor='black' className='flex-1  '>
      <ScrollView className='flex-1 pb-5'>
      <View className='w-auto mt-4   items-center '>
        <Image
          source={monogramUrl ? { uri: monogramUrl } : require('../../../../assets/images/wallet/sampleProfileImg.png')}
          className='h-[216px] w-[216px]'
        />
        <ThemedText variant='xxl' className='text-center mt-4'>{firstName} {lastName}</ThemedText>


      </View>
      <View className='w-full h-auto  mt-10 gap-x-2 flex-row  mx-2 '>
        <Pressable onPress={() => router.push({ pathname: '/(contacts)/sendToContact', params: { monogramUrl: monogramUrl, firstName: firstName, lastName: lastName, id: id } })} className='flex-1  items-center'>
          <ThemedView darkColor='#1c1c1e' className='w-[70%] ml-[-30] rounded-3xl py-5  justify-center items-center'>

            <Image source={require("../../../../assets/images/wallet/sendImg.png")} className='h-[32] w-[32]' />

            <ThemedText variant='sm' className='text-white mt-2' bold>Send</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable className='flex-1  '>
          <ThemedView darkColor='#1c1c1e' className='w-[70%] ml-[-20] rounded-3xl py-5   justify-center items-center'>

            <Image source={require("../../../../assets/images/wallet/recieveImg.png")} className='h-[32] w-[32]' />
            <ThemedText variant='sm' className='text-white mt-2' bold>Recieve</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable onPress={() => router.replace({ pathname: "/(tabs)/(wallet)/(contacts)/editContact", params: { firstName: firstName, lastName: lastName, monogramUrl: monogramUrl, id: id, walletAddress: walletAddress } })} className='flex-1'>
          <ThemedView darkColor='#1c1c1e' className='w-[70%] ml-7  rounded-3xl py-5  justify-center items-center'>

            <Image source={require("../../../../assets/images/wallet/sampleProfileImg.png")} className='h-[32] w-[32]' />

            <ThemedText variant='sm' className='text-white mt-2' bold>Edit</ThemedText>
          </ThemedView>
        </Pressable>
      </View>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(contacts)/contactTransactions",
            params: { transactions: JSON.stringify(transactions) }, // Stringify the array
          })
        }
      >
        <ThemedView darkColor='#1c1c1e' className=' h-auto bg-slate-300 mx-2  py-3 rounded-3xl mt-[20] '>
          <View className='flex-row justify-between'>
            <ThemedText darkColor='#AEAEB2' className=' ml-6'>Transactions</ThemedText>
            {transactions?.length > 0 &&
              <ThemedText darkColor='#AEAEB2' className=' mr-5'>See all</ThemedText>}
          </View>
          {transactions && transactions?.length > 0 ?
            <View className='w-full gap-y-6 mt-5 mb-3'>
              {transactions?.map((tr, index) => {
                return (
                  <View key={index} className='flex-row items-center justify-between  mx-5 '>
                    <View className='flex-row items-center'>

                      <Image source={tr.type === 'sent' ? require('../../../../assets/images/contacts/sent.png') : require('../../../../assets/images/contacts/received.png')} className='h-[48px] w-[48px]  ' />
                      <View className='flex-col items-start ml-3 '>
                        <ThemedText variant='xl'>{tr.name}</ThemedText>
                        {tr.type === "received" ? <ThemedText darkColor='#AEAEB2' variant='sm'>{tr.type}</ThemedText> :
                          <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.type}</ThemedText>
                        }

                      </View>
                    </View>
                    <View className='flex-col items-end '>
                      <ThemedText variant='xl'>{tr.amount}</ThemedText>
                      {tr.status === "completed" ? <ThemedText darkColor='#AEAEB2' variant='sm'>{tr.status}</ThemedText> :
                        <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.status}</ThemedText>
                      }
                    </View>

                  </View>
                )
              })}
            </View> :
            <ThemedText darkColor='#AEAEB2' className=' mt-5 ml-6 mb-2' >No Transactions to show</ThemedText>}

        </ThemedView>
      </Pressable>
      </ScrollView>
    </ThemedView>

  )
}

export default contactDetails;