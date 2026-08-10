import { View, Image } from 'react-native'
import React from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import _ from "lodash";
import { useColors } from "@/hooks/useColors";

const Tokens = () => {
  const colors = useColors();
  const tokens = [
    { id: '1', name: 'USDC', symbol: 'USDC', balance: '0.5', value: '$85.23 USD', icon: require("../../../assets/images/wallet/usdc.png") },
    { id: '2', name: 'Ethereum', symbol: 'ETH', balance: '2.0', value: '$35.23 USD', icon: require("../../../assets/images/wallet/eth.png") },
    { id: '3', name: 'Unicorn', symbol: 'UNI', balance: '10.0', value: '$55.23 USD', icon: require("../../../assets/images/wallet/uni.png") },
    { id: '4', name: 'Matic', symbol: 'MATIC', balance: '10.0', value: '$35.23 USD', icon: require("../../../assets/images/wallet/matic.png") },
  ];
  return (

    <ThemedView darkColor={colors.itemBackground} className='mx-2 py-3 rounded-3xl mt-5 w-auto'>
      <View className="px-4">
        <View className='flex-row justify-between'>
          <ThemedText darkColor={colors.foreground} className='ml-2'>Your Tokens</ThemedText>
          <ThemedText darkColor={colors.foreground} className='mr-2'>Amount</ThemedText>
        </View>

        {_.size(tokens) === 0 ? (
          <ThemedText darkColor={colors.foreground} className='mt-5 ml-2 mb-2'>
            You don&#39;t hold any tokens yet.
          </ThemedText>
        ) : (
          <View className='gap-y-3 mt-5 mb-3'>
            {_.map(tokens, (token, index) => (
              <View key={index} className='flex-row items-center justify-between mx-3'>
                <View className='flex-row items-center'>
                  <Image source={token?.icon} className='h-[48px] w-[48px]' />
                  <ThemedText bold variant='xl' className='ml-3'>{token?.symbol}</ThemedText>
                </View>
                <View className='flex-col items-end'>
                  <ThemedText variant='xl'>{token?.balance}</ThemedText>
                  <ThemedText darkColor={colors.foreground} variant='sm'>{token?.value}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ThemedView>
  )
}

export default Tokens;
