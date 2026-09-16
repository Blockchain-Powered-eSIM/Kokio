import React, { useRef } from 'react';
import { View, ScrollView, Image, Pressable, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useColors } from "@/hooks/useColors";
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet from '@gorhom/bottom-sheet';

import { WalletHeroCard } from '@/components/wallet/WalletHeroCard';
import { ReceiveSheet } from '@/components/wallet/sheets/ReceiveSheet';
import { DepositSheet } from '@/components/wallet/sheets/DepositSheet';
import { useKokio } from '@/hooks/useKokio';
import { useEsims } from '@/hooks/useDeviceEsims';
import { useContacts } from '@/hooks/useContacts';
import { esimDocToDisplayItem } from '@/helpers/esimDisplay';
import { getMockEsimWalletStats } from './mockWalletData';
import CountryFlag from '@/components/ui/CountryFlag';
import { PASSKEY_LABEL } from '@/constants/passkey.constants';
import { DARK_TOKENS, LIGHT_TOKENS } from '@/constants/Colors';

// Balance stays mocked: no kokio.sdk balance-read surface is wired up yet
// (KokioSDKv3.md Section 4, deferred). Identity (address, real eSIMs) is real.
const MOCK_DEVICE_BALANCE = '210.92';

const tokens = [
  { id: '1', name: 'USDC', symbol: 'USDC', balance: '0.5', value: '$85.23 USD', icon: require("../../../assets/images/wallet/usdc.png") },
  { id: '2', name: 'Ethereum', symbol: 'ETH', balance: '2.0', value: '$35.23 USD', icon: require("../../../assets/images/wallet/eth.png") },
  { id: '3', name: 'Unicorn', symbol: 'UNI', balance: '10.0', value: '$55.23 USD', icon: require("../../../assets/images/wallet/uni.png") },
  { id: '4', name: 'Matic', symbol: 'MATIC', balance: '10.0', value: '$35.23 USD', icon: require("../../../assets/images/wallet/matic.png") },
];

const transactions = [
  { id: '1', name: 'Alice', amount: '$150.00', status: "pending", type: "sending", icon: require('../../../assets/images/wallet/contact1.png') },
  { id: '2', name: 'Ethan', amount: '$150.00', status: "completed", type: "recieved", icon: require('../../../assets/images/wallet/contact2.png') },
  { id: '3', name: 'Alice', amount: '$150.00', status: "completed", type: "recieved", icon: require('../../../assets/images/wallet/contact3.png') },
];

const MISSING_OUT: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  { icon: 'wifi-outline', title: 'Top-ups that skip the card', description: 'Add data without typing card details again' },
  { icon: 'flash-outline', title: 'eSIMs that refill themselves', description: 'Set it once and never run dry mid-trip' },
  { icon: 'wallet-outline', title: 'Pay in USDC', description: 'No card fees, no foreign exchange markup' },
  { icon: 'arrow-up-circle-outline', title: 'Move leftover balance', description: 'Send what you did not use to anyone' },
];

