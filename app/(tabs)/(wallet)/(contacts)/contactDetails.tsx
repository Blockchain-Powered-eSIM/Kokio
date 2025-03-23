import { View, Text, Image, Pressable } from 'react-native'
import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const contactDetails = () => {
    const {id, monogramUrl, firstName, lastName, transactions,walletAddress } = useLocalSearchParams();
    // const transactions = [
    //     {
    
    //       name: 'Alice',
    //       amount: '$150.00',
    //       status: 'pending',
    //       type: 'sending',
    //       id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef5',
    //       dateTime: "2024-03-05 14:30:00 UTC",
    //       ethAmount: "0.000461 ETH",
    //       icon: require('../../../assets/images/wallet/contact1.png')
    //     },
    //     {
    //       id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef6',
    //       dateTime: "2024-03-05 14:30:00 UTC",
    //       ethAmount: "0.000461 ETH",
    //       name: 'Ethan',
    //       amount: '$150.00',
    //       status: 'completed',
    //       type: 'received',
    //       icon: require('../../../assets/images/wallet/contact2.png')
    //     },
    //     {
    //       id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef7',
    //       dateTime: "2024-03-05 14:30:00 UTC",
    //       ethAmount: "0.000461 ETH",
    //       name: 'Alice',
    //       amount: '$150.00',
    //       status: 'completed',
    //       type: 'received',
    //       icon: require('../../../assets/images/wallet/contact3.png')
    //     },
    //     {
    //       id: '0x9bfbf5000f10121edc519bdc198f2fb93e16c4fd9c20846ff837e82a8b1e2ef8',
    //       walletId: '0x3A57aD2f5F118Ee412F2bB6B76BcF9b3E4890714',
    //       dateTime: "2024-03-05 14:30:00 UTC",
    //       ethAmount: "0.000461 ETH",
    
    //       amount: '$150.00',
    //       status: 'completed',
    //       type: 'received',
    //       icon: require('../../../assets/images/wallet/wallet.png')
    //     },
    //   ];
    return (
        <ThemedView darkColor='black' className='flex-1  '>
            <View className='w-auto mt-4   items-center '>
                <Image
                    source={monogramUrl ? { uri: monogramUrl } : require('../../../../assets/images/wallet/sampleProfileImg.png')}
                    className='h-[216px] w-[216px]'
                />
                <ThemedText variant='xxl' className='text-center mt-4'>{firstName} {lastName}</ThemedText>


            </View>
            <View className='w-full h-auto  mt-10 gap-x-2 flex-row  mx-2 '>
                <Pressable className='flex-1  items-center'>
                    <ThemedView darkColor='#1c1c1e' className='w-[70%] ml-[-30] rounded-3xl py-5  justify-center items-center'>

                        <Image source={require("../../../../assets/images/wallet/sendImg.png")} className='h-[32] w-[32]' />

                        <ThemedText variant='sm' className='text-white mt-2' bold>Send</ThemedText>
                    </ThemedView>
                </Pressable>
                <Pressable className='flex-1  '>
                    <ThemedView darkColor='#1c1c1e' className='w-[70%] ml-[-20] rounded-3xl py-5   justify-center items-center'>

                        <Image source={require("../../../../assets/images/wallet/recieveImg.png")} className='h-[32] w-[32]' />
                        <ThemedText variant='sm' className='text-white mt-2' bold>Recieve</ThemedText>
                    </ThemedView>
                </Pressable>
                <Pressable onPress={()=> router.replace({pathname:"/(tabs)/(wallet)/(contacts)/editContact", params:{firstName:firstName,lastName:lastName,monogramUrl:monogramUrl,id:id,walletAddress:walletAddress}})} className='flex-1'>
                <ThemedView darkColor='#1c1c1e' className='w-[70%] ml-7  rounded-3xl py-5  justify-center items-center'>

                    <Image source={require("../../../../assets/images/wallet/sampleProfileImg.png")} className='h-[32] w-[32]' />

                    <ThemedText variant='sm' className='text-white mt-2' bold>Edit</ThemedText>
                </ThemedView>
                </Pressable>
            </View>
             <ThemedView darkColor='#1c1c1e' className=' h-auto bg-slate-300 mx-2  py-3 rounded-3xl mt-[20] '>
                      <View className='flex-row justify-between'>
                        <ThemedText darkColor='#AEAEB2' className=' ml-6'>Transactions</ThemedText>
                        {transactions?.length > 0 &&
                          <ThemedText darkColor='#AEAEB2' className=' mr-5'>See all</ThemedText>}
                      </View>
                      {transactions && transactions?.length > 0 ?
                        <View className='w-full gap-y-6 mt-5 mb-3'>
                          {transactions?.map((tr, index) => {
                            return (
                              <View key={index} className='flex-row items-center justify-between  mx-5 '>
                                <View className='flex-row items-center'>
                                  <Image source={tr.icon} className='h-[48px] w-[48px]  ' />
                                  <View className='flex-col items-start ml-3 '>
                                    <ThemedText variant='xl'>{tr.name}</ThemedText>
                                    {tr.type === "recieved"?<ThemedText darkColor='#AEAEB2' variant='sm'>{tr.type}</ThemedText>:
                                    <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.type}</ThemedText>
                                    }
                                    
                                  </View>
                                </View>
                                <View className='flex-col items-end '>
                                  <ThemedText variant='xl'>{tr.amount}</ThemedText>
                                  {tr.status === "completed"?<ThemedText darkColor='#AEAEB2' variant='sm'>{tr.status}</ThemedText>:
                                    <ThemedText darkColor='#FF9F0A' variant='sm'>{tr.status}</ThemedText>
                                    }
                                </View>
            
                              </View>
                            )
                          })}
                        </View> :
                        <ThemedText darkColor='#AEAEB2' className=' mt-5 ml-6 mb-2' >No Transactions to show</ThemedText>}
            
                    </ThemedView>

        </ThemedView>
    )
}

export default contactDetails;