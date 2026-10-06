import { View, Image, ScrollView } from 'react-native'
import React, { useRef } from 'react'
import BottomSheet from '@gorhom/bottom-sheet';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from "@/hooks/useColors";
import { useWalletTokens } from '@/hooks/useWalletTokens';
import { useKokio } from '@/hooks/useKokio';
import { AddTokenSheet } from '@/components/wallet/sheets/AddTokenSheet';
import { AddTokenButton } from '@/components/wallet/TokenGrid';

const Tokens = () => {
  const colors = useColors();
  const { kokio } = useKokio();
  const { tokens } = useWalletTokens(kokio.deviceWalletAddress);
  const addTokenSheetRef = useRef<BottomSheet>(null);
  return (
    <ThemedView lightColor="#FFFFFF" darkColor="#000000" className='flex-1'>
      <ScrollView className='flex-1' contentContainerStyle={{ paddingBottom: 140 }}>
        <ThemedView darkColor={colors.itemBackground} className='mx-2 py-3 rounded-3xl mt-5 w-auto'>
          <View className="px-4">
            <View className='flex-row justify-between'>
              <ThemedText darkColor={colors.foreground} className='ml-2'>Your Tokens</ThemedText>
              <ThemedText darkColor={colors.foreground} className='mr-2'>Amount</ThemedText>
            </View>

            <View className='gap-y-3 mt-5 mb-3'>
              {tokens.map((token) => (
                <View key={token.symbol} className='flex-row items-center justify-between mx-3'>
                  <View className='flex-row items-center'>
                    <Image source={token.icon} className='h-[48px] w-[48px]' />
                    <ThemedText bold variant='xl' className='ml-3'>{token.symbol}</ThemedText>
                  </View>
                  <View className='flex-col items-end'>
                    <ThemedText variant='xl'>{token.amount ?? '—'}</ThemedText>
                    <ThemedText darkColor={colors.foreground} variant='sm'>{token.usd ? `$${token.usd}` : ''}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ThemedView>
      </ScrollView>
      <View pointerEvents='box-none' className='absolute inset-x-0 bottom-0 items-center pb-6'>
        <AddTokenButton color={colors.text} onPress={() => addTokenSheetRef.current?.snapToIndex(0)} />
      </View>
      <AddTokenSheet ref={addTokenSheetRef} />
    </ThemedView>
  )
}

export default Tokens;
