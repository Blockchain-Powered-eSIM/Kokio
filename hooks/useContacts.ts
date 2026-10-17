import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/utils/logger";

export interface Contact {
  id: string;
  alias: string;
  walletAddress: string;
  /** One of ContactAvatar's AVATAR_PALETTE_KEYS, assigned once at creation. Optional because contacts created before this field existed won't have it. */
  avatarColorKey?: string;
  createdAt?: string;
  updatedAt?: string;
  transactions?: any[];
}

/**
 * Which uniqueness rule a new/edited contact would violate against the
 * existing list, if any. Alias and address are compared case-insensitively
 * and trimmed, since two addresses differing only in case are the same
 * address, and "Bob"/"bob " shouldn't both be allowed either.
 */
export function findContactConflict(
  contacts: Contact[],
  { alias, walletAddress, excludeId }: { alias: string; walletAddress: string; excludeId?: string }
): 'alias' | 'address' | null {
  const normalizedAlias = alias.trim().toLowerCase();
  const normalizedAddress = walletAddress.trim().toLowerCase();
  for (const c of contacts) {
    if (c.id === excludeId) continue;
    if (c.alias.trim().toLowerCase() === normalizedAlias) return 'alias';
    if (c.walletAddress.trim().toLowerCase() === normalizedAddress) return 'address';
  }
  return null;
}

/**
 * Contacts are AsyncStorage-backed (no real backend) — a `contactIds` index
 * array plus one `contact_${id}` blob per contact. Refetches on every screen
 * focus since contacts can be added/edited from other screens in this stack.
 */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const refetch = useCallback(async () => {
    try {
      const contactIdsJson = await AsyncStorage.getItem('contactIds');
      const contactIds: string[] = contactIdsJson ? JSON.parse(contactIdsJson) : [];

      const contactsArray = await Promise.all(
        contactIds.map(async (contactId) => {
          const contactJson = await AsyncStorage.getItem(`contact_${contactId}`);
          return contactJson ? (JSON.parse(contactJson) as Contact) : null;
        })
      );

      setContacts(contactsArray.filter((c): c is Contact => c !== null));
    } catch (error) {
      logger.error('CONTACTS_FETCH_FAILED', { error });
      setContacts([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return { contacts, refetch };
}
