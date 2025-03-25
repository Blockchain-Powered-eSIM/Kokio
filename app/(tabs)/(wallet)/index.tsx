import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Link, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

import Wallet from '@/components/home/wallet';
import ToastNotification from '@/components/ui/ToastNotification/ToastNotification';
import { useToast } from '@/contexts/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react'; // Import useCallback for memoization





const tokens = [
  { id: '1', name: 'USDC', symbol: 'USDC', balance: '0.5', value: '$85.23 USD', icon: require("../../../assets/images/wallet/usdc.png") },
  { id: '2', name: 'Ethereum', symbol: 'ETH', balance: '2.0', value: '$35.23 USD', icon: require("../../../assets/images/wallet/eth.png") },
  { id: '3', name: 'Unicorn', symbol: 'UNI', balance: '10.0', value: '$55.23 USD', icon: require("../../../assets/images/wallet/uni.png") },
  { id: '4', name: 'Matic', symbol: 'MATIC', balance: '10.0', value: '$35.23 USD', icon: require("../../../assets/images/wallet/matic.png") },
];

const transactions = [
  { id: '1', name: 'Alice', amount: '$150.00', status: "pending", type: "sending", icon: require('../../../assets/images/wallet/contact1.png') },
  { id: '2', name: 'Ethan', amount: '$150.00', status: "completed", type: "recieved", icon: require('../../../assets/images/wallet/contact2.png') },
  { id: '3', name: 'Alice', amount: '$150.00', status: "completed", type: "recieved", icon: require('../../../assets/images/wallet/contact3.png') },
];

// const contacts = [
//   { id: '1', name: 'Alice', icon: require("../../../assets/images/wallet/contact1.png") },
//   { id: '2', name: 'Bob', icon: require("../../../assets/images/wallet/contact2.png") },
//   { id: '3', name: 'Charlie', icon: require("../../../assets/images/wallet/contact3.png") },
 

// ];

