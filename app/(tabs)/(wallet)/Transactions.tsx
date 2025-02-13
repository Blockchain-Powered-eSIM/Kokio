import { View, Text, Image } from 'react-native';
import React from 'react';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const Transactions = () => {
  const transactions = [
    {
      id: '1',
      name: 'Alice',
      amount: '$150.00',
      status: 'pending',
      type: 'sending',
      icon: require('../../../assets/images/wallet/contact1.png')
    },
    {
      id: '2',
      name: 'Ethan',
      amount: '$150.00',
      status: 'completed',
      type: 'received',
      icon: require('../../../assets/images/wallet/contact2.png')
    },
    {
      id: '3',
      name: 'Alice',
      amount: '$150.00',
      status: 'completed',
      type: 'received',
      icon: require('../../../assets/images/wallet/contact3.png')
    },
  ];

  return (
    <ThemedView>
      <ThemedView darkColor='#1c1c1e' className='mx-2 py-3 rounded-3xl mt-5'>
        <ThemedText darkColor='#AEAEB2' className='ml-6'>Pending</ThemedText>
        {transactions.length > 0 ? (
          <View className='gap-y-6 mt-5 mb-3'>
            {transactions.map((tr, index) => (
              tr.status === 'pending' && (
                <View key={tr.id} className='flex-row items-center justify-between mx-5'>
                  <View className='flex-row items-center'>
                    <Image source={tr.icon} className='h-[48px] w-[48px]' />
                    <View className='flex-col items-start ml-3'>
                      <ThemedText variant='xl'>{tr.name}</ThemedText>
                      <ThemedText
                        darkColor={tr.type === 'received' ? '#AEAEB2' : '#FF9F0A'}
                        variant='sm'
                      >
                        {tr.type}
                      </ThemedText>
                    </View>
                  </View>
                  <View className='flex-col items-end'>
                    <ThemedText variant='xl'>{tr.amount}</ThemedText>
                    <ThemedText
                      darkColor={tr.status === 'completed' ? '#AEAEB2' : '#FF9F0A'}
                      variant='sm'
                    >
                      {tr.status}
                    </ThemedText>
                  </View>
                </View>
              )
            ))}
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
            {transactions.map((tr, index) => (
              tr.status === 'completed' && (
                <View key={tr.id} className='flex-row items-center justify-between mx-5'>
                  <View className='flex-row items-center'>
                    <Image source={tr.icon} className='h-[48px] w-[48px]' />
                    <View className='flex-col items-start ml-3'>
                      <ThemedText variant='xl'>{tr.name}</ThemedText>
                      <ThemedText
                        darkColor={tr.type === 'received' ? '#AEAEB2' : '#FF9F0A'}
                        variant='sm'
                      >
                        {tr.type}
                      </ThemedText>
                    </View>
                  </View>
                  <View className='flex-col items-end'>
                    <ThemedText variant='xl'>{tr.amount}</ThemedText>
                    <ThemedText
                      darkColor={tr.status === 'completed' ? '#AEAEB2' : '#FF9F0A'}
                      variant='sm'
                    >
                      {tr.status}
                    </ThemedText>
                  </View>
                </View>
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