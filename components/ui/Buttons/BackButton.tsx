import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

const BackButton = () => {
  const router = useRouter();

  return (
    <Pressable  onPress={() => router.back()}>
      <Ionicons name="chevron-back" size={24} color="white" />
    </Pressable>
  );
};




export default BackButton;
