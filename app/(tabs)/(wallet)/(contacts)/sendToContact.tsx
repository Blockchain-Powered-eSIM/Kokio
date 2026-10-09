import { View, Pressable, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { BottomActionBar } from '@/components/ui/BottomActionBar'
import { router, useLocalSearchParams } from 'expo-router'
import { TextInput } from 'react-native-gesture-handler'
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Clipboard from 'expo-clipboard'
import { isAddress, parseUnits, type Address } from 'viem';
import { useToast } from '@/contexts/ToastContext'
import { useColors } from "@/hooks/useColors";
import { useTheme } from '@/contexts/ThemeContext';
import { useContacts, type Contact } from '@/hooks/useContacts';
import { ContactAvatar } from '@/components/wallet/ContactAvatar';
import { TokenIcon } from '@/components/wallet/TokenIcon';
import { useWalletTokens, type WalletToken } from '@/hooks/useWalletTokens';
import { useCustomTokens } from '@/hooks/useCustomTokens';
import { useGasEstimate, formatFeeEth } from '@/hooks/useGasEstimate';
import { buildTransferCall } from '@/helpers/walletTransferCall';
import { useKokio } from '@/hooks/useKokio';
import { logger } from '@/utils/logger';
import { isUserCancelledPasskeyError } from '@/utils/formatOnChainError';

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
  const [selectedSymbol, setSelectedSymbol] = useState("USDC");
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const { showMessage } = useToast();

  const { tokens: customTokens } = useCustomTokens();
  const { tokens, isLoading: isTokensLoading } = useWalletTokens(kokio.deviceWalletAddress, customTokens);
  // Only tokens whose balance actually resolved can be picked - one that
  // failed to read (amount undefined) can't be validated against a balance,
  // so offering it would let a send attempt through with no real check.
  const sendableTokens = tokens.filter((t) => t.amount !== undefined);
  const selectedToken: WalletToken | undefined = tokens.find((t) => t.symbol === selectedSymbol);
  const isBalanceLoading = isTokensLoading;
  const balance = selectedToken?.amount;

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
  // Restrict fractional digits to the token's real decimals so nothing gets
  // silently rounded by parseUnits - block instead of guessing.
  const amountFormatValid = selectedToken
    ? new RegExp(`^\\d+(\\.\\d{1,${selectedToken.decimals}})?$`).test(trimmedAmount)
    : /^\d+(\.\d+)?$/.test(trimmedAmount);
  const parsedAmount = Number(trimmedAmount);
  const isAmountValid = amountFormatValid && Number.isFinite(parsedAmount) && parsedAmount > 0;

  // `balance` is `undefined` while loading or on error - never treated as 0
  // (would falsely block every send) or unlimited (would allow overdraft).
  const isBalanceKnown = balance !== undefined;
  const exceedsBalance = isBalanceKnown && isAmountValid && parsedAmount > parseFloat(balance as string);

  // The recipient this screen currently resolves to, for the live fee
  // preview only - `handleSend` re-resolves it fresh (re-reading the contact
  // from AsyncStorage) before actually sending, so a stale preview address
  // can never affect where funds go.
  const previewRecipient: Address | undefined = isRawAddressMode
    ? (isAddress(trimmedAddress) ? (trimmedAddress as Address) : undefined)
    : (contactWalletAddress && isAddress(contactWalletAddress) ? (contactWalletAddress as Address) : undefined);

  // Debounced so a gas estimate (a real bundler + paymaster round trip) isn't
  // fired on every keystroke.
  const [debouncedAmount, setDebouncedAmount] = useState(trimmedAmount);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAmount(trimmedAmount), 500);
    return () => clearTimeout(timer);
  }, [trimmedAmount]);

  const previewCall = useMemo(() => {
    if (!selectedToken || !previewRecipient) return undefined;
    if (!new RegExp(`^\\d+(\\.\\d{1,${selectedToken.decimals}})?$`).test(debouncedAmount)) return undefined;
    const parsed = Number(debouncedAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    try {
      return buildTransferCall(selectedToken, previewRecipient, parseUnits(debouncedAmount, selectedToken.decimals));
    } catch {
      return undefined;
    }
  }, [selectedToken, previewRecipient, debouncedAmount]);

  const { data: gasEstimate, isLoading: isGasEstimateLoading, isError: isGasEstimateError } = useGasEstimate(previewCall);

  // Gas (when not sponsored) is always paid from the account's own ETH,
  // regardless of which token is being sent - so it's checked against the
  // ETH balance, not the sent token's balance.
  const ethToken = tokens.find((t) => t.symbol === 'ETH');
  const needsOwnFee = gasEstimate && !gasEstimate.isSponsored ? gasEstimate.feeWei : undefined;
  const nativeNeededWei = needsOwnFee !== undefined
    ? needsOwnFee + (selectedToken?.symbol === 'ETH' && isAmountValid ? parseUnits(trimmedAmount, 18) : 0n)
    : undefined;
  const insufficientForGas = !!(
    nativeNeededWei !== undefined &&
    ethToken?.amount !== undefined &&
    nativeNeededWei > parseUnits(ethToken.amount, 18)
  );

  const canSend = !isLoading && isRecipientValid && isAmountValid && isBalanceKnown && !exceedsBalance && !!selectedToken && !insufficientForGas;

  const networkFeeLabel = !previewCall
    ? '—'
    : isGasEstimateLoading
      ? 'Estimating…'
      : isGasEstimateError
        ? 'Unavailable'
        : gasEstimate?.isSponsored
          ? 'Sponsored - free'
          : gasEstimate?.feeWei !== undefined
            ? `~${formatFeeEth(gasEstimate.feeWei)} ETH`
            : '—';

  // The fee is only foldable into "Total" when it's paid in the same
  // currency being sent (a native ETH send) - otherwise it's a separate ETH
  // cost shown on its own row, not added to a USDC/custom-token amount.
  const totalLabel = gasEstimate && !gasEstimate.isSponsored && gasEstimate.feeWei !== undefined && selectedToken?.symbol === 'ETH'
    ? `${formatFeeEth((isAmountValid ? parseUnits(trimmedAmount, 18) : 0n) + gasEstimate.feeWei)} ${selectedSymbol}`
    : `${trimmedAmount || '0'} ${selectedSymbol}`;

  const handleScanQr = () => {
    router.push({ pathname: '/(tabs)/(wallet)/(contacts)/qrCodeScreen', params: { returnTo: 'send' } });
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setPastedAddress('');
  };

  // Starting value is "0" so the field never shows blank, but a controlled
  // TextInput just appends - typing "1" on top of "0" produces the full
  // string "01", not "1". Strip a leading zero immediately followed by
  // another digit, same as a normal numeric field - "0.5" is left alone
  // since the zero there is required syntax, not a stray prefix.
  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/^0+(?=\d)/, ''));
  };

  const handlePasteAddress = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const trimmedText = text.trim();
      if (!trimmedText) {
        showMessage("Clipboard is empty", "error");
        return;
      }
      // Clipboard content is often more than just the address - a label, a
      // deep link, extra characters picked up from wherever it was copied.
      // Pull the address itself out rather than rejecting the whole blob.
      const match = trimmedText.match(/0x[0-9a-fA-F]{40}/);
      setPastedAddress(match ? match[0] : trimmedText);
      setSelectedContactId(undefined);
    } catch (error) {
      logger.error('CLIPBOARD_PASTE_FAILED', { error });
      showMessage("Couldn't read from clipboard", "error");
    }
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

    if (!selectedToken) {
      showMessage("Token details unavailable right now - try again in a moment", "error");
      return;
    }

    if (insufficientForGas) {
      showMessage("Not enough ETH to cover the network fee", "error");
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
      const amountInSmallestUnit = parseUnits(trimmedAmount, selectedToken.decimals);
      const call = buildTransferCall(selectedToken, recipient, amountInSmallestUnit);

      // Fires the passkey/biometric prompt. Resolves with the user operation
      // hash, NOT a receipt - the transfer is not confirmed yet.
      const hash = await deviceWallet.sendUserOperation([call]);

      const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash });

      // A user operation whose calls REVERT still gets mined and still
      // returns a receipt - a resolved promise here is not proof the
      // transfer worked. `receipt.success` gates every success path below.
      if (!receipt.success) {
        throw new Error('Transfer reverted on-chain');
      }

      const txHash = receipt.receipt.transactionHash;
      const displayAmount = `${trimmedAmount} ${selectedToken.symbol}`;

      if (contactForLog && activeContact) {
        const newTransaction: Transaction = {
          id: txHash,
          dateTime: new Date().toISOString(),
          tokenAmount: displayAmount,
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
          tokenAmount: displayAmount,
          walletId: recipient,
          amount: displayAmount,
          status: "completed",
          type: "sent",
        };

        logger.debug('RAW_ADDRESS_TRANSACTION_SENT', { newTransaction });
        router.push({ pathname: "/(tabs)/(wallet)/TransactionDetails", params: { transaction: JSON.stringify(newTransaction) } });
      }

      showMessage(`Sent ${displayAmount}`, "info");
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
              <Pressable
                onPress={handlePasteAddress}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Paste address from clipboard"
                style={{ paddingLeft: 10 }}
              >
                <ThemedText bold style={{ color: colors.primary }}>Paste</ThemedText>
              </Pressable>
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
                  onChangeText={handleAmountChange}
                  keyboardType='numeric'
                />
              </View>
              <Pressable
                onPress={() => setShowTokenPicker((v) => !v)}
                disabled={isLoading}
                className='w-[32%] flex-row items-center justify-between pr-3'
              >
                <View>
                  <ThemedText lightColor="#000000" light className='mt-2'>Token</ThemedText>
                  <View className='flex-row mt-1 gap-x-2 items-center '>
                    <ThemedText lightColor="#000000" variant='xl'>{selectedSymbol}</ThemedText>
                  </View>
                </View>
                <Ionicons name={showTokenPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
              </Pressable>
            </ThemedView>

            {showTokenPicker && (
              <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[95%] mt-2 py-2 rounded-3xl'>
                {sendableTokens.map((token) => (
                  <Pressable
                    key={token.symbol}
                    onPress={() => { setSelectedSymbol(token.symbol); setShowTokenPicker(false); }}
                    className='flex-row items-center justify-between py-2 px-5'
                  >
                    <View className='flex-row items-center gap-x-3'>
                      <TokenIcon symbol={token.symbol} icon={token.icon} size={28} />
                      <ThemedText lightColor="#000000" bold={token.symbol === selectedSymbol}>{token.symbol}</ThemedText>
                    </View>
                    <ThemedText lightColor="#000000" style={{ color: colors.mutedForeground }}>{token.amount}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            )}

            <ThemedText lightColor="#000000" className='mt-3'>
              {isBalanceLoading
                ? 'Balance: Loading…'
                : isBalanceKnown
                  ? `Balance: ${balance} ${selectedSymbol}`
                  : 'Balance: unavailable'}
            </ThemedText>
            <ThemedView lightColor="#FFFFFF" darkColor={colors.itemBackground} className='w-[95%] mt-3 px-6 py-5 rounded-3xl '>
              <View className='flex-row justify-between'>
                <ThemedText lightColor="#000000">Network fee:</ThemedText>
                <ThemedText lightColor="#000000">{networkFeeLabel}</ThemedText>
              </View>
              {gasEstimate && !gasEstimate.isSponsored && selectedToken?.symbol !== 'ETH' && (
                <ThemedText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  Paid from your ETH balance, separately from this transfer.
                </ThemedText>
              )}
              <View className='flex-row mt-2 justify-between'>
                <ThemedText lightColor="#000000">Total:</ThemedText>
                <ThemedText lightColor="#000000">{totalLabel}</ThemedText>
              </View>
              {insufficientForGas && (
                <ThemedText style={{ color: colors.destructive, fontSize: 12.5, marginTop: 6 }}>
                  Not enough ETH to cover the network fee.
                </ThemedText>
              )}
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
            <ThemedText lightColor="#000000" darkColor='black' className='text-center'>Confirm & Send {amount} {selectedSymbol}</ThemedText>}
          </Pressable>
        </BottomActionBar>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}
export default SendToContact;
