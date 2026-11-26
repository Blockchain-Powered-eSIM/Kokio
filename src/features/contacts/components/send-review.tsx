import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';

export const SendReview = ({
  recipientLabel,
  amountLabel,
  networkFeeLabel,
  showSeparateFeeNote,
  totalLabel,
  insufficientForGas,
}: {
  recipientLabel: string;
  amountLabel: string;
  networkFeeLabel: string;
  showSeparateFeeNote: boolean;
  totalLabel: string;
  insufficientForGas: boolean;
}) => {
  const colors = useColors();
  const { isDark } = useTheme();

  return (
    <>
      <ThemedText bold className='mb-2 ml-1' style={{ color: isDark ? colors.mutedForeground : colors.text }}>Review</ThemedText>
      <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-full mb-3 px-5 py-4 rounded-3xl'>
        <View className='flex-row justify-between'>
          <ThemedText lightColor="#000000">To:</ThemedText>
          <ThemedText lightColor="#000000" bold>{recipientLabel}</ThemedText>
        </View>
        <View className='flex-row mt-2 justify-between'>
          <ThemedText lightColor="#000000">Amount:</ThemedText>
          <ThemedText lightColor="#000000">{amountLabel}</ThemedText>
        </View>
        <View className='flex-row mt-2 justify-between'>
          <ThemedText lightColor="#000000">Network fee:</ThemedText>
          <ThemedText lightColor="#000000">{networkFeeLabel}</ThemedText>
        </View>
        {showSeparateFeeNote && (
          <ThemedText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
            Paid from your ETH balance, separately from this transfer.
          </ThemedText>
        )}
        <View className='flex-row mt-2 justify-between'>
          <ThemedText lightColor="#000000">Total:</ThemedText>
          <ThemedText lightColor="#000000">{totalLabel}</ThemedText>
        </View>
        {insufficientForGas && (
          <ThemedText style={{ color: colors.destructive, fontSize: 12.5, marginTop: 6 }}>
            Not enough ETH to cover the network fee.
          </ThemedText>
        )}
      </ThemedView>
    </>
  );
};
