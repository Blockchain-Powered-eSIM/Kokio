import React from 'react';
import { View, Pressable } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-colors';
import { useTheme } from '@/contexts/ThemeContext';
import type { Contact } from '../hooks/use-contacts';
import { ContactAvatar } from './contact-avatar';

export const SendRecipientSection = ({
  isLoading,
  contacts,
  activeContact,
  selectedContactId,
  showContactPicker,
  onToggleContactPicker,
  onSelectContact,
  onScanQr,
  recipientSource,
  addressFieldValue,
  isRecipientLocked,
  showAddressError,
  onChangeAddress,
  onClearRecipient,
  onPasteAddress,
}: {
  isLoading: boolean;
  contacts: Contact[];
  activeContact: { id: string; alias: string } | undefined;
  selectedContactId: string | undefined;
  showContactPicker: boolean;
  onToggleContactPicker: () => void;
  onSelectContact: (contactId: string) => void;
  onScanQr: () => void;
  recipientSource: 'manual' | 'contact' | 'scan';
  addressFieldValue: string;
  isRecipientLocked: boolean;
  showAddressError: boolean;
  onChangeAddress: (text: string) => void;
  onClearRecipient: () => void;
  onPasteAddress: () => void;
}) => {
  const colors = useColors();
  const { isDark } = useTheme();
  const pastedAddressTextColor = isDark ? colors.text : '#000000';

  return (
    <View className='mt-4 px-4'>
      <ThemedText bold className='mb-2 ml-1' style={{ color: isDark ? colors.mutedForeground : colors.text }}>Recipient</ThemedText>
      <Pressable
        onPress={onToggleContactPicker}
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
                onPress={() => onSelectContact(c.id)}
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
        onPress={onScanQr}
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

      <ThemedText bold className='mb-2 ml-1' style={{ color: isDark ? colors.mutedForeground : colors.text }}>Address</ThemedText>
      <View className='flex-row items-center py-3 px-3 rounded-2xl' style={{ backgroundColor: colors.surface }}>
        <TextInput
          value={addressFieldValue}
          editable={!isLoading && !isRecipientLocked}
          onChangeText={onChangeAddress}
          placeholder={recipientSource === 'contact' ? 'No address on file' : '0x...'}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize='none'
          autoCorrect={false}
          style={{ color: isRecipientLocked ? colors.mutedForeground : pastedAddressTextColor, flex: 1 }}
        />
        {isRecipientLocked ? (
          <Pressable
            onPress={onClearRecipient}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Clear recipient"
            style={{ paddingLeft: 10 }}
          >
            <ThemedText bold style={{ color: colors.primary }}>Clear</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={onPasteAddress}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Paste address from clipboard"
            style={{ paddingLeft: 10 }}
          >
            <ThemedText bold style={{ color: colors.primary }}>Paste</ThemedText>
          </Pressable>
        )}
      </View>
      {showAddressError && (
        <ThemedText style={{ color: colors.destructive }} className='ml-2 mt-1'>
          Enter a valid wallet address
        </ThemedText>
      )}
    </View>
  );
};
