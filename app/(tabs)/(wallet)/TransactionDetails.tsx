import { View, Image } from 'react-native'
import React from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useLocalSearchParams } from 'expo-router';
import Entypo from '@expo/vector-icons/Entypo';
import { useColors } from "@/hooks/useColors";

const TransactionDetails = () => {
  const colors = useColors();
  const { transaction } = useLocalSearchParams();

  // Ensure transaction is always a string
  const transactionString = Array.isArray(transaction) ? transaction[0] : transaction;
  const parsedTransaction = transactionString ? JSON.parse(transactionString) : null;
  
  return (
    <ThemedView className='flex-1'>
      <ThemedView darkColor={colors.itemBackground} className='w-auto px-7 mt-10 rounded-3xl'>
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
          <ThemedText light darkColor={colors.foreground}>{parsedTransaction?.walletId}</ThemedText>
        </View>
        }
          <View className='items-end '>
            {parsedTransaction?.type === 'received' ? <Image source={require("../../../assets/images/wallet/complete.png")} className='w-[34] h-[26] z-10 absolute top-[-30] ' /> :
              <Image source={require("../../../assets/images/wallet/incomplete.png")} className='w-[34] h-[26] z-10 absolute top-[-30]' />
            }
            <ThemedText
              darkColor={parsedTransaction?.type === 'received' ? colors.text : colors.primary}
              variant='xl'
              className='mt-6'
            >{parsedTransaction?.type}</ThemedText>
            <ThemedText
              darkColor={parsedTransaction?.type === 'received' ? colors.foreground : colors.primary}
              light
            >{parsedTransaction?.status}</ThemedText>
          </View>
        </View>
        <View className='mt-5 flex-row justify-between'>
          <ThemedText darkColor={colors.text}>Amount</ThemedText>
          <View className='items-end'>
            <ThemedText variant='xl' bold darkColor={colors.text}>{parsedTransaction?.amount}</ThemedText>
            <ThemedText light darkColor={colors.foreground}>{parsedTransaction?.ethAmount}</ThemedText>
            
          </View>
        </View>
        <View className='mt-5'>
          <ThemedText>Date and Time</ThemedText>
          <ThemedText  light darkColor={colors.foreground} className='mt-3' >{parsedTransaction?.dateTime}</ThemedText>
        </View>
        <View className='mt-5 mb-6'>
          <View className='flex-row justify-between'>
          <ThemedText>Transaction ID</ThemedText>
          <Entypo name="link" size={20} color="white" />
         
          </View>
          <ThemedText light darkColor={colors.foreground} className='mt-3' >{parsedTransaction?.id}</ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  )
}

export default TransactionDetails;
