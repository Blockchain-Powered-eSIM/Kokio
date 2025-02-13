import React from 'react';
import { FlatList, View, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { 
  container, 
  listItem, 
  itemIcon, 
  itemName, 
  itemBalance,
} from './sharedStyles';

export const AllTokensScreen = (tokens: any[]) => {
  const renderToken = ({ item }: { item: { icon: string, name: string, balance: string, id: string } }) => (
    <View style={listItem}>
      <Image source={{ uri: item.icon }} style={itemIcon} />
      <ThemedText style={itemName}>{item.name}</ThemedText>
      <ThemedText style={itemBalance}>{item.balance}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={container}>
      <FlatList
        data={tokens}
        renderItem={renderToken}
        keyExtractor={(item) => item.id}
      />
    </ThemedView>
  );
};