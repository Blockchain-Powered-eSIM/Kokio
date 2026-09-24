import { View, Image, Pressable } from 'react-native';
import React, { useMemo, useCallback } from 'react';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import _ from "lodash"
import { useColors } from "@/hooks/useColors";
import { useWalletActivity } from '@/hooks/useWalletActivity';
import { walletActivityEntryToDisplayItem, type WalletActivityDisplayItem } from '@/helpers/walletActivityDisplay';

type Transaction = WalletActivityDisplayItem & { walletId?: string };

const shortenId = (address: string|undefined, startLength = 3, endLength = 6) => {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const Transactions = () => {
  const router = useRouter();
  const colors = useColors();
  const { entries } = useWalletActivity();
  const transactions = useMemo<Transaction[]>(
    () => entries.map(walletActivityEntryToDisplayItem),
    [entries],
  );

  const renderTransaction = useCallback(
    (tr: Transaction, index: number) => (
      tr.status === 'pending' && (
        <Pressable
          onPress={() => router.push({
            pathname: "/(tabs)/(wallet)/TransactionDetails",
            params: { transaction: JSON.stringify(transactions[index]) }
          })}
          key={tr?.id}
          className="flex-row items-center justify-between mx-5"
        >
          <View className='flex-row items-center'>
            <Image source={tr?.icon} className='h-[48px] w-[48px]' />
            <View className='flex-col items-start ml-3'>
              {tr.name ? (
                <ThemedText variant='xl'>{tr?.name}</ThemedText>
              ) : (
                <ThemedText variant='xl'>{tr?.walletId}</ThemedText>
              )}
              <ThemedText
                darkColor={tr?.type === 'received' ? colors.foreground : colors.primary}
                variant='sm'
              >
                {tr?.statusLabel}
              </ThemedText>
            </View>
          </View>
          <View className='flex-col items-end'>
            <ThemedText variant='xl'>{tr?.amount}</ThemedText>
            <ThemedText
              darkColor={colors.primary}
              variant='sm'
            >
              {tr?.status}
            </ThemedText>
          </View>
        </Pressable>
      )
    ),
    [router, transactions, colors] // Dependencies array
  );

  return (
    <ThemedView>
      <ThemedView darkColor={colors.itemBackground} className='mx-2 py-3 rounded-3xl mt-5'>
        <ThemedText darkColor={colors.foreground} className='ml-6'>Pending</ThemedText>
        {_.size(transactions) > 0 ? (
          <View className='gap-y-6 mt-5 mb-3'>
            {_.map(transactions, renderTransaction)}
        </View>
      ) : (
        <ThemedText darkColor={colors.foreground} className='mt-5 ml-6 mb-2'>
          No Transactions to show
        </ThemedText>
      )}

      </ThemedView>
      <ThemedView darkColor={colors.itemBackground} className='mx-2 py-3 rounded-3xl mt-5'>
        <ThemedText darkColor={colors.foreground} className='ml-6'>Completed</ThemedText>
        {transactions.length > 0 ? (
          <View className='gap-y-6 mt-5 mb-3'>
            {_.map(transactions,(tr, index) => (
              tr.status === 'completed' && (
                <Pressable
                  onPress={() => router.push({
                    pathname: "/(tabs)/(wallet)/TransactionDetails",
                    params: { transaction: JSON.stringify(transactions[index]) } // Convert object to string
                  })}
                  key={tr?.id}
                  className="flex-row items-center justify-between mx-5"
                >
                  <View className='flex-row items-center'>
                    <Image source={tr?.icon} className='h-[48px] w-[48px]' />
                    <View className='flex-col items-start ml-3'>
                    {tr?.name ? <ThemedText variant='xl'>{tr?.name}</ThemedText>:
                      <ThemedText variant='xl'>{shortenId(tr?.walletId)}</ThemedText>}
                      <ThemedText
                        darkColor={tr?.type === 'received' ? colors.foreground : colors.primary}
                        variant='sm'
                      >
                        {tr?.statusLabel}
                      </ThemedText>
                    </View>
                  </View>
                  <View className='flex-col items-end'>
                    <ThemedText variant='xl'>{tr?.amount}</ThemedText>
                    <ThemedText
                      darkColor={tr?.status === 'completed' ? colors.foreground : colors.primary}
                      variant='sm'
                    >
                      {tr?.status}
                    </ThemedText>
                  </View>
                </Pressable>
              )
            ))}
          </View>
        ) : (
          <ThemedText darkColor={colors.foreground} className='mt-5 ml-6 mb-2'>
            No Transactions to show
          </ThemedText>
        )}

      </ThemedView>
    </ThemedView>
  );
};

export default Transactions;
