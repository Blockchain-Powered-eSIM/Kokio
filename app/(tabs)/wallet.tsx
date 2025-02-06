import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Link } from 'expo-router';
import { Colors } from '@/constants/Colors';

import Wallet from '@/components/home/wallet';




const tokens = [
  { id: '1', name: 'Bitcoin', symbol: 'BTC', balance: '0.5', icon: '🟠' },
  { id: '2', name: 'Ethereum', symbol: 'ETH', balance: '2.0', icon: '🔷' },
  { id: '3', name: 'Litecoin', symbol: 'LTC', balance: '10.0', icon: '⚪' },
];

const transactions = [
  { id: '1', name: 'Alice', amount: '+0.1 BTC', date: '2023-08-29', icon: '👩' },
  { id: '2', name: 'Bob', amount: '-0.5 ETH', date: '2023-08-28', icon: '👨' },
  { id: '3', name: 'Charlie', amount: '+5.0 LTC', date: '2023-08-27', icon: '🧑' },
];

const contacts = [
  { id: '1', name: 'Alice', icon: '👩' },
  { id: '2', name: 'Bob', icon: '👨' },
  { id: '3', name: 'Charlie', icon: '🧑' },
  { id: '4', name: 'Diana', icon: '👩' },
  { id: '5', name: 'Ethan', icon: '👨' },
];

const WalletPage = () => {
  return (
    <ThemedView className='flex-1 h-full justify-center items-center w-full bg-black' >
      <ScrollView className='flex-1'>

        <ThemedText className='text-[#AEAEB2] text-[16px] text-center font-Lexend mt-3'>eSim Wallet</ThemedText>
        <View className='flex-1 mt-4 mb-2'>
          <Wallet />
        </View>

        <View className='flex-1 gap-x-2 flex-row  mx-2 '>
          <ThemedView darkColor='#1c1c1e' className='flex-1 rounded-3xl py-5  justify-center items-center'>
            <View className='p-[12] rounded-full bg-[#FF9500]'>
              <Image source={require("../../assets/images/wallet/arrow_up.png")} className='h-[32] w-[32]' />
            </View>
            <ThemedText variant='sm' className='text-white mt-2' bold>Send</ThemedText>
          </ThemedView>
          <ThemedView darkColor='#1c1c1e' className='flex-1 rounded-3xl py-5  justify-center items-center'>
            <View className='p-[12] rounded-full bg-[#34C759]'>
              <Image source={require("../../assets/images/wallet/arrow_down.png")} className='h-[32] w-[32]' />
            </View>
            <ThemedText variant='sm' className='text-white mt-2' bold>Recieve</ThemedText>
          </ThemedView>
          <ThemedView darkColor='#1c1c1e' className='flex-1 rounded-3xl py-5  justify-center items-center'>
            <View className='p-[12] rounded-full bg-[#007AFF]'>
              <Image source={require("../../assets/images/wallet/square_arrow.png")} className='h-[32] w-[32]' />
            </View>
            <ThemedText variant='sm' className='text-white mt-2' bold>Deposit</ThemedText>
          </ThemedView>
        </View>
        <ThemedView darkColor='#1c1c1e' className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
          <ThemedText darkColor='#AEAEB2' className=' ml-6'>Your Tokens</ThemedText>
          <ThemedText darkColor='#AEAEB2' className=' mt-5 ml-6 mb-2' >You don't hold any tokens yet.</ThemedText>

        </ThemedView>
        <ThemedView darkColor='#1c1c1e' className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
          <ThemedText darkColor='#AEAEB2' className=' ml-6'>Transactions</ThemedText>
          <ThemedText darkColor='#AEAEB2' className=' mt-5 ml-6 mb-2' >No Transactions to show</ThemedText>

        </ThemedView>
        <ThemedView darkColor='#1c1c1e' className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
          <ThemedText darkColor='#AEAEB2' className=' ml-6'>Contacts</ThemedText>
          <View className=' justify-center '>
            <View className=' ml-8 mt-4 h-16 items-center justify-center  w-16 rounded-full bg-[#FF9500]'>
              <Image source={require("../../assets/images/wallet/add_contact.png")} className='h-[32] w-[38]' />
            </View>
            <ThemedText darkColor='#AEAEB2' className='ml-8 mt-2'>Add new</ThemedText>
          </View>
        </ThemedView>

      </ScrollView>
    </ThemedView>
  );
};



export default WalletPage;