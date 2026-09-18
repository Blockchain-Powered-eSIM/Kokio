import { View, Pressable, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { BottomActionBar } from '@/components/ui/BottomActionBar'
import { router, useLocalSearchParams } from 'expo-router'
import { TextInput } from 'react-native-gesture-handler'
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { isAddress, parseUnits, erc20Abi, encodeFunctionData, type Address } from 'viem';
import { useToast } from '@/contexts/ToastContext'
import { useColors } from "@/hooks/useColors";
import { useTheme } from '@/contexts/ThemeContext';
import { useContacts, type Contact } from '@/hooks/useContacts';
import { ContactAvatar } from '@/components/wallet/ContactAvatar';
import { useUsdcAsset, useWalletBalance } from '@/hooks/useWalletBalance';
import { useKokio } from '@/hooks/useKokio';
import { logger } from '@/utils/logger';

interface Transaction {
  id: string;
  dateTime: string | Date; // Can adjust based on how you want to store it
  tokenAmount: string;
  name?: string; // Contact-send only. Raw-address sends have no contact record.
  walletId?: string; // Raw-address-send only, mirrors TransactionDetails' fallback branch.
  amount: string;
  status: "pending" | "completed"; // Union type for valid statuses
  type: "sent" | "received"; // Union type for valid types
}

// react-native-passkey rethrows a plain `{ error, message }` object (NOT an
// Error instance) when the user dismisses the biometric prompt - verified
// against the installed node_modules/react-native-passkey/lib/module/PasskeyError.js
// (`UserCancelledError = { error: 'UserCancelled', message: '...' }`), which
// kokio-sdk's WebAuthn signer (`_stamp` in
// node_modules/kokio-sdk/dist/esm/logic/account-kit/createSmartAccount.js)
// rethrows unmodified from `Passkey.get(...)`. Also defensively covers a
// standard Error/DOMException-shaped cancellation in case the signer changes.
function isUserCancelledPasskeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { error?: unknown; name?: unknown; message?: unknown };
  const code = typeof candidate.error === 'string' ? candidate.error : typeof candidate.name === 'string' ? candidate.name : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return /cancel/i.test(code) || /cancel/i.test(message) || /notallowed/i.test(code);
}

