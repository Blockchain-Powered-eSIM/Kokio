import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { Image, Pressable, View } from "react-native";
import React, { useState, useCallback } from "react";
import { router , useFocusEffect } from "expo-router";
import _ from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/utils/logger";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
  monogramUrl: string;
  createdAt: string | Date; // Adjust based on how it's stored
  updatedAt: string | Date; // Adjust based on how it's stored
  transactions: any[]; // Replace `any` with a more specific type if possible
}

const ContactsScreen = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const getAllContacts = async () => {
    try {
      // Get the array of contact IDs
      const contactIdsJson = await AsyncStorage.getItem("contactIds");
      const contactIds = contactIdsJson ? JSON.parse(contactIdsJson) : [];

      // Fetch all contacts using the IDs
      const contactsArray = await Promise.all(
        contactIds.map(async (contactId: string) => {
          const contactJson = await AsyncStorage.getItem(
            `contact_${contactId}`
          );
          return contactJson ? JSON.parse(contactJson) : null;
        })
      );

      // Filter out any null values and update state
      const validContacts = contactsArray?.filter(
        (contact) => contact !== null
      );
      setContacts(validContacts);
    } catch (error) {
      logger.error('CONTACTS_FETCH_FAILED', { error });
      setContacts([]); // Set empty array in case of error
    }
  };

  useFocusEffect(
    useCallback(() => {
      getAllContacts();
    }, [])
  );
  return (
    <ThemedView
      darkColor={Theme.colors.surface}
      className="mx-2 py-3   rounded-3xl mt-5 w-auto"
    >
      <ThemedView
        darkColor={Theme.colors.surface}
        className="gap-y-4 justify-start items-center gap-x-1 flex-wrap bg-slate-50 flex-row mt-7 mb-3"
      >
        {/* add contact btn  */}
        <Pressable
          onPress={() =>
            router.push("/(tabs)/(wallet)/(contacts)/addContactScreen")
          }
          className="ml-[-10] justify-center mt-[-19] mr-4 "
        >
          <View className="ml-8 h-16 items-center justify-center w-16 rounded-full" style={{ backgroundColor: Theme.colors.warning }}>
            <Image
              source={require("../../assets/images/wallet/add_contact.png")}
              className="h-[32] w-[38]"
            />
          </View>
          <ThemedText className="ml-8 mt-2">Add new</ThemedText>
        </Pressable>
        {/* other contacts  */}
        {contacts.length > 0 &&
          _.map(contacts, (contact, index) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/(wallet)/(contacts)/contactDetails",
                  params: {
                    id: contact.id,
                    monogramUrl: contact.monogramUrl,
                    transactions: contact?.transactions,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    walletAddress: contact.walletAddress,
                  },
                })
              }
              key={index}
              className=" items-center justify-between  mx-5 "
            >
              <View className="flex-col items-center">
                <Image
                  source={
                    contact.monogramUrl
                      ? { uri: contact.monogramUrl }
                      : require("../../assets/images/wallet/sampleProfileImg.png")
                  }
                  className="h-[53px] w-[53px]  "
                />
                <View className="flex-col items-start mt-3 ">
                  <ThemedText>{contact.firstName}</ThemedText>
                </View>
              </View>
              <View className="flex-col items-end "></View>
            </Pressable>
          ))}
      </ThemedView>
    </ThemedView>
  );
};

export default ContactsScreen;
