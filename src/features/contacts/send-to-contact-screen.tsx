import { Pressable, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView, Keyboard } from 'react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import BottomSheet from '@gorhom/bottom-sheet'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { BottomActionBar } from '@/components/ui/bottom-action-bar'
import { router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import { isAddress, parseUnits, formatUnits, type Address } from 'viem';
import { useToast } from '@/contexts/ToastContext'
import { useColors } from "@/hooks/use-colors";
import { type Contact } from './hooks/use-contacts';
import { TokenPickerSheet } from '@/features/wallet/components/token-picker-sheet';
import { useWalletTokens, isZeroBalance, type WalletToken } from '@/features/wallet/hooks/use-wallet-tokens';
import { useCustomTokens } from '@/features/wallet/hooks/use-custom-tokens';
import { useGasEstimate, formatFeeEth } from '@/features/wallet/hooks/use-gas-estimate';
import { useSendRecipient } from './hooks/use-send-recipient';
import { buildTransferCall } from '@/features/wallet/wallet-transfer-call';
import { useKokio } from '@/hooks/use-kokio';
import { logger } from '@/lib/logger';
import { isUserCancelledPasskeyError } from '@/lib/chain/format-on-chain-error';
import { appendWalletActivityEntry } from '@/features/wallet/wallet-activity';
import { WALLET_ACTIVITY_KEY } from '@/lib/query-keys';
import { contactKey } from '@/lib/storage/keys';
import { SendRecipientSection } from './components/send-recipient-section';
import { SendAmountSection } from './components/send-amount-section';
import { SendReview } from './components/send-review';

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

// Balances are zero-padded by the token hook; strip padding so the value
// passes the decimals check.
const normalizeAmount = (value: string) =>
  value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;

const SendToContact = () => {
  const colors = useColors();
  const { kokio } = useKokio();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; alias?: string; scannedAddress?: string }>();
  const to = useSendRecipient(params);
  const { activeContact, isRawAddressMode, trimmedAddress, isRecipientValid, previewRecipient } = to;
  const [amount, setAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("USDC");
  const tokenSheetRef = useRef<BottomSheet>(null);
  const { showMessage } = useToast();

  const { tokens: customTokens } = useCustomTokens();
  const { tokens, isLoading: isTokensLoading } = useWalletTokens(kokio.deviceWalletAddress, customTokens);
  // Only tokens whose balance actually resolved can be picked - one that
  // failed to read (amount undefined) can't be validated against a balance,
  // so offering it would let a send attempt through with no real check.
  // A zero balance is excluded too - there's nothing to send.
  const sendableTokens = tokens.filter((t) => t.amount !== undefined && !isZeroBalance(t));
  const selectedToken: WalletToken | undefined = tokens.find((t) => t.symbol === selectedSymbol);
  const isBalanceLoading = isTokensLoading;
  const balance = selectedToken?.amount;

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

  // Debounced so a gas estimate (a real bundler + paymaster round trip) isn't
  // fired on every keystroke.
  const [debouncedAmount, setDebouncedAmount] = useState(trimmedAmount);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAmount(trimmedAmount), 500);
    return () => clearTimeout(timer);
  }, [trimmedAmount]);

  const previewCall = useMemo(() => {
    if (!selectedToken || !previewRecipient) return undefined;
    // Gas cost for a plain transfer call doesn't meaningfully depend on the
    // transferred value, so a 1-unit placeholder is used whenever the amount
    // field isn't a valid positive number yet (e.g. still "0") - this keeps a
    // fee estimate available as soon as a token and recipient are chosen,
    // which Max (it has to hold gas back for an ETH send) depends on.
    const formatValid = new RegExp(`^\\d+(\\.\\d{1,${selectedToken.decimals}})?$`).test(debouncedAmount);
    const parsed = Number(debouncedAmount);
    const amountInSmallestUnit = formatValid && Number.isFinite(parsed) && parsed > 0
      ? parseUnits(debouncedAmount, selectedToken.decimals)
      : 1n;
    try {
      return buildTransferCall(selectedToken, previewRecipient, amountInSmallestUnit);
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

  // An ETH send pays its own gas out of the same balance, so "max" for ETH
  // can't just be the full balance - it needs a known, non-sponsored fee to
  // hold back first. For any other token, gas is a separate ETH cost that
  // doesn't reduce how much of THIS token can be sent.
  const isEthSelected = selectedToken?.symbol === 'ETH';
  const ethFeeReady = !isEthSelected || (!isGasEstimateLoading && !isGasEstimateError && gasEstimate !== undefined);
  const maxDisabled = isLoading || isBalanceLoading || !selectedToken || !isBalanceKnown || !ethFeeReady;

  const handleMaxPress = () => {
    if (balance === undefined) return;
    if (isEthSelected && gasEstimate && !gasEstimate.isSponsored && gasEstimate.feeWei !== undefined) {
      const balanceWei = parseUnits(balance, 18);
      const maxWei = balanceWei > gasEstimate.feeWei ? balanceWei - gasEstimate.feeWei : 0n;
      setAmount(normalizeAmount(formatUnits(maxWei, 18)));
      return;
    }
    setAmount(normalizeAmount(balance));
  };

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

  // Starting value is "0" so the field never shows blank, but a controlled
  // TextInput just appends - typing "1" on top of "0" produces the full
  // string "01", not "1". Strip a leading zero immediately followed by
  // another digit, same as a normal numeric field - "0.5" is left alone
  // since the zero there is required syntax, not a stray prefix.
  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/^0+(?=\d)/, ''));
  };

  const handleSend = async () => {
    if (isLoading) return;

    // Resolve the destination for whichever mode is active. Contact and
    // raw-address modes are mutually exclusive in UI state (see
    // use-send-recipient.ts), so exactly one of these paths supplies
    // `recipient`.
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

      const contactJson = await AsyncStorage.getItem(contactKey(activeContact.id));
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

      if (kokio.deviceUID) {
        appendWalletActivityEntry(kokio.deviceUID, {
          type: 'SENT',
          timestamp: Date.now(),
          txHash,
          amount: amountInSmallestUnit.toString(),
          decimals: selectedToken.decimals,
          symbol: selectedToken.symbol,
          counterparty: recipient,
          label: activeContact?.alias,
        })
          .then(() => queryClient.invalidateQueries({ queryKey: [WALLET_ACTIVITY_KEY, kokio.deviceUID] }))
          .catch((err) => logger.error('WALLET_ACTIVITY_LOG_FAILED', { err }));
      }

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

        await AsyncStorage.setItem(contactKey(contactForLog.id), JSON.stringify(updatedContact));

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
          <SendRecipientSection
            isLoading={isLoading}
            contacts={to.contacts}
            activeContact={activeContact}
            selectedContactId={to.selectedContactId}
            showContactPicker={to.showContactPicker}
            onToggleContactPicker={to.toggleContactPicker}
            onSelectContact={to.selectContact}
            onScanQr={to.scanQr}
            recipientSource={to.recipientSource}
            addressFieldValue={to.addressFieldValue}
            isRecipientLocked={to.isRecipientLocked}
            showAddressError={to.showAddressError}
            onChangeAddress={to.applyAddressInput}
            onClearRecipient={to.clearRecipient}
            onPasteAddress={to.pasteAddress}
          />

          <SendAmountSection
            amount={amount}
            isLoading={isLoading}
            onChangeAmount={handleAmountChange}
            onMaxPress={handleMaxPress}
            maxDisabled={maxDisabled}
            onOpenTokenPicker={() => { Keyboard.dismiss(); tokenSheetRef.current?.snapToIndex(0); }}
            selectedSymbol={selectedSymbol}
            isBalanceLoading={isBalanceLoading}
            isBalanceKnown={isBalanceKnown}
            balance={balance}
          />
        </ScrollView>

        <BottomActionBar>
          <SendReview
            recipientLabel={to.recipientLabel}
            amountLabel={`${trimmedAmount || '0'} ${selectedSymbol}`}
            networkFeeLabel={networkFeeLabel}
            showSeparateFeeNote={!!gasEstimate && !gasEstimate.isSponsored && selectedToken?.symbol !== 'ETH'}
            totalLabel={totalLabel}
            insufficientForGas={insufficientForGas}
          />
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

        <TokenPickerSheet
          ref={tokenSheetRef}
          tokens={sendableTokens}
          selectedSymbol={selectedSymbol}
          onSelect={(symbol) => { setSelectedSymbol(symbol); tokenSheetRef.current?.close(); }}
        />
      </ThemedView>
    </KeyboardAvoidingView>
  )
}
export default SendToContact;