const SendToContact = () => {
  const colors = useColors();
  const { isDark } = useTheme();
  const pastedAddressTextColor = isDark ? colors.text : '#000000';
  const amountTextColor = isDark ? 'white' : '#000000';
  const { kokio } = useKokio();
  const params = useLocalSearchParams<{ id?: string; alias?: string; scannedAddress?: string }>();
  const hasPreselectedContact = !!params.id;
  const { contacts } = useContacts();
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(params.id);
  const [showContactPicker, setShowContactPicker] = useState(hasPreselectedContact);
  const [pastedAddress, setPastedAddress] = useState("");
  const [amount, setAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const { showMessage } = useToast();

  const { data: asset } = useUsdcAsset();
  const { balance, isLoading: isBalanceLoading } = useWalletBalance(kokio.deviceWalletAddress);

  // A QR scan (see qrCodeScreen.tsx's `returnTo: 'send'` mode) comes back as a
  // route param rather than a direct callback, since expo-router has no
  // built-in "return a value to the previous screen" mechanism. Applied
  // during render (not an effect) so it lands in the same render pass as the
  // param change, guarded against re-applying the same value on every render.
  const [appliedScannedAddress, setAppliedScannedAddress] = useState<string | undefined>(undefined);
  if (params.scannedAddress && params.scannedAddress !== appliedScannedAddress) {
    setAppliedScannedAddress(params.scannedAddress);
    setPastedAddress(params.scannedAddress);
    setSelectedContactId(undefined);
    setShowContactPicker(false);
  }

  // When a contact was preselected via route params, use those fields directly
  // (no lookup needed). Otherwise resolve the locally-picked contact from the
  // inline list below.
  const activeContact: { id: string; alias: string } | undefined =
    hasPreselectedContact
      ? {
          id: params.id as string,
          alias: params.alias ?? '',
        }
      : contacts.find((c) => c.id === selectedContactId);

  // Route params never carry `walletAddress` (contactDetails.tsx doesn't pass
  // it), so the real destination for a contact send is always resolved by id
  // from the local contacts list, never from params.
  const contactWalletAddress = activeContact
    ? contacts.find((c) => c.id === activeContact.id)?.walletAddress
    : undefined;

  const trimmedAddress = pastedAddress.trim();
  const isRawAddressMode = trimmedAddress.length > 0;
  const showAddressError = isRawAddressMode && !isAddress(trimmedAddress);

  const isRecipientValid = isRawAddressMode
    ? isAddress(trimmedAddress)
    : !!activeContact && !!contactWalletAddress && isAddress(contactWalletAddress);

  const trimmedAmount = amount.trim();
  // Restrict fractional digits to the asset's real decimals so nothing gets
  // silently rounded by parseUnits - block instead of guessing.
  const amountFormatValid = asset
    ? new RegExp(`^\\d+(\\.\\d{1,${asset.decimals}})?$`).test(trimmedAmount)
    : /^\d+(\.\d+)?$/.test(trimmedAmount);
  const parsedAmount = Number(trimmedAmount);
  const isAmountValid = amountFormatValid && Number.isFinite(parsedAmount) && parsedAmount > 0;

  // `balance` is `undefined` while loading or on error - never treated as 0
  // (would falsely block every send) or unlimited (would allow overdraft).
  const isBalanceKnown = balance !== undefined;
  const exceedsBalance = isBalanceKnown && isAmountValid && parsedAmount > parseFloat(balance as string);

  const canSend = !isLoading && isRecipientValid && isAmountValid && isBalanceKnown && !exceedsBalance && !!asset;

  const handleScanQr = () => {
    router.push({ pathname: '/(tabs)/(wallet)/(contacts)/qrCodeScreen', params: { returnTo: 'send' } });
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setPastedAddress('');
  };

  const handleSend = async () => {
    if (isLoading) return;

    // Resolve the destination for whichever mode is active. Contact and
    // raw-address modes are mutually exclusive in UI state (see the
    // onPress/onChangeText handlers below), so exactly one of these paths
    // supplies `recipient`.
    let recipient: Address;
    let contactForLog: Contact | undefined;

    if (isRawAddressMode) {
      if (!isAddress(trimmedAddress)) {
        showMessage("Enter a valid wallet address", "error");
        return;
      }
      recipient = trimmedAddress as Address;
    } else {
      if (!activeContact) {
        showMessage("Pick a contact to send to", "error");
        return;
      }

      const contactJson = await AsyncStorage.getItem(`contact_${activeContact.id}`);
      const contact: Contact | null = contactJson ? JSON.parse(contactJson) : null;

      if (!contact || !contact.walletAddress || !isAddress(contact.walletAddress)) {
        showMessage("This contact doesn't have a valid wallet address on file", "error");
        return;
      }

      contactForLog = contact;
      recipient = contact.walletAddress as Address;
    }

    if (!amountFormatValid || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showMessage("Enter a valid amount", "error");
      return;
    }

    if (!isBalanceKnown) {
      showMessage("Balance unavailable right now - try again in a moment", "error");
      return;
    }

    if (parsedAmount > parseFloat(balance as string)) {
      showMessage("Amount exceeds your available balance", "error");
      return;
    }

    if (!asset) {
      showMessage("Asset details unavailable right now - try again in a moment", "error");
      return;
    }

    const deviceWallet = kokio.sdk?.deviceWallet;
    const smartAccountClient = kokio.sdk?.smartAccountClient;
    if (!deviceWallet || !smartAccountClient) {
      showMessage("Wallet isn't ready yet - try again in a moment", "error");
      return;
    }

    setIsLoading(true);
    try {
      const amountInSmallestUnit = parseUnits(trimmedAmount, asset.decimals);

      // Fires the passkey/biometric prompt. Resolves with the user operation
      // hash, NOT a receipt - the transfer is not confirmed yet.
      const hash = await deviceWallet.sendUserOperation([{
        to: asset.token,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [recipient, amountInSmallestUnit] }),
      }]);

      const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash });

      // A user operation whose calls REVERT still gets mined and still
      // returns a receipt - a resolved promise here is not proof the
      // transfer worked. `receipt.success` gates every success path below.
      if (!receipt.success) {
        throw new Error('Transfer reverted on-chain');
      }

      const txHash = receipt.receipt.transactionHash;
      const displayAmount = asset.isDollarUnit ? `$${parsedAmount.toFixed(2)}` : `${trimmedAmount} USDC`;

      if (contactForLog && activeContact) {
        const newTransaction: Transaction = {
          id: txHash,
          dateTime: new Date().toISOString(),
          tokenAmount: `${trimmedAmount} USDC`,
          name: activeContact.alias,
          amount: displayAmount,
          status: "completed",
          type: "sent",
        };

        const updatedTransactions = [...(contactForLog.transactions ?? []), newTransaction];
        const updatedContact: Contact = {
          ...contactForLog,
          transactions: updatedTransactions,
          updatedAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(`contact_${contactForLog.id}`, JSON.stringify(updatedContact));

        logger.debug('TRANSACTION_ADDED', { newTransaction });
        router.push({ pathname: "/(tabs)/(wallet)/TransactionDetails", params: { transaction: JSON.stringify(newTransaction) } });
      } else {
        // Raw-address sends have no contact record to append a log entry to.
        // Skip the per-contact AsyncStorage write and navigate straight to
        // TransactionDetails with a wallet-id-only record (that screen
        // already has a fallback branch for a transaction with no `name`).
        const newTransaction: Transaction = {
          id: txHash,
          dateTime: new Date().toISOString(),
          tokenAmount: `${trimmedAmount} USDC`,
          walletId: recipient,
          amount: displayAmount,
          status: "completed",
          type: "sent",
        };

        logger.debug('RAW_ADDRESS_TRANSACTION_SENT', { newTransaction });
        router.push({ pathname: "/(tabs)/(wallet)/TransactionDetails", params: { transaction: JSON.stringify(newTransaction) } });
      }

      showMessage(`Sent ${trimmedAmount} USDC`, "info");
    } catch (error) {
      if (isUserCancelledPasskeyError(error)) {
        // Quiet, distinct outcome - no scary red error toast for a user
        // dismissing their own biometric prompt.
        logger.debug('SEND_CANCELLED_BY_USER');
        return;
      }
      logger.error('SEND_FAILED', { error });
      showMessage("Failed to send transaction", "error");
    } finally {
      setIsLoading(false);
      setAmount('0');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ThemedView className='flex-1'>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps='handled'>
          <View className='mt-4 px-4'>
            <Pressable
              onPress={() => setShowContactPicker((v) => !v)}
              disabled={isLoading}
              className='flex-row items-center py-3 px-3 rounded-2xl mb-2'
              style={{ backgroundColor: colors.surface }}
            >
              <View className='h-[40px] w-[40px] rounded-full items-center justify-center' style={{ backgroundColor: colors.surfaceElevated }}>
                <Ionicons name="people-outline" size={19} color={colors.primary} />
              </View>
              <ThemedText lightColor="#000000" bold className='ml-3' style={{ flex: 1 }}>
                {activeContact ? activeContact.alias : 'Send to a contact'}
              </ThemedText>
              <Ionicons name={showContactPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
            </Pressable>

            {showContactPicker && (
              <View className='mb-2'>
                {contacts.length === 0 ? (
                  <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} className='px-3 py-2'>
                    No contacts yet.
                  </ThemedText>
                ) : (
                  contacts.map((c) => (
                    <Pressable
                      key={c.id}
                      disabled={isLoading}
                      onPress={() => handleSelectContact(c.id)}
                      className='flex-row items-center py-2 px-2 rounded-2xl mb-1'
                      style={{
                        backgroundColor: selectedContactId === c.id ? colors.surface : 'transparent',
                        borderWidth: selectedContactId === c.id ? 1.5 : 0,
                        borderColor: colors.primary,
                      }}
                    >
                      <ContactAvatar seed={c.id} colorKey={c.avatarColorKey} alias={c.alias} size={42} />
                      <View className='ml-3'>
                        <ThemedText lightColor="#000000" bold>{c.alias}</ThemedText>
                      </View>
                      {selectedContactId === c.id && (
                        <View style={{ marginLeft: 'auto' }}>
                          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                        </View>
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            )}

            <Pressable
              onPress={handleScanQr}
              disabled={isLoading}
              className='flex-row items-center py-3 px-3 rounded-2xl mb-4'
              style={{ backgroundColor: colors.surface }}
            >
              <View className='h-[40px] w-[40px] rounded-full items-center justify-center' style={{ backgroundColor: colors.surfaceElevated }}>
                <Ionicons name="qr-code-outline" size={19} color={colors.primary} />
              </View>
              <ThemedText lightColor="#000000" bold className='ml-3' style={{ flex: 1 }}>Scan QR</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>

            <ThemedText lightColor="#000000" light className='mb-2'>Or paste an address</ThemedText>
            <View className='flex-row items-center py-3 px-3 rounded-2xl' style={{ backgroundColor: colors.surface }}>
              <TextInput
                value={pastedAddress}
                editable={!isLoading}
                onChangeText={(text) => { setPastedAddress(text); setSelectedContactId(undefined); }}
                placeholder='0x...'
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize='none'
                autoCorrect={false}
                style={{ color: pastedAddressTextColor, flex: 1 }}
              />
            </View>
            {showAddressError && (
              <ThemedText style={{ color: colors.destructive }} className='ml-2 mt-1'>
                Enter a valid wallet address
              </ThemedText>
            )}
          </View>

          <View className='mt-8 items-center'>
            <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[95%] flex-row py-3 rounded-3xl '>
              <View className='w-[67%]'>
                <ThemedText lightColor="#000000" light className='ml-6 mt-2'>Amount</ThemedText>
                <TextInput
                  value={amount}
                  editable={!isLoading}
                  placeholder='Enter Amount'
                  className='text-[18px] font-LexendSemiBold mb-2 ml-6 mt-1 '
                  style={{ color: amountTextColor }}
                  placeholderTextColor={colors.mutedForeground}
                  onChangeText={(text) => setAmount(text)}
                  keyboardType='numeric'
                />
              </View>
              <View className='w-[32%]'>
                <ThemedText lightColor="#000000" light className='mt-2'>Token</ThemedText>
                <View className='flex-row mt-1 gap-x-2 items-center '>
                  <ThemedText lightColor="#000000" variant='xl'>USDC</ThemedText>
                </View>
              </View>
            </ThemedView>
            <ThemedText lightColor="#000000" className='mt-3'>
              {isBalanceLoading
                ? 'Balance: Loading…'
                : isBalanceKnown
                  ? `Balance: ${balance} USDC`
                  : 'Balance: unavailable'}
            </ThemedText>
            <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[95%] mt-3 px-6 py-5 rounded-3xl '>
              <View className='flex-row justify-between'>
                <ThemedText lightColor="#000000">Estimated Gas Fee:</ThemedText>
                <ThemedText lightColor="#000000"> 0.0014 USDC</ThemedText>
              </View>
              <View className='flex-row mt-2 justify-between'>
                <ThemedText lightColor="#000000">Total:</ThemedText>
                <ThemedText lightColor="#000000">{(parseFloat(amount || '0') + 0.0014).toFixed(4)} USDC</ThemedText>
              </View>
            </ThemedView>
          </View>
        </ScrollView>

        <BottomActionBar>
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className='w-full py-3 rounded-3xl'
            style={{ backgroundColor: colors.secondary, opacity: canSend ? 1 : 0.5 }}
          >
            {isLoading ? <ActivityIndicator size='small' /> :
            <ThemedText lightColor="#000000" darkColor='black' className='text-center'>Confirm & Send {amount} USDC</ThemedText>}
          </Pressable>
        </BottomActionBar>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}
export default SendToContact;
