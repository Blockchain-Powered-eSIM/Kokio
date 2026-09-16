import { View, Image, Pressable, Platform, StyleSheet, ActivityIndicator , KeyboardAvoidingView } from 'react-native'
import React, { useEffect, useState , useRef, useMemo } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { router, useLocalSearchParams } from 'expo-router'
import { TextInput } from 'react-native-gesture-handler'
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import _ from 'lodash';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useToast } from '@/contexts/ToastContext'
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { useContacts, type Contact } from '@/hooks/useContacts';
import { logger } from '@/utils/logger';

interface Token {
  id: string;
  name: string
  symbol: string;
  value: string;
  icon: string;
}

interface Transaction {
  id: string;
  dateTime: string | Date; // Can adjust based on how you want to store it
  tokenAmount: string;
  name: string;
  amount: string;
  status: "pending" | "completed"; // Union type for valid statuses
  type: "sent" | "received"; // Union type for valid types
  icon: string | string [];
}

const createStyles = (colors: Palette) => StyleSheet.create({
  contentContainer: {
    backgroundColor: colors.background,
    padding: 0,
    elevation: 50,
  },
})

const SendToContact = () => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; firstName?: string; lastName?: string; monogramUrl?: string }>();
  const hasPreselectedContact = !!params.id;
  const { contacts } = useContacts();
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(params.id);
  const [amount, setAmount] = useState("0");
  const [token, setToken] = useState<Token | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading,setIsLoading] = useState(false);
  const { showToast, showMessage } = useToast();

  // When a contact was preselected via route params, use those fields directly
  // (no lookup needed). Otherwise resolve the locally-picked contact from the
  // inline list below.
  const activeContact: { id: string; firstName: string; lastName: string; monogramUrl: string } | undefined =
    hasPreselectedContact
      ? {
          id: params.id as string,
          firstName: params.firstName ?? '',
          lastName: params.lastName ?? '',
          monogramUrl: params.monogramUrl ?? '',
        }
      : contacts.find((c) => c.id === selectedContactId);

  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['96.5%', '97%'], []);
  const handleShowSheet = () => {
    sheetRef.current?.snapToIndex(1); // Snap to the first snap point (65%)
  };
  const handleSend = async () => {
    if (!activeContact) {
      showMessage("Pick a contact to send to", "error");
      return;
    }
    setIsLoading(true);
    try {
      const contactId = activeContact.id;

      // Fetch the existing contact
      const contactJson = await AsyncStorage.getItem(`contact_${contactId}`);
      const contact: Contact = contactJson ? JSON.parse(contactJson) : null;

      if (!contact) {
        throw new Error("Contact not found");
      }

      // Create a new transaction object
      const newTransaction: Transaction = {
        id: `0x${Math.random().toString(16).slice(2)}`, // Generate a random ID (replace with real tx ID if available)
        dateTime: new Date().toISOString(), // Current timestamp in ISO format
        tokenAmount: `${parseFloat(amount)} ${token?.symbol}`, // Example conversion, adjust logic as needed
        name: `${activeContact.firstName} ${activeContact.lastName}`, // Use contact's first name
        amount: `$${(parseFloat(amount) * parseFloat(token?.value || "0")).toFixed(2)}`, // Use the amount from state
        status: "completed", // Assuming send completes immediately
        type: "sent", // This is a send action
        icon: activeContact.monogramUrl, // Replace with actual icon URL
      };

      // Update the transactions array
      const updatedTransactions = [...(contact.transactions ?? []), newTransaction];

      // Update the contact object
      const updatedContact: Contact = {
        ...contact,
        transactions: updatedTransactions,
        updatedAt: new Date().toISOString(), // Update timestamp
      };

      // Save back to AsyncStorage
      await AsyncStorage.setItem(`contact_${contactId}`, JSON.stringify(updatedContact));

      logger.debug('TRANSACTION_ADDED', { newTransaction });
      router.push({pathname:"/(tabs)/(wallet)/TransactionDetails", params: { transaction: JSON.stringify(newTransaction) }})
      //@ts-expect-error non-reachable code for now, should be fixed when enabled
      showToast(newTransaction.amount,newTransaction.tokenAmount,'Sent',activeContact.firstName,activeContact.monogramUrl)
    } catch (error) {
      logger.error('TRANSACTION_ADD_FAILED', { error });
      showMessage("Failed to send transaction", "error");
    } finally {
      setIsLoading(false);
      setAmount('0');
    }
  };

  const getAllTokens = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      const data = await response.json();

      // Map the API response to the Token interface and take only the first 20
      const mappedTokens: Token[] = data.slice(0, 20).map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        value: coin.current_price.toString(), // Convert number to string for consistency
        icon: coin.image,
      }));

      // Update state with the first 20 tokens
      setTokens(mappedTokens);
      setToken(mappedTokens[0]);
    } catch (error) {
      logger.error('TOKENS_FETCH_FAILED', { error });
    }
  };

  useEffect(() => {
    // TODO: This pattern should not be used once this is enabled
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getAllTokens();
  }, [])

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      style={{ flex: 1 }}
    >
      <ThemedView className='flex-1'>
        {hasPreselectedContact ? (
          <ThemedView darkColor='black' className='w-auto  justify-center'>
            <View className='w-auto   items-center mt-8'>
              <Image source={activeContact?.monogramUrl ? { uri: activeContact.monogramUrl } : require('../../../../assets/images/wallet/sampleProfileImg.png')} className='h-[216px] w-[216px]' />
              <ThemedText variant='xxl' className='text-center mt-4'>{activeContact?.firstName} {activeContact?.lastName}</ThemedText>
            </View>
          </ThemedView>
        ) : (
          <View className='mt-6 px-4'>
            <ThemedText light className='mb-2'>To</ThemedText>
            {contacts.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedContactId(c.id)}
                className='flex-row items-center py-2 px-2 rounded-2xl mb-1'
                style={{
                  backgroundColor: selectedContactId === c.id ? colors.surface : 'transparent',
                  borderWidth: selectedContactId === c.id ? 1.5 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Image
                  source={c.monogramUrl ? { uri: c.monogramUrl } : require('../../../../assets/images/wallet/sampleProfileImg.png')}
                  className='h-[42px] w-[42px] rounded-full'
                />
                <View className='ml-3'>
                  <ThemedText bold>{c.firstName} {c.lastName}</ThemedText>
                </View>
                {selectedContactId === c.id && (
                  <View style={{ marginLeft: 'auto' }}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            ))}
            <View className='flex-row items-center py-3 px-2'>
              <View className='h-[42px] w-[42px] rounded-full items-center justify-center' style={{ borderWidth: 1.5, borderColor: colors.mutedForeground, borderStyle: 'dashed' }}>
                <Ionicons name="add" size={20} color={colors.mutedForeground} />
              </View>
              <ThemedText style={{ color: colors.mutedForeground, marginLeft: 12 }}>Paste an address</ThemedText>
            </View>
          </View>
        )}
        <View className='flex-1 mt-10 items-center'>
          <ThemedView darkColor={colors.itemBackground} className='w-auto mx-2 flex-row py-3 rounded-3xl '>
            <View className='w-[67%]'>
              <ThemedText light className='ml-6 mt-2'>Amount</ThemedText>
              <TextInput
                value={amount}
                placeholder='Enter Amount'
                className='text-[18px] text-white font-LexendSemiBold mb-2 ml-6 mt-1 '
                placeholderTextColor="white"
                onChangeText={(text) => setAmount(text)}
                keyboardType='numeric'
              />
            </View>
            <View className='w-[32%]'>
              <ThemedText light className='mt-2'>Token</ThemedText>
              <Pressable onPress={handleShowSheet} className='flex-row mt-1 gap-x-2 items-center '>
                <ThemedText variant='xl' className=''>{token?.symbol}</ThemedText>
                <Image source={{ uri: token?.icon }} className='h-[24] w-[24]' />
                <AntDesign name="down" size={24} color="white" />
              </Pressable>
            </View>
          </ThemedView>
          <ThemedText className='mt-3' >Balance: 100 {token?.symbol}</ThemedText>
          <ThemedView darkColor={colors.itemBackground} className='w-[97%] mt-3 mx-2 px-6 py-5 rounded-3xl '>
            <View className='flex-row justify-between'>
              <ThemedText>Estimated Gas Fee:</ThemedText>
              <ThemedText> 0.0014 {token?.symbol}</ThemedText>
            </View>
            <View className='flex-row mt-2 justify-between'>
              <ThemedText>Total:</ThemedText>
              <ThemedText>{(parseFloat(amount) + 0.0014).toFixed(4)} {token?.symbol}</ThemedText>
            </View>
          </ThemedView>
          <Pressable onPress={handleSend} className='w-[97%] fixed py-3  mt-[200] rounded-3xl' style={{ backgroundColor: colors.secondary }}>
            {isLoading?<ActivityIndicator size='small'/>:
            <ThemedText darkColor='black' className='text-center'>Confirm & Send {amount} {token?.symbol} </ThemedText>}
          </Pressable>
        </View>
      </ThemedView>
      <BottomSheet
        ref={sheetRef}
        index={-1} // hidden initially
        snapPoints={snapPoints}
        enablePanDownToClose
        style={{ paddingBottom: 10, borderRadius: 25 }}
        backgroundStyle={{ backgroundColor: colors.sheetBackground }}
      >
        <ThemedText variant='xl' className='text-center pt-2 pb-4' style={{ backgroundColor: colors.background }}>Select Token</ThemedText>
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
          {_.size(tokens) === 0 ? (
            <ThemedText darkColor={colors.foreground} className='mt-5 ml-2 mb-2'>
                You don&#39;t hold any tokens yet.
            </ThemedText>
          ) : (
            <ThemedView darkColor={colors.background} className='gap-y-3 mt-3 mb-3 px-4'>
              {_.map(tokens, (tk, index) => (
                <Pressable
                  onPress={() => setToken(tokens[index])}
                  key={index}
                  className="flex-row items-center justify-between mx-3 p-2 rounded-lg"
                >
                <View className="flex-row items-center">
                  <Image source={{ uri: tk?.icon }} className="h-[45px] w-[45px]" />
                  <ThemedText
                    bold
                    variant="xl"
                    darkColor={token?.id === tk.id ? colors.primary : colors.text}
                    className="ml-3"
                  >
                  {tk?.symbol}
                  </ThemedText>
                </View>
                <View className="flex-col items-end">
                  <ThemedText
                    variant="xl"
                    darkColor={token?.id === tk.id ? colors.primary : colors.text}
                  >
                  {tk?.value}
                  </ThemedText>
                </View>
                </Pressable>
              ))}
            </ThemedView>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
    </KeyboardAwareScrollView>
  )
}
export default SendToContact;