const WalletPage = () => {
  const colors = useColors();
  const router = useRouter();
  const { kokio } = useKokio();
  const { esims } = useEsims();
  const { contacts } = useContacts();

  const receiveSheetRef = useRef<BottomSheet>(null);
  const depositSheetRef = useRef<BottomSheet>(null);

  const acct: 'fiat' | 'device' | 'esim' = !kokio.userWallet ? 'fiat' : esims.length > 0 ? 'esim' : 'device';

  if (acct === 'fiat') {
    return (
      <ThemedView className='flex-1 h-full w-full bg-black'>
        <ScrollView contentContainerStyle={{ paddingBottom: 100, padding: 16 }}>
          <ThemedView darkColor={colors.surface} lightColor={colors.surface} style={{ borderRadius: 21, padding: 18 }}>
            <ThemedText bold variant='xl'>What you&apos;re missing out on</ThemedText>
            <ThemedText
              lightColor={LIGHT_TOKENS.text}
              darkColor={DARK_TOKENS.mutedForeground}
              style={{ marginTop: 6, marginBottom: 16, lineHeight: 20 }}
            >
              Paying by card works fine. These four things only work with a Kokio wallet.
            </ThemedText>
            {MISSING_OUT.map((m) => (
              <View key={m.title} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <View style={{ width: 34, height: 34, borderRadius: 14, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={m.icon} size={17} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText bold>{m.title}</ThemedText>
                  <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 2 }}>{m.description}</ThemedText>
                </View>
              </View>
            ))}
          </ThemedView>

          <ThemedView
            darkColor={colors.surface}
            lightColor={colors.surface}
            style={{
              borderRadius: 21,
              padding: 18,
              marginTop: 16,
              borderWidth: 1.5,
              borderColor: colors.walletAccent,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name='finger-print-outline' size={22} color={colors.walletAccent} />
              <ThemedText bold variant='xl'>Add a Kokio wallet</ThemedText>
            </View>
            <ThemedText style={{ color: colors.mutedForeground, marginTop: 7, marginBottom: 14, lineHeight: 20 }}>
              Optional. Pay in USDC, top up eSIMs without re-entering a card, and keep buying by card whenever you prefer.
            </ThemedText>
            {[
              [`Signed with ${PASSKEY_LABEL}`, 'No seed phrase to write down'],
              ['Lives on this device', 'We never hold your funds'],
              ['Card still works', 'Nothing you use today changes'],
            ].map(([title, description]) => (
              <View key={title} style={{ flexDirection: 'row', gap: 10, marginBottom: 9, alignItems: 'flex-start' }}>
                <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Ionicons name='checkmark' size={12} color={colors.walletAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText bold style={{ fontSize: 14 }}>{title}</ThemedText>
                  <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5 }}>{description}</ThemedText>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={{
                width: '100%',
                minHeight: 50,
                borderRadius: 999,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 16,
                backgroundColor: colors.ctaBackground,
              }}
              onPress={() => router.push('/(tabs)/(wallet)/create-wallet' as any)}
              accessibilityRole="button"
              accessibilityLabel="Create wallet"
            >
              <ThemedText
                style={{ fontSize: 16, fontWeight: '700', color: colors.ctaForeground }}
              >
                Create wallet
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView className='flex-1 h-full w-full bg-black'>
      <ScrollView className='flex-1' contentContainerStyle={{ paddingBottom: 100 }}>
        <View className='flex-1  mb-2'>
          <WalletHeroCard address={kokio.deviceWalletAddress} balance={MOCK_DEVICE_BALANCE} />
        </View>
        <View className='flex-1 gap-x-2 flex-row  mx-2 '>
          <Pressable onPress={() => router.push('/(tabs)/(wallet)/(contacts)/sendToContact' as any)} className='flex-1'>
            <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 rounded-3xl py-5  justify-center items-center'>
              <View className='p-[12] rounded-full' style={{ backgroundColor: colors.warning }}>
                <Ionicons name='arrow-up' size={20} color='#fff' />
              </View>
              <ThemedText variant='sm' className='text-white mt-2' bold>Send</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable onPress={() => receiveSheetRef.current?.snapToIndex(0)} className='flex-1'>
            <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 rounded-3xl py-5  justify-center items-center'>
              <View className='p-[12] rounded-full' style={{ backgroundColor: colors.success }}>
                <Ionicons name='arrow-down' size={20} color='#fff' />
              </View>
              <ThemedText variant='sm' className='text-white mt-2' bold>Recieve</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable onPress={() => depositSheetRef.current?.snapToIndex(0)} className='flex-1'>
            <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 rounded-3xl py-5  justify-center items-center'>
              <View className='p-[12] rounded-full' style={{ backgroundColor: colors.systemBlue }}>
                <Ionicons name='add-circle-outline' size={22} color='#fff' />
              </View>
              <ThemedText variant='sm' className='text-white mt-2' bold>Deposit</ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        <Pressable
          className='flex-1 mx-2 mt-5'
          onPress={() => router.navigate('/(tabs)/(shop)' as any)}
        >
          <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 flex-row items-center py-4 px-4 rounded-3xl'>
            <View className='w-[38] h-[38] rounded-2xl items-center justify-center' style={{ backgroundColor: colors.walletAccent }}>
              <Ionicons name='flash' size={19} color='#fff' />
            </View>
            <View className='ml-3 flex-1'>
              <ThemedText bold>Buy eSIMs with USDC</ThemedText>
              <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 2 }}>No card, no personal details</ThemedText>
            </View>
            <Ionicons name='chevron-forward' size={19} color={colors.mutedForeground} />
          </ThemedView>
        </Pressable>

        {acct === 'esim' && (
          <View className='mx-2 mt-5'>
            <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='py-3 px-4 rounded-3xl'>
              <View className='flex-row justify-between items-center'>
                <ThemedText darkColor={colors.foreground} bold>eSIM wallets</ThemedText>
                <ThemedText darkColor={colors.foreground} style={{ fontSize: 12, color: colors.mutedForeground }}>{esims.length} active</ThemedText>
              </View>
              <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 4, marginBottom: 12 }}>
                Each eSIM has its own wallet, owned by this device wallet.
              </ThemedText>
              <View style={{ gap: 10 }}>
                {esims.map((doc) => {
                  const display = esimDocToDisplayItem(doc);
                  const stats = getMockEsimWalletStats(doc.esimId);
                  return (
                    <Pressable
                      key={doc.esimId}
                      onPress={() => router.push({
                        pathname: '/(tabs)/(wallet)/esim-wallet' as any,
                        params: { esimId: doc.esimId, name: display.serviceRegionName ?? '' },
                      })}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <CountryFlag size={28} flagUrl={display.serviceRegionFlag ?? ''} />
                      <View style={{ flex: 1 }}>
                        <ThemedText bold numberOfLines={1}>{display.serviceRegionName ?? 'eSIM'}</ThemedText>
                        <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 1 }}>
                          ${stats.balance} · {stats.topupAllowed ? 'top-ups allowed' : 'top-ups off'}
                        </ThemedText>
                      </View>
                      <View style={{
                        width: 38, height: 22, borderRadius: 999,
                        backgroundColor: stats.topupAllowed ? colors.walletAccent : colors.muted,
                        justifyContent: 'center',
                      }}>
                        <View style={{
                          width: 18, height: 18, borderRadius: 999, backgroundColor: '#fff',
                          marginLeft: stats.topupAllowed ? 18 : 2,
                        }} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ThemedView>
          </View>
        )}

        <Pressable className='flex-1' onPress={() => router.push("/(tabs)/(wallet)/Tokens" as any)}>
          <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
            <View className='flex-row justify-between'>
              <ThemedText darkColor={colors.foreground} className=' ml-6'>Your Tokens</ThemedText>
              {tokens.length > 0 &&
                <ThemedText darkColor={colors.foreground} className=' mr-5'>See all</ThemedText>}
            </View>
            {tokens.length === 0 ?
              <ThemedText darkColor={colors.foreground} className=' mt-5 ml-6 mb-2' >You don&#39;t hold any tokens yet.</ThemedText>
              :
              <View className='flex-1 gap-y-3 mt-5 mb-3'>
                {tokens.map((token, index) => {
                  return (
                    <View key={index} className='flex-row items-center justify-between  mx-5 '>
                      <View className='flex-row items-center'>
                        <Image source={token.icon} className='h-[48px] w-[48px]  ' />
                        <ThemedText bold variant='xl' className='ml-3 ' >{token.symbol}</ThemedText>
                      </View>
                      <View className='flex-col items-end '>
                        <ThemedText variant='xl'>{token.balance}</ThemedText>
                        <ThemedText darkColor={colors.foreground} variant='sm'>{token.value}</ThemedText>
                      </View>

                    </View>
                  )
                })}
              </View>
            }
          </ThemedView>
        </Pressable>
        <Pressable className='flex-1' onPress={()=>router.push('/(tabs)/(wallet)/Transactions' as any)}>
        <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
          <View className='flex-row justify-between'>
            <ThemedText darkColor={colors.foreground} className=' ml-6'>Transactions</ThemedText>
            {transactions.length > 0 &&
              <ThemedText darkColor={colors.foreground} className=' mr-5'>See all</ThemedText>}
          </View>
          {transactions.length > 0 ?
            <View className='flex-1 gap-y-6 mt-5 mb-3'>
              {transactions.map((tr, index) => {
                return (
                  <View key={index} className='flex-row items-center justify-between  mx-5 '>
                    <View className='flex-row items-center'>
                      <Image source={tr.icon} className='h-[48px] w-[48px]  ' />
                      <View className='flex-col items-start ml-3 '>
                        <ThemedText variant='xl'>{tr.name}</ThemedText>
                        {tr.type === "recieved"?<ThemedText darkColor={colors.foreground} variant='sm'>{tr.type}</ThemedText>:
                        <ThemedText darkColor={colors.highlight} variant='sm'>{tr.type}</ThemedText>
                        }
                      </View>
                    </View>
                    <View className='flex-col items-end '>
                      <ThemedText variant='xl'>{tr.amount}</ThemedText>
                      {tr.status === "completed"?<ThemedText darkColor={colors.foreground} variant='sm'>{tr.status}</ThemedText>:
                        <ThemedText darkColor={colors.highlight} variant='sm'>{tr.status}</ThemedText>
                        }
                    </View>
                  </View>
                )
              })}
            </View> :
            <ThemedText darkColor={colors.foreground} className=' mt-5 ml-6 mb-2' >No Transactions to show</ThemedText>}

        </ThemedView>
        </Pressable>
        <Pressable className='flex-1' onPress={()=>router.push({pathname:'/(tabs)/(wallet)/(contacts)' as any,params:{contacts:JSON.stringify(contacts)}})}>
        <ThemedView lightColor={colors.itemBackground} darkColor={colors.itemBackground} className='flex-1 mx-2 mb-5 py-3 rounded-3xl mt-5 '>
          <View className='flex-row justify-between'>
            <ThemedText darkColor={colors.foreground} className=' ml-6'>Contacts</ThemedText>
            {contacts.length > 0 &&
              <ThemedText darkColor={colors.foreground} className=' mr-5'>See all</ThemedText>}
          </View>
          {contacts.length > 0 ? <View className='flex-row ml-3 gap-y-6 mt-5 mb-3'>
            {contacts.slice(0,4).map((person, index) => {
              return (
                <View key={index} className=' items-center justify-between  mx-5 '>
                  <View className='flex-col items-center'>
                    <Image  source={person.monogramUrl ? { uri: person.monogramUrl } : require('../../../assets/images/wallet/sampleProfileImg.png')} className='h-[53px] w-[53px]  ' />
                    <View className='flex-col items-start mt-3 '>
                      <ThemedText >{person?.firstName}</ThemedText>
                    </View>
                  </View>
                  <View className='flex-col items-end '>
                  </View>
                </View>
              )
            })}
          </View> :
            <View className=' justify-center '>
              <View className='ml-8 mt-4 h-16 items-center justify-center w-16 rounded-full' style={{ backgroundColor: colors.warning }}>
                <Ionicons name='person-add-outline' size={22} color='#fff' />
              </View>
              <ThemedText darkColor={colors.foreground} className='ml-8 mt-2'>Add new</ThemedText>
            </View>
          }
        </ThemedView>
        </Pressable>
      </ScrollView>
      <ReceiveSheet ref={receiveSheetRef} address={kokio.deviceWalletAddress ?? ''} />
      <DepositSheet ref={depositSheetRef} />
    </ThemedView>
  );
};

export default WalletPage;
