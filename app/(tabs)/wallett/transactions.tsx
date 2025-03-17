import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { 
  container, 
  listItem, 
  itemIcon, 
  transactionDetails, 
  transactionName, 
  transactionDate, 
  transactionAmount, 
} from './sharedStyles';
import { View, Image, FlatList } from 'react-native';

export const AllTransactionsScreen = (transactions: any[]) => {
  const renderTransaction = ({ item }: { item: { id: string, name: string, date: string, amount: string, image: string } }) => (
    <View style={listItem}>
      <Image source={{ uri: item.image }} style={itemIcon} />
      <View style={transactionDetails}>
        <ThemedText style={transactionName}>{item.name}</ThemedText>
        <ThemedText style={transactionDate}>{item.date}</ThemedText>
      </View>
      <ThemedText style={transactionAmount}>{item.amount}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
      />
    </ThemedView>
  );
};