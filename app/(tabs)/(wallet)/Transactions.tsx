import { View, Text, Image, Pressable } from 'react-native';
import React from 'react';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import _ from "lodash"
import { useCallback } from 'react';


interface Transaction {
  id?: string;
  status: string;
  icon?: any;
  name?: string;
  walletId?: string;
  type: string;
  amount: string;
}




const shortenId = (address: string|undefined, startLength = 3, endLength = 6) => {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const Transactions = () => {
  const router = useRouter();

  
  const transactions = [
    {

      name: 'Alice',
      amount: '$150.00',
      status: 'pending',
      type: 'sending',
      id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef5',
      dateTime: "2024-03-05 14:30:00 UTC",
      ethAmount: "0.000461 ETH",
      icon: require('../../../assets/images/wallet/contact1.png')
    },
    {
      id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef6',
      dateTime: "2024-03-05 14:30:00 UTC",
      ethAmount: "0.000461 ETH",
      name: 'Ethan',
      amount: '$150.00',
      status: 'completed',
      type: 'received',
      icon: require('../../../assets/images/wallet/contact2.png')
    },
    {
      id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef7',
      dateTime: "2024-03-05 14:30:00 UTC",
      ethAmount: "0.000461 ETH",
      name: 'Alice',
      amount: '$150.00',
      status: 'completed',
      type: 'received',
      icon: require('../../../assets/images/wallet/contact3.png')
    },
    {
      id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef8',
      walletId: '0x3A57aD2f5F118Ee412F2bB6B76BcF9b3E4890714',
      dateTime: "2024-03-05 14:30:00 UTC",
      ethAmount: "0.000461 ETH",

      amount: '$150.00',
      status: 'completed',
      type: 'received',
      icon: require('../../../assets/images/wallet/wallet.png')
    },
  ];

  const renderTransaction = useCallback(
    (tr: Transaction, index: number) => (
      tr.status === 'pending' && (
        <Pressable
          onPress={() => router.push({
            pathname: "(wallet)/transactionDetails",
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
                darkColor={tr?.type === 'received' ? '#AEAEB2' : '#FF9F0A'}
                variant='sm'
              >
                {tr?.type}
              </ThemedText>
            </View>
          </View>
          <View className='flex-col items-end'>
            <ThemedText variant='xl'>{tr?.amount}</ThemedText>
            <ThemedText
              darkColor={tr?.status === 'completed' ? '#AEAEB2' : '#FF9F0A'}
              variant='sm'
            >
              {tr?.status}
            </ThemedText>
          </View>
        </Pressable>
      )
    ),
    [router, transactions] // Dependencies array
  );

  return (
    <ThemedView>
      <ThemedView darkColor='#1c1c1e' className='mx-2 py-3 rounded-3xl mt-5'>
        <ThemedText darkColor='#AEAEB2' className='ml-6'>Pending</ThemedText>
        {_.size(transactions) > 0 ? (
          <View className='gap-y-6 mt-5 mb-3'>
            {_.map(transactions, renderTransaction)}
        </View>
      ) : (
        <ThemedText darkColor='#AEAEB2' className='mt-5 ml-6 mb-2'>
          No Transactions to show
        </ThemedText>
      )}

      </ThemedView>
      <ThemedView darkColor='#1c1c1e' className='mx-2 py-3 rounded-3xl mt-5'>
        <ThemedText darkColor='#AEAEB2' className='ml-6'>Completed</ThemedText>
        {transactions.length > 0 ? (
          <View className='gap-y-6 mt-5 mb-3'>
            {_.map(transactions,(tr, index) => (
              tr.status === 'completed' && (
                <Pressable
                  onPress={() => router.push({
                    pathname: "(wallet)/transactionDetails",
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
                        darkColor={tr?.type === 'received' ? '#AEAEB2' : '#FF9F0A'}
                        variant='sm'
                      >
                        {tr?.type}
                      </ThemedText>
                    </View>
                  </View>
                  <View className='flex-col items-end'>
                    <ThemedText variant='xl'>{tr?.amount}</ThemedText>
                    <ThemedText
                      darkColor={tr?.status === 'completed' ? '#AEAEB2' : '#FF9F0A'}
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
          <ThemedText darkColor='#AEAEB2' className='mt-5 ml-6 mb-2'>
            No Transactions to show
          </ThemedText>
        )}

      </ThemedView>
    </ThemedView>
  );
};

export default Transactions;