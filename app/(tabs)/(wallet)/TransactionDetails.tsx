import { View, Text, Image } from 'react-native'
import React, { useEffect } from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Entypo from '@expo/vector-icons/Entypo';

const TransactionDetails = () => {

  const { transaction } = useLocalSearchParams();

  // Ensure transaction is always a string
  const transactionString = Array.isArray(transaction) ? transaction[0] : transaction;
  const parsedTransaction = transactionString ? JSON.parse(transactionString) : null;
  
  return (
    <ThemedView className='flex-1'>
      <ThemedView darkColor='#1c1c1e' className='w-auto px-7 mt-10 rounded-3xl'>
        <View className='flex-row justify-between mt-5 '>
          {parsedTransaction?.name?
          <View className='items-center'>
          <Image source={parsedTransaction?.icon} className='h-[64px] w-[64px]  ' />
          <View className='flex-col items-start mt-2 '>
            <ThemedText light >{parsedTransaction?.name}</ThemedText>
          </View>

        </View>:
        <View className='mt-6 w-[70%]'>
          <ThemedText>Wallet</ThemedText>
          <ThemedText light darkColor='#AEAEB2'>{parsedTransaction?.walletId}</ThemedText>
        </View>
        }
          
          <View className='items-end '>
            {parsedTransaction?.type === 'received' ? <Image source={require("../../../assets/images/wallet/complete.png")} className='w-[34] h-[26] z-10 absolute top-[-30] ' /> :
              <Image source={require("../../../assets/images/wallet/incomplete.png")} className='w-[34] h-[26] z-10 absolute top-[-30]' />

            }

            <ThemedText
              darkColor={parsedTransaction?.type === 'received' ? '#FFFFFf' : '#FF9F0A'}
              variant='xl'
              className='mt-6'
            >{parsedTransaction?.type}</ThemedText>
            <ThemedText
              darkColor={parsedTransaction?.type === 'received' ? '#AEAEB2' : '#FF9F0A'}

              light
            >{parsedTransaction?.status}</ThemedText>
          </View>
        </View>
        <View className='mt-5 flex-row justify-between'>
          <ThemedText darkColor='#FFFFFF'>Amount</ThemedText>
          <View className='items-end'>
            <ThemedText variant='xl' bold darkColor='#FFFFFF'>{parsedTransaction?.amount}</ThemedText>
            <ThemedText light darkColor='#AEAEB2'>{parsedTransaction?.ethAmount}</ThemedText>
            
          </View>
        </View>
        <View className='mt-5'>
          <ThemedText>Date and Time</ThemedText>
          <ThemedText  light darkColor='#AEAEB2' className='mt-3' >{parsedTransaction?.dateTime}</ThemedText>
        </View>
        <View className='mt-5 mb-6'>
          <View className='flex-row justify-between'>
          <ThemedText>Transaction ID</ThemedText>
          <Entypo name="link" size={20} color="white" />
         
          </View>
          <ThemedText light darkColor='#AEAEB2' className='mt-3' >{parsedTransaction?.id}</ThemedText>
          
        </View>

      </ThemedView>

    </ThemedView>
  )
}

export default TransactionDetails;