const WalletPage = () => {
  const router = useRouter();
 
  const {showToast} = useToast();
  const [contacts, setContacts] = useState([]);

const getAllContacts = async () => {
  try {
    // Get the array of contact IDs
    const contactIdsJson = await AsyncStorage.getItem('contactIds');
    const contactIds = contactIdsJson ? JSON.parse(contactIdsJson) : [];
    
    // Fetch all contacts using the IDs
    const contactsArray = await Promise.all(
      contactIds.map(async (contactId:string) => {
        const contactJson = await AsyncStorage.getItem(`contact_${contactId}`);
        return contactJson ? JSON.parse(contactJson) : null;
      })
    );

    // Filter out any null values and update state
    const validContacts = contactsArray?.filter(contact => contact !== null);
    setContacts(validContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    setContacts([]); // Set empty array in case of error
  }
};

useFocusEffect(
  useCallback(() => {
    getAllContacts();
  }, []) 
);
  
  return (
    <ThemedView className='flex-1 h-full justify-center items-center w-full bg-black' >
      
      <ScrollView className='flex-1'>


        <View className='flex-1  mb-2'>
          <Wallet walletId='0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef7' balance='500'/>
        </View>

        <View className='flex-1 gap-x-2 flex-row  mx-2 '>
          <Pressable onPress={()=>showToast("$50","0.0001 ETH","sent","Sandra",null)} className='flex-1'>
          <ThemedView darkColor='#1c1c1e' className='flex-1 rounded-3xl py-5  justify-center items-center'>
            <View className='p-[12] rounded-full bg-[#FF9500]'>
              <Image source={require("../../../assets/images/wallet/arrow_up.png")} className='h-[32] w-[32]' />
            </View>
            <ThemedText variant='sm' className='text-white mt-2' bold>Send</ThemedText>
          </ThemedView>
          </Pressable>
          <Pressable onPress={()=>showToast("$500","0.00013 ETH","recieved","Sandra",null)} className='flex-1'>
          <ThemedView darkColor='#1c1c1e' className='flex-1 rounded-3xl py-5  justify-center items-center'>
            <View className='p-[12] rounded-full bg-[#34C759]'>
              <Image source={require("../../../assets/images/wallet/arrow_down.png")} className='h-[32] w-[32]' />
            </View>
            <ThemedText variant='sm' className='text-white mt-2' bold>Recieve</ThemedText>
          </ThemedView>
          </Pressable>
          <ThemedView darkColor='#1c1c1e' className='flex-1 rounded-3xl py-5  justify-center items-center'>
            <View className='p-[12] rounded-full bg-[#007AFF]'>
              <Image source={require("../../../assets/images/wallet/square_arrow.png")} className='h-[32] w-[32]' />
            </View>
            <ThemedText variant='sm' className='text-white mt-2' bold>Deposit</ThemedText>
          </ThemedView>
        </View>

        <Pressable className='flex-1' onPress={() => router.push("/(tabs)/(wallet)/(contacts)/sendToContact")}>
          <ThemedView darkColor='#1c1c1e' className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
            <View className='flex-row justify-between'>
              <ThemedText darkColor='#AEAEB2' className=' ml-6'>Your Tokens</ThemedText>

              {tokens.length > 0 &&
                <ThemedText darkColor='#AEAEB2' className=' mr-5'>See all</ThemedText>}

            </View>

            {tokens.length === 0 ?
              <ThemedText darkColor='#AEAEB2' className=' mt-5 ml-6 mb-2' >You don't hold any tokens yet.</ThemedText>
              :
              <View className='flex-1 gap-y-3 mt-5 mb-3'>
                {tokens.map((token, index) => {
                  return (
                    <View key={index} className='flex-row items-center justify-between  mx-5 '>
                      <View className='flex-row items-center'>
                        <Image source={token.icon} className='h-[48px] w-[48px]  ' />
                        <ThemedText bold variant='xl' className='ml-3 ' >{token.symbol}</ThemedText>
                      </View>
                      <View className='flex-col items-end '>
                        <ThemedText variant='xl'>{token.balance}</ThemedText>
                        <ThemedText darkColor='#AEAEB2' variant='sm'>{token.value}</ThemedText>
                      </View>

                    </View>
                  )
                })}
              </View>

            }


          </ThemedView>
        </Pressable>
        <Pressable className='flex-1' onPress={()=>router.push('/(tabs)/(wallet)/transactions')}>
        <ThemedView darkColor='#1c1c1e' className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
          <View className='flex-row justify-between'>
            <ThemedText darkColor='#AEAEB2' className=' ml-6'>Transactions</ThemedText>
            {transactions.length > 0 &&
              <ThemedText darkColor='#AEAEB2' className=' mr-5'>See all</ThemedText>}
          </View>
          {transactions.length > 0 ?
            <View className='flex-1 gap-y-6 mt-5 mb-3'>
              {transactions.map((tr, index) => {
                return (
                  <View key={index} className='flex-row items-center justify-between  mx-5 '>
                    <View className='flex-row items-center'>
                      <Image source={tr.icon} className='h-[48px] w-[48px]  ' />
                      <View className='flex-col items-start ml-3 '>
                        <ThemedText variant='xl'>{tr.name}</ThemedText>
                        {tr.type === "recieved"?<ThemedText darkColor='#AEAEB2' variant='sm'>{tr.type}</ThemedText>:
                        <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.type}</ThemedText>
                        }
                        
                      </View>
                    </View>
                    <View className='flex-col items-end '>
                      <ThemedText variant='xl'>{tr.amount}</ThemedText>
                      {tr.status === "completed"?<ThemedText darkColor='#AEAEB2' variant='sm'>{tr.status}</ThemedText>:
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
        <Pressable className='flex-1' onPress={()=>router.push({pathname:'/(contacts)',params:{contacts:JSON.stringify(contacts)}})}>
        <ThemedView darkColor='#1c1c1e' className='flex-1 mx-2 mb-5 py-3 rounded-3xl mt-5 '>
          <View className='flex-row justify-between'>
            <ThemedText darkColor='#AEAEB2' className=' ml-6'>Contacts</ThemedText>

            {contacts.length > 0 &&
              <ThemedText darkColor='#AEAEB2' className=' mr-5'>See all</ThemedText>}

          </View>

          {contacts.length > 0 ? <View className='flex-row ml-3 gap-y-6 mt-5 mb-3'>
            {contacts.slice(0,4).map((person, index) => {
              return (
                <View key={index} className=' items-center justify-between  mx-5 '>
                  <View className='flex-col items-center'>
                    <Image  source={person.monogramUrl ? { uri: person.monogramUrl } : require('../../../assets/images/wallet/sampleProfileImg.png')} className='h-[53px] w-[53px]  ' />
                    <View className='flex-col items-start mt-3 '>
                      <ThemedText >{person?.firstName}</ThemedText>

                    </View>
                  </View>
                  <View className='flex-col items-end '>

                  </View>

                </View>
              )
            })}
          </View> :
            <View className=' justify-center '>
              <View className=' ml-8 mt-4 h-16 items-center justify-center  w-16 rounded-full bg-[#FF9500]'>
                <Image source={require("../../../assets/images/wallet/add_contact.png")} className='h-[32] w-[38]' />
              </View>
              <ThemedText darkColor='#AEAEB2' className='ml-8 mt-2'>Add new</ThemedText>
            </View>

          }

        </ThemedView>
        </Pressable>
        {/* <TouchableOpacity className='flex-1 items-center py-5'  onPress={() => showToast("$50","0.0001 ETH","sent")}>
          <ThemedText >Toggle Toast Notification</ThemedText>
        </TouchableOpacity> */}

      </ScrollView>
    </ThemedView>
  );
};



export default WalletPage;