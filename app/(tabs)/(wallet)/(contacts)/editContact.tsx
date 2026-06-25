import 'react-native-get-random-values';
import { View, Image, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import ColorPaletteModal from '@/components/ui/modals/colorPalleteModal';
import { Theme } from '@/constants/Colors';
import { useToast } from '@/contexts/ToastContext';

const editContact = () => {
    const { showMessage } = useToast();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    
    const [isLoading, setIsLoading] = useState(false);
    const [newColor,setNewColor] = useState("");
    const [modalVisible,setModalVisible] = useState(false);
     const navigation = useNavigation();
        const params = useLocalSearchParams();

        const handleSelectColor = (color:string)=>{
            setNewColor(color);
        }
        useEffect(() => {
            // This will capture the wallet address when returning from the QR scan
            const unsubscribe = navigation.addListener('focus', () => {
                if (params.walletAddress) {
                    setWalletAddress(params.walletAddress as string);
                }
                if (params.firstName) {
                    setFirstName(params.firstName as string);
                }
                if (params.lastName) {
                    setLastName(params.lastName as string);
                }
                if (params.monogramUrl) {
                    const match = (params.monogramUrl as string).match(/background=([0-9a-fA-F]+)/);
                    const backgroundColor = match ? match[1] : null;
                    if (backgroundColor) {
                      setNewColor(backgroundColor);
                    }
                  }
            });
            return unsubscribe;
        }, [navigation, params]);

        useEffect(()=>{
            console.log()
        },[])
    const handleScan = async () => {
        // if (!isPermissionGranted) {
        //   await requestPermission();
        //   return; 
        // }
        // if (!isPermissionGranted) {
        //   Alert.alert("Camera Permission Required", "Please grant camera permission to scan QR codes");
        // } else {
        router.push({ pathname: "/(tabs)/(wallet)/(contacts)/qrCodeScreen", params: { firstName: firstName, lastName: lastName, isEdit:"true",monogramUrl:params.monogramUrl,id:params.id } });
        // }
    };
    const handleSave = async () => {
        if (firstName === "" || walletAddress === "") {
          showMessage("Please fill in first name and address to proceed", "error");
          return;
        }
        setIsLoading(true);
        try {
          const contactId = params.id;
          // Fetch the existing contact to preserve createdAt
          const existingContactJson = await AsyncStorage.getItem(`contact_${contactId}`);
          const existingContact = existingContactJson ? JSON.parse(existingContactJson) : null;
      
          if (!existingContact) {
            throw new Error("Contact not found");
          }
      
          const url =  `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=${newColor}&color=ffffff&rounded=true&size=216`;
          const editedContactObj = {
            id: contactId,
            firstName: firstName,
            lastName: lastName,
            walletAddress: walletAddress,
            monogramUrl: url,
            createdAt: existingContact.createdAt, // Preserve original createdAt
            updatedAt: new Date(), // Update with current timestamp
            transactions: existingContact.transactions || [], // Preserve existing transactions
          };
      
          // Store updated contact
          await AsyncStorage.setItem(`contact_${contactId}`, JSON.stringify(editedContactObj));
      
          // No need to update contactIds since this is an update, not a new contact
          // (The contactId should already exist in contactIds)
          // Optional: Show success message
          showMessage("Contact updated successfully", "info");
      
          // Navigate to contactDetails with updated info
          router.replace({
            pathname: '/(tabs)/(wallet)/(contacts)/contactDetails',
            params: {
              firstName: editedContactObj.firstName,
              lastName: editedContactObj.lastName,
              monogramUrl: editedContactObj.monogramUrl,
              walletAddress:walletAddress, // Stringify array for params
              id:params.id
            },
          });
          console.log("Updated contact:", editedContactObj);
      
        // Reset form fields
        } catch (error) {
          console.log("Error updating contact:", error);
          showMessage("Failed to update contact", "error");
        } finally {
          setIsLoading(false);
          setFirstName("");
          setLastName("");
          setWalletAddress("");
        }
      };
    return (
        <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            enableOnAndroid={true}
            extraScrollHeight={20} // Adjust if needed
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                style={{ flex: 1 }}
            >
                <ThemedView darkColor='black' className='flex-1  justify-center'>
                    <View className='w-auto   items-center mt-8'>
                        <Image source={params.monogramUrl ? { uri:`https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=${newColor}&color=ffffff&rounded=true&size=128` } : require('../../../../assets/images/wallet/sampleProfileImg.png')} className='h-[216px] w-[216px]' />
                        <Pressable 
                             style={{ backgroundColor: Theme.colors.modalBackground }}
                             className='justify-center items-center absolute z-20 bottom-[-45] rounded-3xl py-3 px-5'
                             onPress={()=>setModalVisible(true)}
                        >
                            <Image source={require('../../../../assets/images/wallet/editIcon.png')} className='h-[32] w-[32]'/>
                            <ThemedText className='text-center mt-1'>Edit</ThemedText>

                        </Pressable>
                    </View>
                    <View className='flex-1 gap-y-3 mt-[65]'>
                        <ThemedView darkColor={Theme.colors.itemBackground} className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText darkColor={Theme.colors.foreground} className=' ml-6'>First Name</ThemedText>
                            <TextInput
                                value={firstName}
                                placeholder='Enter first name'
                                className='text-[15px] text-white font-LexendLight mb-2 ml-6 mt-2 '
                                placeholderTextColor="white"
                                onChangeText={(text) => setFirstName(text)}
                            />
                        </ThemedView>
                        <ThemedView darkColor={Theme.colors.itemBackground} className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText darkColor={Theme.colors.foreground} className=' ml-6'>Last Name</ThemedText>
                            <TextInput
                                value={lastName}
                                placeholder='Enter last name'
                                className='text-[15px] text-white font-LexendLight mb-2 ml-6 mt-2 '
                                placeholderTextColor="white"
                                onChangeText={(text) => setLastName(text)}
                            />
                        </ThemedView>
                        <ThemedView darkColor={Theme.colors.itemBackground} className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText darkColor={Theme.colors.foreground} className=' ml-6'>Wallet Address</ThemedText>
                            <TextInput
                                value={walletAddress}
                                placeholder='Enter wallet address or scan QR code'
                                className='text-[15px] w-[80%] text-white font-LexendLight mb-2 ml-6 mt-2 '
                                placeholderTextColor="white"
                                onChangeText={(text) => setWalletAddress(text)}
                                multiline={true}
                                numberOfLines={2}
                                textAlignVertical="top"
                            />
                            < Pressable onPress={handleScan} className='absolute right-5 bottom-5'>
                                <MaterialIcons name="qr-code-scanner" size={24} color="white" />

                            </Pressable>
                        </ThemedView>
                        <ThemedView darkColor={Theme.colors.itemBackground} className='w-auto mx-2 flex-row  py-5 rounded-3xl '>
                            <Image source={require('../../../../assets/images/wallet/trashIcon.png')} className='h-[24] w-[24] ml-6'/>
                            <ThemedText className='ml-4'  darkColor={Theme.colors.pink}>Delete Contact</ThemedText>
                        </ThemedView>

                        <ThemedView className='flex-row justify-center mt-[50]  fixed items-center  mb-5'>
                            <Pressable
                                className="border border-primaryOrange px-6 py-3 w-[48%] rounded-3xl items-center justify-center"
                                onPress={() => console.log('Button pressed!')}
                            >
                                <ThemedText className="text-primaryOrange">Cancel</ThemedText>
                            </Pressable>
                            <Pressable
                                className="bg-primaryOrange px-6 py-3 ml-2 w-[48%] rounded-3xl items-center justify-center"
                                onPress={handleSave}
                            >
                                {isLoading ? <ActivityIndicator color="white" size="small" /> : <ThemedText className="text-black">Save</ThemedText>}
                            </Pressable>

                        </ThemedView>
                    </View>

                </ThemedView>
                <ColorPaletteModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectColor={handleSelectColor}
        // You can customize the colors if needed
        // colors={['#FF0000', '#00FF00', '#0000FF', ...]}
      />
            </KeyboardAvoidingView>
        </KeyboardAwareScrollView>
    )
}

export default editContact;
