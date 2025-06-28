import { View, Text, Image, Pressable } from 'react-native';
import React, { useEffect ,useState} from 'react';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import _ from "lodash"
import { useCallback } from 'react';


interface Transaction {
    id: string;
    dateTime: string | Date; // Can adjust based on how you want to store it
    tokenAmount: string;
    name?: string;
    amount: string;
    status: "pending" | "completed"; // Union type for valid statuses
    type: "sent" | "received"; // Union type for valid types
    icon: string;
    walletId?:string
  }




const shortenId = (address: string | undefined, startLength = 3, endLength = 6) => {
    if (!address) return "";
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const contactTransactions = () => {
    const router = useRouter();
    const { transactions } = useLocalSearchParams();
    const parsedTransactions: Transaction[] = transactions
    ? JSON.parse(transactions as string) // Cast to string since it’s a single string
    : [];

  // Optional: Use state if you need to manipulate transactions later
  const [transactionList, setTransactionList] = useState<Transaction[]>(parsedTransactions);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(
    parsedTransactions.filter((tx) => tx.status === "pending")
  );
  const [completedTransactions, setCompletedTransactions] = useState<Transaction[]>(
    parsedTransactions.filter((tx) => tx.status === "completed")
  );

  // Optional: Sync pendingTransactions when transactionList changes
  useEffect(() => {
    setPendingTransactions(transactionList.filter((tx) => tx.status === "pending"));
    setCompletedTransactions(transactionList.filter((tx) => tx.status === "completed"));
  }, [transactionList]);
    




    const renderTransaction = useCallback(
        (tr: Transaction, index: number) => (
            tr.status === 'pending' && (
                <Pressable
                    onPress={() => router.push({
                        pathname: "/(tabs)/(wallet)/transactionDetails",
                        params: { transaction: JSON.stringify(pendingTransactions[index]) }
                    })}
                    key={tr?.id}
                    className="flex-row items-center justify-between mx-5"
                >
                    <View className='flex-row items-center'>
                        <Image source={tr.type === 'sent'?require('../../../../assets/images/contacts/sent.png'):require('../../../../assets/images/contacts/received.png')} className='h-[48px] w-[48px]  ' />
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
                            darkColor={tr?.status === 'pending' ? '#FF9F0A':'#AEAEB2'  }
                            variant='sm'
                        >
                            {tr?.status}
                        </ThemedText>
                    </View>
                </Pressable>
            )
        ),
        [router, transactionList] // Dependencies array
    );

    return (
        <ThemedView>
            <ThemedView darkColor='#1c1c1e' className='mx-2 py-3 rounded-3xl mt-5'>
                <ThemedText darkColor='#AEAEB2' className='ml-6'>Pending</ThemedText>
                {pendingTransactions && _.size(pendingTransactions) > 0 ? (
                    <View className='gap-y-6 mt-5 mb-3'>
                        {_.map(pendingTransactions, renderTransaction)}
                    </View>
                ) : (
                    <ThemedText darkColor='#AEAEB2' className='mt-5 ml-6 mb-2'>
                        No Pending Transactions
                    </ThemedText>
                )}

            </ThemedView>
            <ThemedView darkColor='#1c1c1e' className='mx-2 py-3 rounded-3xl mt-5'>
                <ThemedText darkColor='#AEAEB2' className='ml-6'>Completed</ThemedText>
                {completedTransactions.length > 0 ? (
                    <View className='gap-y-6 mt-5 mb-3'>
                        {_.map(completedTransactions, (tr, index) => (
                            tr?.status === "completed" && (
                                <Pressable onPress={() => router.push({
                                    pathname: "/(tabs)/(wallet)/transactionDetails",
                                    params: { transaction: JSON.stringify(completedTransactions[index]) }
                                })} key={index} className='flex-row items-center justify-between  mx-5 '>
                                    <View className='flex-row items-center'>

                                        <Image source={tr.type === 'sent' ? require('../../../../assets/images/contacts/sent.png') : require('../../../../assets/images/contacts/received.png')} className='h-[48px] w-[48px]  ' />
                                        <View className='flex-col items-start ml-3 '>
                                            <ThemedText variant='xl'>{tr.name}</ThemedText>
                                            {tr.type === "received" ? <ThemedText darkColor='#AEAEB2' variant='sm'>{tr.type}</ThemedText> :
                                                <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.type}</ThemedText>
                                            }

                                        </View>
                                    </View>
                                    <View className='flex-col items-end '>
                                        <ThemedText variant='xl'>{tr.amount}</ThemedText>
                                        {tr.status === "completed" ? <ThemedText darkColor='#AEAEB2' variant='sm'>{tr.status}</ThemedText> :
                                            <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.status}</ThemedText>
                                        }
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

export default contactTransactions;