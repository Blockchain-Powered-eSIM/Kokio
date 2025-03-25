import 'react-native-get-random-values';
import { View, Text, Image, TextInput, Button, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';

const addContactScreen = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();
    const params = useLocalSearchParams();


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
        });

        return unsubscribe;
    }, [navigation, params]);

    const commonColors = [
        'FF5733', // Red
        '3366FF', // Blue
        '33CC33', // Green
        'FFCC00', // Yellow
        '9933FF', // Purple
        'FF9933', // Orange
        'FF66CC', // Pink
    ];

    const handleScan = async () => {

        // if (!isPermissionGranted) {
        //   await requestPermission();
        //   return; 
        // }


        // if (!isPermissionGranted) {
        //   Alert.alert("Camera Permission Required", "Please grant camera permission to scan QR codes");
        // } else {
        router.push({ pathname: "/(tabs)/(wallet)/qrCodeScreen", params: { firstName: firstName, lastName: lastName,isEdit:"false" } });
        // }
    };

    const getRandomColor = () => {
        const randomIndex = Math.floor(Math.random() * commonColors.length);
        return commonColors[randomIndex];
    }

    const handleAdd = async () => {
        if (firstName === "" || walletAddress === "") {
            Alert.alert("Please fill the first Name and Address to Proceed")
            return;
        }

        setIsLoading(true);
        try {
            const randomColor = getRandomColor();
            const url = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=${randomColor}&color=ffffff&rounded=true&size=216`

            // Use UUID for a unique identifier
            const contactId = uuidv4();

            const contactObj = {
                id: contactId,
                firstName: firstName,
                lastName: lastName,
                walletAddress: walletAddress,
                monogramUrl: url,
                createdAt: new Date(),
                updatedAt: new Date(),
                transactions:[]
            }

            // // Store individual contact
            await AsyncStorage.setItem(`contact_${contactId}`, JSON.stringify(contactObj));

            // Maintain an index of all contact IDs
            const existingIds = await AsyncStorage.getItem('contactIds');
            const contactIds = existingIds ? JSON.parse(existingIds) : [];
            contactIds.push(contactId);
            await AsyncStorage.setItem('contactIds', JSON.stringify(contactIds));

            // Optional: Show success message
            Alert.alert("Success", "Contact added successfully");
            router.replace({pathname:'/(tabs)/(wallet)/contactDetails', params:{firstName:contactObj.firstName,lastName:contactObj.lastName,monogramUrl:contactObj.monogramUrl,transactions:contactObj.transactions,walletAddress:walletAddress}})
            console.log(contactObj);
            

        } catch (error) {
            console.log("Error saving contact:", error);
            Alert.alert("Error", "Failed to add contact");
        } finally {
            setIsLoading(false);
            setFirstName("");
            setLastName("");
            setWalletAddress("");
        }
    }
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
                        <Image source={require('../../../../assets/images/wallet/sampleProfileImg.png')} className='h-[216px] w-[216px]' />

                    </View>
                    <View className='flex-1 gap-y-3 mt-[50]'>
                        <ThemedView darkColor='#1c1c1e' className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText darkColor='#AEAEB2' className=' ml-6'>First Name</ThemedText>
                            <TextInput
                                value={firstName}
                                placeholder='Enter first name'
                                className='text-[15px] text-white font-LexendLight mb-2 ml-6 mt-2 '
                                placeholderTextColor="white"
                                onChangeText={(text) => setFirstName(text)}
                            />
                        </ThemedView>
                        <ThemedView darkColor='#1c1c1e' className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText darkColor='#AEAEB2' className=' ml-6'>Last Name</ThemedText>
                            <TextInput
                                value={lastName}
                                placeholder='Enter last name'
                                className='text-[15px] text-white font-LexendLight mb-2 ml-6 mt-2 '
                                placeholderTextColor="white"
                                onChangeText={(text) => setLastName(text)}
                            />
                        </ThemedView>
                        <ThemedView darkColor='#1c1c1e' className='w-auto mx-2  py-3 rounded-3xl '>
                            <ThemedText darkColor='#AEAEB2' className=' ml-6'>Wallet Address</ThemedText>
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

                        <ThemedView className='flex-row justify-center mt-[140]  fixed items-center mb-5'>
                            <Pressable
                                className="border border-primaryOrange px-6 py-3 w-[48%] rounded-3xl items-center justify-center"
                                onPress={() => console.log('Button pressed!')}
                            >
                                <ThemedText className="text-primaryOrange">Cancel</ThemedText>
                            </Pressable>
                            <Pressable
                                className="bg-primaryOrange px-6 py-3 ml-2 w-[48%] rounded-3xl items-center justify-center"
                                onPress={handleAdd}
                            >
                                {isLoading ? <ActivityIndicator color="white" size="small" /> : <ThemedText className="text-black">Add</ThemedText>}
                            </Pressable>

                        </ThemedView>
                    </View>

                </ThemedView>
            </KeyboardAvoidingView>
        </KeyboardAwareScrollView>
    )
}

export default addContactScreen;