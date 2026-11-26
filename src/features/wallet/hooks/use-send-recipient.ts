import { useState } from 'react';
import { router } from 'expo-router';
import { isAddress, type Address } from 'viem';
import { useToast } from '@/contexts/ToastContext';
import { logger } from '@/lib/logger';
import { useContacts } from './use-contacts';
import { pasteAddressFromClipboard } from '../clipboard-address';
import { normalizeAddressInput } from '../address';

type SendParams = { id?: string; alias?: string; scannedAddress?: string };

/** Who a send goes to: a saved contact, a typed or pasted address, or a scanned QR code. */
export function useSendRecipient(params: SendParams) {
  const { showMessage } = useToast();
  const hasPreselectedContact = !!params.id;
  const { contacts } = useContacts();
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(params.id);
  // Starts collapsed even with a preselected contact - the collapsed row
  // already shows that contact's name, so there's nothing to reveal.
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [pastedAddress, setPastedAddress] = useState("");
  const [recipientSource, setRecipientSource] = useState<'manual' | 'contact' | 'scan'>(hasPreselectedContact ? 'contact' : 'manual');

  // A QR scan (see qr-code-screen.tsx's `returnTo: 'send'` mode) comes back as a
  // route param rather than a direct callback, since expo-router has no
  // built-in "return a value to the previous screen" mechanism. Applied
  // during render (not an effect) so it lands in the same render pass as the
  // param change, guarded against re-applying the same value on every render.
  const [appliedScannedAddress, setAppliedScannedAddress] = useState<string | undefined>(undefined);
  if (params.scannedAddress && params.scannedAddress !== appliedScannedAddress) {
    setAppliedScannedAddress(params.scannedAddress);
    setPastedAddress(params.scannedAddress);
    setSelectedContactId(undefined);
    setRecipientSource('scan');
    setShowContactPicker(false);
  }

  // Resolved from selectedContactId so a preselected contact can be switched
  // or cleared. Route params only stand in until the contacts list has loaded.
  const activeContact: { id: string; alias: string } | undefined =
    contacts.find((c) => c.id === selectedContactId) ??
    (selectedContactId !== undefined && selectedContactId === params.id
      ? { id: params.id as string, alias: params.alias ?? '' }
      : undefined);

  // Route params never carry `walletAddress` (contact-details-screen.tsx doesn't pass
  // it), so the real destination for a contact send is always resolved by id
  // from the local contacts list, never from params.
  const contactWalletAddress = activeContact
    ? contacts.find((c) => c.id === activeContact.id)?.walletAddress
    : undefined;

  const trimmedAddress = pastedAddress.trim();
  const isRawAddressMode = recipientSource !== 'contact' && trimmedAddress.length > 0;
  const isRecipientLocked = recipientSource !== 'manual';
  const addressFieldValue = recipientSource === 'contact' ? (contactWalletAddress ?? '') : pastedAddress;
  const showAddressError = isRawAddressMode && !isAddress(trimmedAddress);

  const isRecipientValid = isRawAddressMode
    ? isAddress(trimmedAddress)
    : !!activeContact && !!contactWalletAddress && isAddress(contactWalletAddress);

  // The recipient this screen currently resolves to, for the live fee
  // preview only - `handleSend` re-resolves it fresh (re-reading the contact
  // from AsyncStorage) before actually sending, so a stale preview address
  // can never affect where funds go.
  const previewRecipient: Address | undefined = isRawAddressMode
    ? (isAddress(trimmedAddress) ? (trimmedAddress as Address) : undefined)
    : (contactWalletAddress && isAddress(contactWalletAddress) ? (contactWalletAddress as Address) : undefined);

  const recipientLabel = isRawAddressMode
    ? (isAddress(trimmedAddress) ? `${trimmedAddress.slice(0, 6)}…${trimmedAddress.slice(-4)}` : '—')
    : (activeContact?.alias || '—');

  const scanQr = () => {
    router.push({ pathname: '/(tabs)/(wallet)/(contacts)/qrCodeScreen', params: { returnTo: 'send' } });
  };

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setPastedAddress('');
    setRecipientSource('contact');
    setShowContactPicker(false);
  };

  // appliedScannedAddress is deliberately left alone: resetting it would let
  // the render-time guard re-apply the same scannedAddress param and re-lock.
  const clearRecipient = () => {
    setSelectedContactId(undefined);
    setPastedAddress('');
    setRecipientSource('manual');
    setShowContactPicker(false);
  };

  const applyAddressInput = (text: string) => {
    const address = normalizeAddressInput(text);
    if (address === null) {
      showMessage("Only Base addresses can be used", "error");
      return;
    }
    setPastedAddress(address);
    setSelectedContactId(undefined);
    setRecipientSource('manual');
  };

  const pasteAddress = async () => {
    try {
      const address = await pasteAddressFromClipboard();
      if (!address) {
        showMessage("Clipboard is empty", "error");
        return;
      }
      applyAddressInput(address);
    } catch (error) {
      logger.error('CLIPBOARD_PASTE_FAILED', { error });
      showMessage("Couldn't read from clipboard", "error");
    }
  };

  return {
    contacts,
    selectedContactId,
    showContactPicker,
    toggleContactPicker: () => setShowContactPicker((v) => !v),
    recipientSource,
    activeContact,
    trimmedAddress,
    isRawAddressMode,
    isRecipientLocked,
    addressFieldValue,
    showAddressError,
    isRecipientValid,
    previewRecipient,
    recipientLabel,
    scanQr,
    selectContact,
    clearRecipient,
    applyAddressInput,
    pasteAddress,
  };
}
