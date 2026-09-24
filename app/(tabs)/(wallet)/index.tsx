import React, { useRef, useCallback } from 'react';
import { View, ScrollView, Image, Pressable, TouchableOpacity, ActivityIndicator, Linking, type ImageSourcePropType } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useColors } from "@/hooks/useColors";
import { useTheme } from '@/contexts/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet from '@gorhom/bottom-sheet';

import { WalletHeroCard } from '@/components/wallet/WalletHeroCard';
import { ContactAvatar } from '@/components/wallet/ContactAvatar';
import { ReceiveSheet } from '@/components/wallet/sheets/ReceiveSheet';
import { DepositSheet } from '@/components/wallet/sheets/DepositSheet';
import { useKokio } from '@/hooks/useKokio';
import { useEsims } from '@/hooks/useDeviceEsims';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useEsimTopupAccess } from '@/hooks/useEsimTopupAccess';
import { useContacts } from '@/hooks/useContacts';
import { useWalletActivity } from '@/hooks/useWalletActivity';
import { esimDocToDisplayItem } from '@/helpers/esimDisplay';
import { walletActivityEntryToDisplayItem } from '@/helpers/walletActivityDisplay';
import type { ESimDocument } from '@/utils/bff/esim';
import CountryFlag from '@/components/ui/CountryFlag';
import { logger } from '@/utils/logger';

const HIDDEN_COST_BLOG_URL = 'https://kokio.app/blogs/where-your-sim-data-goes';

// TODO: kokio-sdk has no way to enumerate arbitrary tokens a wallet holds
// (no indexer). Populate this once real token detection exists — see
// KokioSDKv3.md Section 7. Empty for now, so the UI honestly shows "no
// tokens yet" instead of fabricated balances.
const tokens: { id: string; name: string; symbol: string; balance: string; value: string; icon: ImageSourcePropType }[] = [];

// Count of most recent wallet-activity entries the compact preview card shows before "See all" is needed
const TRANSACTIONS_PREVIEW_COUNT = 3;

const WALLET_BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  { icon: 'wallet-outline', title: 'Pay in stablecoins (USDC and more)', description: 'No card fees, no foriegn markup, no surprise declines' },
  { icon: 'wifi-outline', title: 'Top up without the card', description: 'No card details to type again' },
  { icon: 'shield-checkmark-outline', title: 'Own it', description: 'Funds stay on this phone, not with us' },
  { icon: 'arrow-up-circle-outline', title: 'Move leftover balance', description: 'Send unused balance to anyone' },
];

interface EsimWalletRowProps {
  doc: ESimDocument & { esimId: string };
  onPress: () => void;
}

// One row in the "eSIM wallets" list. Extracted so useWalletBalance (a hook) can
// be called per-row without violating rules-of-hooks inside `esims.map(...)`.
function EsimWalletRow({ doc, onPress }: EsimWalletRowProps) {
  const colors = useColors();
  const display = esimDocToDisplayItem(doc);
  const { balance, isLoading: isBalanceLoading } = useWalletBalance(doc.esimId);
  // Read-only display: this row never toggles top-up access itself — the
  // write lives only on the esim-wallet detail screen.
  const { topupAllowed, isLoading: isTopupLoading } = useEsimTopupAccess(doc.esimId);

  const topupStatusText = isTopupLoading
    ? 'checking top-ups'
    : topupAllowed === undefined
      ? 'top-ups unavailable'
      : topupAllowed
        ? 'top-ups allowed'
        : 'top-ups off';

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.mutedForeground,
      }}
    >
      <CountryFlag size={28} flagUrl={display.serviceRegionFlag ?? ''} />
      <View style={{ flex: 1 }}>
        <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold numberOfLines={1}>{doc.label ?? display.serviceRegionName ?? 'eSIM'}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
          {isBalanceLoading ? (
            <ActivityIndicator size="small" color={colors.cardForeground} />
          ) : (
            <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5 }}>
              {balance === undefined ? '—' : `$${balance}`}
            </ThemedText>
          )}
          <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5 }}>
            {' '}· {topupStatusText}
          </ThemedText>
        </View>
      </View>
      {isTopupLoading ? (
        <ActivityIndicator size="small" color={colors.cardForeground} />
      ) : (
        <View style={{
          width: 38, height: 22, borderRadius: 999,
          backgroundColor: topupAllowed ? colors.walletAccent : colors.muted,
          borderWidth: 1.5, borderColor: colors.mutedForeground,
          justifyContent: 'center',
          opacity: topupAllowed === undefined ? 0.4 : 1,
        }}>
          <View style={{
            width: 18, height: 18, borderRadius: 999, backgroundColor: '#fff',
            marginLeft: topupAllowed ? 18 : 2,
          }} />
        </View>
      )}
    </Pressable>
  );
}

