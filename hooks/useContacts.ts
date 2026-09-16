import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/utils/logger";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
  monogramUrl: string;
  createdAt?: string;
  updatedAt?: string;
  transactions?: any[];
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
