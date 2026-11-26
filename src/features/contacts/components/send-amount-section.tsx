import React from 'react';
import { View, Pressable } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/use-colors';
import { useTheme } from '@/contexts/ThemeContext';

export const SendAmountSection = ({
  amount,
  isLoading,
  onChangeAmount,
  onMaxPress,
  maxDisabled,
  onOpenTokenPicker,
  selectedSymbol,
  isBalanceLoading,
  isBalanceKnown,
  balance,
}: {
  amount: string;
  isLoading: boolean;
  onChangeAmount: (text: string) => void;
  onMaxPress: () => void;
  maxDisabled: boolean;
  onOpenTokenPicker: () => void;
  selectedSymbol: string;
  isBalanceLoading: boolean;
  isBalanceKnown: boolean;
  balance: string | undefined;
}) => {
  const colors = useColors();
  const { isDark } = useTheme();
  const amountTextColor = isDark ? 'white' : '#000000';

  return (
    <View className='mt-8 items-center'>
      <ThemedText bold className='mb-2 self-start ml-6' style={{ color: isDark ? colors.mutedForeground : colors.text }}>Amount</ThemedText>
      <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[95%] flex-row py-3 rounded-3xl '>
        <View className='w-[67%]'>
          <ThemedText lightColor="#000000" light className='ml-6 mt-2'>Amount</ThemedText>
          <View className='flex-row items-center mb-2 ml-6 mt-1 mr-2'>
            <TextInput
              value={amount}
              editable={!isLoading}
              placeholder='Enter Amount'
              className='text-[18px] font-LexendSemiBold'
              style={{ color: amountTextColor, flex: 1 }}
              placeholderTextColor={colors.mutedForeground}
              onChangeText={onChangeAmount}
              keyboardType='numeric'
            />
            <Pressable
              onPress={onMaxPress}
              disabled={maxDisabled}
              accessibilityRole="button"
              accessibilityLabel="Use maximum balance"
              className='rounded-full px-3 py-1'
              style={{ backgroundColor: colors.surface, opacity: maxDisabled ? 0.5 : 1 }}
            >
              <ThemedText variant='sm' bold style={{ color: colors.primary }}>Max</ThemedText>
            </Pressable>
          </View>
        </View>
        <Pressable
          onPress={onOpenTokenPicker}
          disabled={isLoading}
          className='w-[32%] flex-row items-center justify-between pr-3'
        >
          <View>
            <ThemedText lightColor="#000000" light className='mt-2'>Token</ThemedText>
            <View className='flex-row mt-1 gap-x-2 items-center '>
              <ThemedText lightColor="#000000" variant='xl'>{selectedSymbol}</ThemedText>
            </View>
            <ThemedText variant='xsm' numberOfLines={1} style={{ color: colors.mutedForeground }}>
              {isBalanceLoading ? 'Loading…' : isBalanceKnown ? balance : 'Unavailable'}
            </ThemedText>
          </View>
          <Ionicons name='chevron-down' size={16} color={colors.mutedForeground} />
        </Pressable>
      </ThemedView>
    </View>
  );
};