function PendingEsimWalletRow({ doc }: { doc: ESimDocument }) {
  const colors = useColors();
  const display = esimDocToDisplayItem(doc);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.mutedForeground,
        opacity: 0.7,
      }}
    >
      <CountryFlag size={28} flagUrl={display.serviceRegionFlag ?? ''} />
      <View style={{ flex: 1 }}>
        <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold numberOfLines={1}>
          {doc.label ?? display.serviceRegionName ?? 'eSIM'}
        </ThemedText>
        <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5 }}>Setting up wallet…</ThemedText>
      </View>
      <ActivityIndicator size="small" color={colors.cardForeground} />
    </View>
  );
}

const WalletPage = () => {
  const colors = useColors();
  const { isDark } = useTheme();
  // walletAccent is teal in light mode (fine on a white card) but yellow in
  // dark mode, which now matches the card's own yellow background exactly -
  // an icon/border/chip in that color would be invisible. Fall back to
  // cardForeground (black) for on-card accents specifically in dark mode only.
  const accentOnCardColor = isDark ? colors.cardForeground : colors.walletAccent;
  const router = useRouter();
  const { kokio } = useKokio();
  const { esims } = useEsims();
  const { contacts } = useContacts();
  const { entries: walletActivityEntries } = useWalletActivity();
  const transactions = walletActivityEntries.slice(0, TRANSACTIONS_PREVIEW_COUNT).map(walletActivityEntryToDisplayItem);
  const { balance: deviceBalance, isLoading: isDeviceBalanceLoading } = useWalletBalance(kokio.deviceWalletAddress);

  const receiveSheetRef = useRef<BottomSheet>(null);
  const depositSheetRef = useRef<BottomSheet>(null);

  const handleOpenHiddenCostBlog = useCallback(async () => {
    try {
      await Linking.openURL(HIDDEN_COST_BLOG_URL);
    } catch (error) {
      logger.error('BROWSER_OPEN_FAILED', { error });
    }
  }, []);

  const acct: 'fiat' | 'device' | 'esim' = !kokio.userWallet ? 'fiat' : esims.length > 0 ? 'esim' : 'device';

  // Only eSIMs that already have a deployed on-chain wallet get a full row in
  // the "eSIM wallets" list below — a lazy eSIM (server still deploying its
  // wallet during order fulfilment) gets a "setting up" row instead, see
  // pendingEsims.
  const deployedEsims = esims.filter(
    (doc): doc is ESimDocument & { esimId: string } => !!doc.esimId,
  );
  const pendingEsims = esims.filter(
    (doc) => !doc.esimId && (doc.activationStatus === 'RELEASED' || doc.activationStatus === 'INSTALLED'),
  );

  if (acct === 'fiat') {
    return (
      <ThemedView className='flex-1 h-full w-full bg-black'>
        <ScrollView contentContainerStyle={{ paddingBottom: 100, padding: 16 }}>
          <ThemedView darkColor={colors.card} lightColor={colors.card} style={{ borderRadius: 21, padding: 18 }}>
            <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold variant='xl'>What a Kokio wallet adds</ThemedText>
            <ThemedText
              lightColor={colors.cardForeground}
              darkColor={colors.cardForeground}
              style={{ marginTop: 6, marginBottom: 16, lineHeight: 20 }}
            >
              Paying by card works fine. Here&apos;s what changes with a wallet.
            </ThemedText>
            {WALLET_BENEFITS.map((m) => (
              <View key={m.title} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <View style={{ width: 34, height: 34, borderRadius: 14, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={m.icon} size={17} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold>{m.title}</ThemedText>
                  <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, marginTop: 2 }}>{m.description}</ThemedText>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={handleOpenHiddenCostBlog}
              accessibilityRole="link"
              accessibilityLabel="Why not just a card? The hidden cost of paying by card"
              style={{ marginTop: 4 }}
            >
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5 }}>
                Why not just a card?
              </ThemedText>
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, textDecorationLine: 'underline', fontWeight: '700', marginTop: 2 }}>
                The hidden cost of paying by card →
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView
            darkColor={colors.card}
            lightColor={colors.card}
            style={{
              borderRadius: 21,
              padding: 18,
              marginTop: 16,
              borderWidth: 1.5,
              borderColor: accentOnCardColor,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons
                name={kokio.isWalletDeploying ? 'time-outline' : kokio.walletDeploymentError ? 'alert-circle-outline' : 'finger-print-outline'}
                size={22}
                color={kokio.walletDeploymentError && !kokio.isWalletDeploying ? colors.destructive : accentOnCardColor}
              />
              <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold variant='xl'>
                {kokio.isWalletDeploying
                  ? 'Setting up your wallet'
                  : kokio.walletDeploymentError
                    ? "Wallet setup didn't finish"
                    : 'Add a Kokio wallet'}
              </ThemedText>
            </View>
            <ThemedText style={{ color: colors.cardForeground, marginTop: 7, marginBottom: 14, lineHeight: 20 }}>
              {kokio.isWalletDeploying
                ? 'This can take a few minutes. Feel free to keep browsing, your card keeps working in the meantime.'
                : kokio.walletDeploymentError
                  ? kokio.walletDeploymentError
                  : 'Optional, do this anytime, setup in a second and the card keeps working.'}
            </ThemedText>
            {kokio.isWalletDeploying ? (
              <ActivityIndicator color={accentOnCardColor} style={{ marginTop: 4 }} />
            ) : (
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
                accessibilityLabel={kokio.walletDeploymentError ? "Try creating wallet again" : "Create wallet"}
              >
                <ThemedText
                  style={{ fontSize: 18, fontWeight: '700', color: colors.ctaForeground }}
                >
                  {kokio.walletDeploymentError ? 'Try again' : 'Create wallet'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView className='flex-1 h-full w-full bg-black'>
      <ScrollView className='flex-1' contentContainerStyle={{ paddingBottom: 100 }}>
        <View className='flex-1  mb-2'>
          <WalletHeroCard address={kokio.deviceWalletAddress} balance={deviceBalance} isBalanceLoading={isDeviceBalanceLoading} />
        </View>
        <View className='flex-1 gap-x-2 flex-row  mx-2 '>
          <Pressable onPress={() => router.push('/(tabs)/(wallet)/(contacts)/sendToContact' as any)} className='flex-1'>
            <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 rounded-3xl py-5  justify-center items-center'>
              <View className='p-[12] rounded-full' style={{ backgroundColor: colors.warning }}>
                <Ionicons name='arrow-up' size={20} color='#fff' />
              </View>
              <ThemedText variant='sm' lightColor={colors.cardForeground} darkColor={colors.cardForeground} className='text-white mt-2' bold>Send</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable onPress={() => receiveSheetRef.current?.snapToIndex(0)} className='flex-1'>
            <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 rounded-3xl py-5  justify-center items-center'>
              <View className='p-[12] rounded-full' style={{ backgroundColor: colors.success }}>
                <Ionicons name='arrow-down' size={20} color='#fff' />
              </View>
              <ThemedText variant='sm' lightColor={colors.cardForeground} darkColor={colors.cardForeground} className='text-white mt-2' bold>Recieve</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable onPress={() => depositSheetRef.current?.snapToIndex(0)} className='flex-1'>
            <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 rounded-3xl py-5  justify-center items-center'>
              <View className='p-[12] rounded-full' style={{ backgroundColor: colors.systemBlue }}>
                <Ionicons name='add-circle-outline' size={22} color='#fff' />
              </View>
              <ThemedText variant='sm' lightColor={colors.cardForeground} darkColor={colors.cardForeground} className='text-white mt-2' bold>Deposit</ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        <Pressable
          className='flex-1 mx-2 mt-5'
          onPress={() => router.navigate('/(tabs)/(shop)' as any)}
        >
          <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 flex-row items-center py-4 px-4 rounded-3xl'>
            <View className='w-[38] h-[38] rounded-2xl items-center justify-center' style={{ backgroundColor: accentOnCardColor }}>
              <Ionicons name='flash' size={19} color='#fff' />
            </View>
            <View className='ml-3 flex-1'>
              <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold>Buy eSIMs with USDC</ThemedText>
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, marginTop: 2 }}>No card, no personal details</ThemedText>
            </View>
            <Ionicons name='chevron-forward' size={19} color={colors.cardForeground} />
          </ThemedView>
        </Pressable>

        {acct === 'esim' && (
          <View className='mx-2 mt-5'>
            <ThemedView lightColor={colors.card} darkColor={colors.card} className='py-3 px-4 rounded-3xl'>
              <View className='flex-row justify-between items-center'>
                <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold>eSIM wallets</ThemedText>
                <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} style={{ fontSize: 12, color: colors.cardForeground }}>
                  {deployedEsims.length} active{pendingEsims.length > 0 ? ` · ${pendingEsims.length} setting up` : ''}
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, marginTop: 4, marginBottom: 12 }}>
                Each eSIM has its own wallet, owned by this device wallet.
              </ThemedText>
              <View style={{ gap: 10 }}>
                {deployedEsims.map((doc) => {
                  const display = esimDocToDisplayItem(doc);
                  return (
                    <EsimWalletRow
                      key={doc.eSimRef}
                      doc={doc}
                      onPress={() => router.push({
                        pathname: '/(tabs)/(wallet)/esim-wallet' as any,
                        params: { esimId: doc.esimId, name: display.serviceRegionName ?? '' },
                      })}
                    />
                  );
                })}
                {pendingEsims.map((doc) => (
                  <PendingEsimWalletRow key={doc.eSimRef} doc={doc} />
                ))}
              </View>
            </ThemedView>
          </View>
        )}

        <Pressable className='flex-1' onPress={() => router.push("/(tabs)/(wallet)/Tokens" as any)}>
          <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
            <View className='flex-row justify-between'>
              <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' ml-6'>Your Tokens</ThemedText>
              {tokens.length > 0 &&
                <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' mr-5'>See all</ThemedText>}
            </View>
            {tokens.length === 0 ?
              <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' mt-5 ml-6 mb-2' >You don&#39;t hold any tokens yet.</ThemedText>
              :
              <View className='flex-1 gap-y-3 mt-5 mb-3'>
                {tokens.map((token, index) => {
                  return (
                    <View key={index} className='flex-row items-center justify-between  mx-5 '>
                      <View className='flex-row items-center'>
                        <Image source={token.icon} className='h-[48px] w-[48px]  ' />
                        <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold variant='xl' className='ml-3 ' >{token.symbol}</ThemedText>
                      </View>
                      <View className='flex-col items-end '>
                        <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant='xl'>{token.balance}</ThemedText>
                        <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant='sm'>{token.value}</ThemedText>
                      </View>

                    </View>
                  )
                })}
              </View>
            }
          </ThemedView>
        </Pressable>
        <Pressable className='flex-1' onPress={()=>router.push('/(tabs)/(wallet)/Transactions' as any)}>
        <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 mx-2  py-3 rounded-3xl mt-5 '>
          <View className='flex-row justify-between'>
            <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' ml-6'>Transactions</ThemedText>
            {transactions.length > 0 &&
              <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' mr-5'>See all</ThemedText>}
          </View>
          {transactions.length > 0 ?
            <View className='flex-1 gap-y-6 mt-5 mb-3'>
              {transactions.map((tr, index) => {
                return (
                  <View key={index} className='flex-row items-center justify-between  mx-5 '>
                    <View className='flex-row items-center'>
                      <Image source={tr.icon} className='h-[48px] w-[48px]  ' />
                      <View className='flex-col items-start ml-3 '>
                        <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant='xl'>{tr.name}</ThemedText>
                        {tr.type === "recieved"?<ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant='sm'>{tr.statusLabel}</ThemedText>:
                        <ThemedText darkColor={colors.cardForeground} variant='sm'>{tr.statusLabel}</ThemedText>
                        }
                      </View>
                    </View>
                    <View className='flex-col items-end '>
                      <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant='xl'>{tr.amount}</ThemedText>
                      {tr.status === "completed"?<ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant='sm'>{tr.status}</ThemedText>:
                        <ThemedText darkColor={colors.cardForeground} variant='sm'>{tr.status}</ThemedText>
                        }
                    </View>
                  </View>
                )
              })}
            </View> :
            <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' mt-5 ml-6 mb-2' >No Transactions to show</ThemedText>}

        </ThemedView>
        </Pressable>
        <ThemedView lightColor={colors.card} darkColor={colors.card} className='flex-1 mx-2 mb-5 py-3 rounded-3xl mt-5 '>
          <Pressable onPress={()=>router.push({pathname:'/(tabs)/(wallet)/(contacts)' as any,params:{contacts:JSON.stringify(contacts)}})}>
            <View className='flex-row justify-between'>
              <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' ml-6'>Contacts</ThemedText>
              {contacts.length > 0 &&
                <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} className=' mr-5'>See all</ThemedText>}
            </View>
          </Pressable>
          <View className='flex-row ml-3 gap-y-6 mt-5 mb-3'>
            {/* Add contact is always the first item in this list. */}
            <Pressable onPress={() => router.push('/(tabs)/(wallet)/(contacts)/addContactScreen' as any)} className='items-center justify-between mx-5'>
              <View className='flex-col items-center'>
                <View className='h-[53px] w-[53px] rounded-full items-center justify-center' style={{ backgroundColor: colors.warning }}>
                  <Image source={require("../../../assets/images/wallet/add_contact.png")} className='h-[26] w-[30]' />
                </View>
                <View className='flex-col items-start mt-3 '>
                  <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground}>Add new</ThemedText>
                </View>
              </View>
            </Pressable>
            {contacts.slice(0, 3).map((person) => (
              <Pressable
                key={person.id}
                onPress={() => router.push({ pathname: '/(tabs)/(wallet)/(contacts)/contactDetails' as any, params: { id: person.id, alias: person.alias, avatarColorKey: person.avatarColorKey, transactions: JSON.stringify(person.transactions ?? []), walletAddress: person.walletAddress } })}
                className='items-center justify-between mx-5'
              >
                <View className='flex-col items-center'>
                  <ContactAvatar seed={person.id} colorKey={person.avatarColorKey} alias={person.alias} size={53} />
                  <View className='flex-col items-start mt-3 '>
                    <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground}>{person?.alias}</ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ThemedView>
      </ScrollView>
      <ReceiveSheet ref={receiveSheetRef} address={kokio.deviceWalletAddress ?? ''} />
      <DepositSheet ref={depositSheetRef} address={kokio.deviceWalletAddress ?? ''} />
    </ThemedView>
  );
};

export default WalletPage;
